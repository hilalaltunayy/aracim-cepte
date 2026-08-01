update storage.buckets
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
where id = 'vehicle-attachments';

create table public.attachment_upload_reservations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  object_path text not null unique,
  expected_size bigint not null check (expected_size between 1 and 5242880),
  expected_mime text not null check (
    expected_mime in ('application/pdf', 'image/jpeg', 'image/png')
  ),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index attachment_reservations_owner_expiry_idx
on public.attachment_upload_reservations(owner_id, expires_at);

alter table public.attachment_upload_reservations enable row level security;

revoke all on table public.attachment_upload_reservations from public, anon, authenticated;
grant select, insert, update, delete on table public.attachment_upload_reservations to service_role;

create or replace function public.reserve_attachment_upload(
  p_owner_id uuid,
  p_vehicle_id uuid,
  p_size_bytes bigint,
  p_mime_type text
)
returns table(reservation_id uuid, object_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actual_count bigint;
  v_actual_bytes bigint;
  v_pending_count bigint;
  v_pending_bytes bigint;
  v_reservation_id uuid := pg_catalog.gen_random_uuid();
  v_object_id uuid := pg_catalog.gen_random_uuid();
  v_extension text;
  v_object_path text;
begin
  if p_owner_id is null or p_vehicle_id is null then
    raise exception 'ATTACHMENT_OWNER_REQUIRED';
  end if;

  if p_size_bytes is null or p_size_bytes < 1 or p_size_bytes > 5242880 then
    raise exception 'ATTACHMENT_FILE_TOO_LARGE';
  end if;

  if p_mime_type not in ('application/pdf', 'image/jpeg', 'image/png') then
    raise exception 'ATTACHMENT_TYPE_NOT_ALLOWED';
  end if;

  if not exists (
    select 1
    from public.vehicles v
    where v.id = p_vehicle_id
      and v.owner_id = p_owner_id
  ) then
    raise exception 'ATTACHMENT_VEHICLE_FORBIDDEN';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text, 0)
  );

  delete from public.attachment_upload_reservations r
  where r.owner_id = p_owner_id
    and r.expires_at <= pg_catalog.clock_timestamp();

  select
    count(*),
    coalesce(sum(
      case
        when o.metadata->>'size' ~ '^[0-9]+$' then (o.metadata->>'size')::bigint
        else 0
      end
    ), 0)
  into v_actual_count, v_actual_bytes
  from storage.objects o
  where o.bucket_id = 'vehicle-attachments'
    and (storage.foldername(o.name))[1] = p_owner_id::text;

  select count(*), coalesce(sum(r.expected_size), 0)
  into v_pending_count, v_pending_bytes
  from public.attachment_upload_reservations r
  where r.owner_id = p_owner_id
    and r.expires_at > pg_catalog.clock_timestamp()
    and not exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'vehicle-attachments'
        and o.name = r.object_path
    );

  if v_actual_count + v_pending_count >= 10 then
    raise exception 'ATTACHMENT_COUNT_QUOTA_EXCEEDED';
  end if;

  if v_actual_bytes + v_pending_bytes + p_size_bytes > 26214400 then
    raise exception 'ATTACHMENT_BYTES_QUOTA_EXCEEDED';
  end if;

  v_extension := case p_mime_type
    when 'application/pdf' then 'pdf'
    when 'image/png' then 'png'
    else 'jpg'
  end;
  v_object_path := p_owner_id::text || '/' || p_vehicle_id::text || '/' ||
    v_object_id::text || '.' || v_extension;

  insert into public.attachment_upload_reservations (
    id,
    owner_id,
    vehicle_id,
    object_path,
    expected_size,
    expected_mime,
    expires_at
  )
  values (
    v_reservation_id,
    p_owner_id,
    p_vehicle_id,
    v_object_path,
    p_size_bytes,
    p_mime_type,
    pg_catalog.clock_timestamp() + interval '5 minutes'
  );

  return query select v_reservation_id, v_object_path;
end;
$$;

revoke execute on function public.reserve_attachment_upload(uuid, uuid, bigint, text)
from public, anon, authenticated;
grant execute on function public.reserve_attachment_upload(uuid, uuid, bigint, text)
to service_role;

create or replace function public.is_valid_attachment_reservation(
  p_object_path text,
  p_metadata jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_size bigint;
  v_mime text;
begin
  if v_owner_id is null or p_metadata is null then
    return false;
  end if;

  begin
    v_size := (p_metadata->>'size')::bigint;
  exception when invalid_text_representation or numeric_value_out_of_range then
    return false;
  end;

  v_mime := pg_catalog.lower(pg_catalog.coalesce(p_metadata->>'mimetype', ''));

  return exists (
    select 1
    from public.attachment_upload_reservations r
    where r.owner_id = v_owner_id
      and r.object_path = p_object_path
      and r.expected_size = v_size
      and r.expected_mime = v_mime
      and r.expires_at > pg_catalog.clock_timestamp()
  );
end;
$$;

revoke execute on function public.is_valid_attachment_reservation(text, jsonb)
from public, anon;
grant execute on function public.is_valid_attachment_reservation(text, jsonb)
to authenticated;

drop policy if exists attachments_insert_own on storage.objects;
drop policy if exists attachments_update_own on storage.objects;

create policy attachments_insert_reserved
on storage.objects for insert to authenticated
with check (
  bucket_id = 'vehicle-attachments'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_valid_attachment_reservation(name, metadata)
);

comment on table public.attachment_upload_reservations is
  'Short-lived server-created reservations used to enforce attachment count and byte quotas.';

comment on function public.reserve_attachment_upload(uuid, uuid, bigint, text) is
  'Service-role-only atomic quota reservation. The mobile client cannot call this function.';

comment on function public.is_valid_attachment_reservation(text, jsonb) is
  'RLS helper that permits authenticated Storage inserts only for a matching server reservation.';
