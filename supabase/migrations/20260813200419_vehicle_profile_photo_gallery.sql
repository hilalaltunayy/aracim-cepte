-- TASK-030: vehicle profile-photo metadata reuses TASK-022 private attachment objects.
-- The client can only read its own metadata. Every write is owner-scoped and RPC-mediated.

create table public.vehicle_photos (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  attachment_id uuid not null unique references public.attachments(id) on delete cascade,
  is_primary boolean not null default false,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create index vehicle_photos_owner_vehicle_order_idx
  on public.vehicle_photos(owner_id, vehicle_id, is_primary desc, sort_order, created_at, id);
create unique index vehicle_photos_one_primary_per_vehicle_idx
  on public.vehicle_photos(vehicle_id) where is_primary;

alter table public.vehicle_photos enable row level security;
revoke all on table public.vehicle_photos from public, anon, authenticated;
grant select on table public.vehicle_photos to authenticated;
grant select, insert, update, delete on table public.vehicle_photos to service_role;

create policy vehicle_photos_select_own
on public.vehicle_photos for select to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);

alter table public.attachment_upload_reservations
  add column replaced_photo_id uuid references public.vehicle_photos(id) on delete set null;

alter table public.attachment_upload_reservations
  drop constraint attachment_upload_reservations_linked_entity_type_check,
  add constraint attachment_upload_reservations_linked_entity_type_check check (
    linked_entity_type is null
    or linked_entity_type in ('vehicle_document', 'expertise_report', 'maintenance_record', 'vehicle_photo')
  );

create index attachment_reservations_vehicle_photo_idx
  on public.attachment_upload_reservations(owner_id, vehicle_id, parent_type, status)
  where parent_type = 'vehicle_photo';

create or replace function private.max_vehicle_photos_for_user(p_user_id uuid)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select case private.effective_plan_for_user(p_user_id)
    when 'premium' then 5
    else 1
  end;
$$;

revoke all on function private.max_vehicle_photos_for_user(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.reserve_vehicle_photo_upload(
  p_owner_id uuid,
  p_vehicle_id uuid,
  p_photo_id uuid,
  p_source text,
  p_original_filename text,
  p_size_bytes bigint,
  p_mime_type text,
  p_request_id uuid,
  p_replaced_photo_id uuid default null
)
returns table(
  reservation_id uuid,
  attachment_id uuid,
  object_path text,
  reservation_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actual_count bigint;
  v_actual_bytes bigint;
  v_pending_count bigint;
  v_pending_bytes bigint;
  v_photo_count bigint;
  v_pending_photo_count bigint;
  v_existing public.attachment_upload_reservations%rowtype;
  v_reservation_id uuid := pg_catalog.gen_random_uuid();
  v_attachment_id uuid := pg_catalog.gen_random_uuid();
  v_limit integer;
  v_extension text;
  v_object_path text;
  v_original_filename text := pg_catalog.btrim(p_original_filename);
begin
  if p_owner_id is null or p_vehicle_id is null or p_photo_id is null or p_request_id is null then
    raise exception 'ATTACHMENT_OWNER_REQUIRED';
  end if;
  if p_source not in ('camera', 'gallery') then
    raise exception 'VEHICLE_PHOTO_SOURCE_INVALID';
  end if;
  if p_mime_type not in ('image/jpeg', 'image/png') then
    raise exception 'ATTACHMENT_TYPE_NOT_ALLOWED';
  end if;
  if pg_catalog.char_length(v_original_filename) not between 1 and 120
    or v_original_filename like '%/%'
    or pg_catalog.strpos(v_original_filename, pg_catalog.chr(92)) > 0 then
    raise exception 'ATTACHMENT_FILENAME_INVALID';
  end if;
  if p_size_bytes is null or p_size_bytes < 1 or p_size_bytes > 5242880 then
    raise exception 'ATTACHMENT_FILE_TOO_LARGE';
  end if;
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = p_owner_id
  ) then
    raise exception 'ATTACHMENT_VEHICLE_FORBIDDEN';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text, 0));
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text || ':' || p_vehicle_id::text, 1)
  );

  select * into v_existing
  from public.attachment_upload_reservations r
  where r.owner_id = p_owner_id and r.request_id = p_request_id
  for update;

  if found and (
    v_existing.vehicle_id <> p_vehicle_id
    or v_existing.expected_size <> p_size_bytes
    or v_existing.expected_mime <> p_mime_type
    or v_existing.parent_type is distinct from 'vehicle_photo'
    or v_existing.parent_id is distinct from p_photo_id
    or v_existing.attachment_source is distinct from p_source
    or v_existing.original_filename is distinct from v_original_filename
    or v_existing.replaced_photo_id is distinct from p_replaced_photo_id
  ) then
    raise exception 'IDEMPOTENCY_KEY_REUSED';
  end if;
  if found and (
    v_existing.status in ('uploaded', 'completed')
    or (v_existing.status = 'reserved' and v_existing.expires_at > pg_catalog.clock_timestamp())
  ) then
    return query
      select v_existing.id, v_existing.attachment_id, v_existing.object_path, v_existing.status;
    return;
  end if;

  if exists (
    select 1 from public.vehicle_photos p
    where p.id = p_photo_id and p.owner_id <> p_owner_id
  ) or exists (
    select 1 from public.vehicle_photos p
    where p.id = p_photo_id and p.owner_id = p_owner_id and p.vehicle_id <> p_vehicle_id
  ) then
    raise exception 'VEHICLE_PHOTO_ID_CONFLICT';
  end if;
  if exists (select 1 from public.vehicle_photos p where p.id = p_photo_id) then
    raise exception 'VEHICLE_PHOTO_ID_CONFLICT';
  end if;
  if p_replaced_photo_id is not null and not exists (
    select 1 from public.vehicle_photos p
    where p.id = p_replaced_photo_id and p.owner_id = p_owner_id and p.vehicle_id = p_vehicle_id
  ) then
    raise exception 'VEHICLE_PHOTO_REPLACEMENT_NOT_FOUND';
  end if;

  update public.attachment_upload_reservations r
  set status = 'failed', failed_at = pg_catalog.clock_timestamp(),
      failure_code = 'RESERVATION_EXPIRED', updated_at = pg_catalog.clock_timestamp()
  where r.owner_id = p_owner_id and r.status = 'reserved'
    and r.expires_at <= pg_catalog.clock_timestamp()
    and not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'vehicle-attachments' and o.name = r.object_path
    );

  select count(*), coalesce(sum(
    case when o.metadata->>'size' ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else 0 end
  ), 0)
  into v_actual_count, v_actual_bytes
  from storage.objects o
  where o.bucket_id = 'vehicle-attachments'
    and (storage.foldername(o.name))[1] = p_owner_id::text;

  select count(*), coalesce(sum(r.expected_size), 0)
  into v_pending_count, v_pending_bytes
  from public.attachment_upload_reservations r
  where r.owner_id = p_owner_id and r.status = 'reserved'
    and r.expires_at > pg_catalog.clock_timestamp()
    and not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'vehicle-attachments' and o.name = r.object_path
    );

  if v_actual_count + v_pending_count >= 10 then
    raise exception 'ATTACHMENT_COUNT_QUOTA_EXCEEDED';
  end if;
  if v_actual_bytes + v_pending_bytes + p_size_bytes > 26214400 then
    raise exception 'ATTACHMENT_BYTES_QUOTA_EXCEEDED';
  end if;

  select count(*) into v_photo_count
  from public.vehicle_photos p
  where p.owner_id = p_owner_id and p.vehicle_id = p_vehicle_id;
  select count(distinct r.parent_id) into v_pending_photo_count
  from public.attachment_upload_reservations r
  where r.owner_id = p_owner_id and r.vehicle_id = p_vehicle_id
    and r.parent_type = 'vehicle_photo'
    and r.status in ('reserved', 'uploaded')
    and r.request_id <> p_request_id;

  if p_replaced_photo_id is null then
    v_limit := private.max_vehicle_photos_for_user(p_owner_id);
    if v_photo_count + v_pending_photo_count >= v_limit then
      raise exception 'VEHICLE_PHOTO_LIMIT_REACHED' using errcode = 'P0001';
    end if;
  elsif v_pending_photo_count > 0 then
    -- A replacement does not increase the persistent count, but serialize it to avoid two pending swaps.
    raise exception 'VEHICLE_PHOTO_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  v_extension := case p_mime_type when 'image/png' then 'png' else 'jpg' end;
  v_object_path := p_owner_id::text || '/' || p_vehicle_id::text ||
    '/vehicle_photo/' || p_photo_id::text || '/' || v_attachment_id::text || '.' || v_extension;

  if v_existing.id is null then
    insert into public.attachment_upload_reservations (
      id, owner_id, vehicle_id, object_path, expected_size, expected_mime,
      expires_at, request_id, status, updated_at, attachment_id,
      parent_type, parent_id, attachment_source, original_filename, replaced_photo_id
    ) values (
      v_reservation_id, p_owner_id, p_vehicle_id, v_object_path, p_size_bytes, p_mime_type,
      pg_catalog.clock_timestamp() + interval '5 minutes', p_request_id, 'reserved',
      pg_catalog.clock_timestamp(), v_attachment_id, 'vehicle_photo', p_photo_id, p_source,
      v_original_filename, p_replaced_photo_id
    );
  else
    update public.attachment_upload_reservations
    set object_path = v_object_path, expires_at = pg_catalog.clock_timestamp() + interval '5 minutes',
        status = 'reserved', uploaded_at = null, completed_at = null, failed_at = null,
        failure_code = null, linked_entity_type = null, linked_entity_id = null,
        attachment_id = v_attachment_id, parent_type = 'vehicle_photo', parent_id = p_photo_id,
        attachment_source = p_source, original_filename = v_original_filename,
        replaced_photo_id = p_replaced_photo_id, updated_at = pg_catalog.clock_timestamp()
    where id = v_existing.id
    returning id into v_reservation_id;
  end if;

  return query select v_reservation_id, v_attachment_id, v_object_path, 'reserved'::text;
end;
$$;

revoke all on function public.reserve_vehicle_photo_upload(uuid, uuid, uuid, text, text, bigint, text, uuid, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.reserve_vehicle_photo_upload(uuid, uuid, uuid, text, text, bigint, text, uuid, uuid)
to service_role;

create or replace function private.ensure_vehicle_photo_primary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next_id uuid;
begin
  if old.is_primary and exists (select 1 from public.vehicles v where v.id = old.vehicle_id) then
    select p.id into v_next_id
    from public.vehicle_photos p
    where p.vehicle_id = old.vehicle_id
    order by p.sort_order, p.created_at, p.id
    limit 1;
    if v_next_id is not null then
      update public.vehicle_photos set is_primary = true, updated_at = pg_catalog.clock_timestamp()
      where id = v_next_id;
    end if;
  end if;
  return old;
end;
$$;

revoke all on function private.ensure_vehicle_photo_primary()
from public, anon, authenticated, service_role;

create trigger vehicle_photos_primary_fallback_after_delete
after delete on public.vehicle_photos
for each row execute function private.ensure_vehicle_photo_primary();

create or replace function public.save_vehicle_photo(
  p_vehicle_id uuid,
  p_photo_id uuid,
  p_attachment_path text
)
returns public.vehicle_photos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_operation public.attachment_upload_reservations%rowtype;
  v_existing public.vehicle_photos%rowtype;
  v_replaced public.vehicle_photos%rowtype;
  v_photo public.vehicle_photos%rowtype;
  v_limit integer;
  v_sort_order integer;
  v_is_primary boolean;
  v_replaced_path text;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_vehicle_id is null or p_photo_id is null or p_attachment_path is null then
    raise exception 'VEHICLE_PHOTO_REQUEST_REQUIRED';
  end if;
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = v_owner_id
  ) then raise exception 'ATTACHMENT_VEHICLE_FORBIDDEN'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_owner_id::text, 0));
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner_id::text || ':' || p_vehicle_id::text, 1)
  );

  select * into v_existing from public.vehicle_photos p where p.id = p_photo_id for update;
  if found then
    if v_existing.owner_id <> v_owner_id or v_existing.vehicle_id <> p_vehicle_id then
      raise exception 'VEHICLE_PHOTO_NOT_FOUND';
    end if;
    if not exists (
      select 1 from public.attachments a
      where a.id = v_existing.attachment_id and a.storage_path = p_attachment_path
    ) then raise exception 'ATTACHMENT_REFERENCE_INVALID'; end if;
    return v_existing;
  end if;

  select * into v_operation
  from public.attachment_upload_reservations r
  where r.owner_id = v_owner_id and r.vehicle_id = p_vehicle_id
    and r.parent_type = 'vehicle_photo' and r.parent_id = p_photo_id
    and r.object_path = p_attachment_path and r.status in ('uploaded', 'completed')
  for update;
  if not found or v_operation.attachment_id is null then
    raise exception 'ATTACHMENT_REFERENCE_INVALID';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'vehicle-attachments' and o.name = p_attachment_path
  ) then raise exception 'ATTACHMENT_REFERENCE_INVALID'; end if;

  if v_operation.replaced_photo_id is not null then
    select * into v_replaced from public.vehicle_photos p
    where p.id = v_operation.replaced_photo_id
      and p.owner_id = v_owner_id and p.vehicle_id = p_vehicle_id
    for update;
    if not found then raise exception 'VEHICLE_PHOTO_REPLACEMENT_NOT_FOUND'; end if;
    select a.storage_path into v_replaced_path
    from public.attachments a where a.id = v_replaced.attachment_id;
    v_sort_order := v_replaced.sort_order;
    v_is_primary := v_replaced.is_primary;
  else
    v_limit := private.max_vehicle_photos_for_user(v_owner_id);
    if (
      select count(*) from public.vehicle_photos p
      where p.owner_id = v_owner_id and p.vehicle_id = p_vehicle_id
    ) >= v_limit then
      raise exception 'VEHICLE_PHOTO_LIMIT_REACHED' using errcode = 'P0001';
    end if;
    select coalesce(max(p.sort_order), -1) + 1 into v_sort_order
    from public.vehicle_photos p where p.vehicle_id = p_vehicle_id;
    v_is_primary := not exists (
      select 1 from public.vehicle_photos p where p.vehicle_id = p_vehicle_id and p.is_primary
    );
  end if;

  insert into public.attachments (
    id, owner_id, vehicle_id, parent_type, parent_id, source,
    original_filename, storage_path, mime_type, size_bytes
  ) values (
    v_operation.attachment_id, v_owner_id, p_vehicle_id, 'vehicle_photo', p_photo_id,
    v_operation.attachment_source, v_operation.original_filename, v_operation.object_path,
    v_operation.expected_mime, v_operation.expected_size
  ) on conflict (storage_path) do nothing;

  insert into public.vehicle_photos (
    id, owner_id, vehicle_id, attachment_id, is_primary, sort_order
  ) values (
    p_photo_id, v_owner_id, p_vehicle_id, v_operation.attachment_id, false, v_sort_order
  ) returning * into v_photo;

  if v_is_primary then
    if v_operation.replaced_photo_id is not null then
      update public.vehicle_photos set is_primary = false, updated_at = pg_catalog.clock_timestamp()
      where id = v_replaced.id;
    end if;
    update public.vehicle_photos set is_primary = true, updated_at = pg_catalog.clock_timestamp()
    where id = v_photo.id returning * into v_photo;
  end if;

  if v_operation.replaced_photo_id is not null then
    delete from public.vehicle_photos where id = v_replaced.id;
    delete from public.attachments where id = v_replaced.attachment_id;
    perform private.queue_attachment_cleanup(v_owner_id, v_replaced_path);
  end if;

  update public.attachment_upload_reservations
  set status = 'completed', completed_at = coalesce(completed_at, pg_catalog.clock_timestamp()),
      linked_entity_type = 'vehicle_photo', linked_entity_id = p_photo_id,
      updated_at = pg_catalog.clock_timestamp()
  where id = v_operation.id and owner_id = v_owner_id;

  return v_photo;
end;
$$;

revoke all on function public.save_vehicle_photo(uuid, uuid, text)
from public, anon, authenticated, service_role;
grant execute on function public.save_vehicle_photo(uuid, uuid, text) to authenticated;

create or replace function public.set_vehicle_photo_primary(p_photo_id uuid)
returns public.vehicle_photos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_photo public.vehicle_photos%rowtype;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_photo from public.vehicle_photos p
  where p.id = p_photo_id and p.owner_id = v_owner_id for update;
  if not found then raise exception 'VEHICLE_PHOTO_NOT_FOUND'; end if;
  if not exists (
    select 1 from public.vehicles v where v.id = v_photo.vehicle_id and v.owner_id = v_owner_id
  ) then raise exception 'VEHICLE_PHOTO_NOT_FOUND'; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner_id::text || ':' || v_photo.vehicle_id::text, 1)
  );
  update public.vehicle_photos set is_primary = false, updated_at = pg_catalog.clock_timestamp()
  where owner_id = v_owner_id and vehicle_id = v_photo.vehicle_id and is_primary;
  update public.vehicle_photos set is_primary = true, updated_at = pg_catalog.clock_timestamp()
  where id = v_photo.id returning * into v_photo;
  return v_photo;
end;
$$;

revoke all on function public.set_vehicle_photo_primary(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.set_vehicle_photo_primary(uuid) to authenticated;

create or replace function public.delete_vehicle_photo(p_photo_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_photo public.vehicle_photos%rowtype;
  v_next public.vehicle_photos%rowtype;
  v_path text;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_photo from public.vehicle_photos p
  where p.id = p_photo_id and p.owner_id = v_owner_id for update;
  if not found then return false; end if;
  if not exists (
    select 1 from public.vehicles v where v.id = v_photo.vehicle_id and v.owner_id = v_owner_id
  ) then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner_id::text || ':' || v_photo.vehicle_id::text, 1)
  );
  select a.storage_path into v_path from public.attachments a where a.id = v_photo.attachment_id;
  if v_photo.is_primary then
    select * into v_next from public.vehicle_photos p
    where p.owner_id = v_owner_id and p.vehicle_id = v_photo.vehicle_id and p.id <> v_photo.id
    order by p.sort_order, p.created_at, p.id limit 1 for update;
    update public.vehicle_photos set is_primary = false, updated_at = pg_catalog.clock_timestamp()
    where id = v_photo.id;
    if found then
      update public.vehicle_photos set is_primary = true, updated_at = pg_catalog.clock_timestamp()
      where id = v_next.id;
    end if;
  end if;
  delete from public.vehicle_photos where id = v_photo.id;
  delete from public.attachments where id = v_photo.attachment_id;
  perform private.queue_attachment_cleanup(v_owner_id, v_path);
  return true;
end;
$$;

revoke all on function public.delete_vehicle_photo(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.delete_vehicle_photo(uuid) to authenticated;

-- Vehicle deletion already queues legacy and reserved paths. Include normalized attachment metadata
-- so vehicle-photo objects (and other unified attachments) cannot be left orphaned.
create or replace function public.delete_vehicle_consistent(p_vehicle_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_path record;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = v_owner_id
    for update
  ) then return false; end if;

  for v_path in
    select d.attachment_path as object_path
    from public.vehicle_documents d
    where d.owner_id = v_owner_id and d.vehicle_id = p_vehicle_id and d.attachment_path is not null
    union
    select e.attachment_path
    from public.expertise_reports e
    where e.owner_id = v_owner_id and e.vehicle_id = p_vehicle_id and e.attachment_path is not null
    union
    select a.storage_path
    from public.attachments a
    where a.owner_id = v_owner_id and a.vehicle_id = p_vehicle_id
    union
    select r.object_path
    from public.attachment_upload_reservations r
    where r.owner_id = v_owner_id and r.vehicle_id = p_vehicle_id
      and exists (
        select 1 from storage.objects o
        where o.bucket_id = 'vehicle-attachments' and o.name = r.object_path
      )
  loop
    perform private.queue_attachment_cleanup(v_owner_id, v_path.object_path);
  end loop;

  delete from public.vehicles where id = p_vehicle_id and owner_id = v_owner_id;
  return found;
end;
$$;

revoke all on function public.delete_vehicle_consistent(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.delete_vehicle_consistent(uuid) to authenticated;

comment on table public.vehicle_photos is
  'Owner-scoped vehicle profile/gallery ordering metadata; binary files remain in private Storage through attachments.';
comment on function private.max_vehicle_photos_for_user(uuid) is
  'Private server-side Free/Premium vehicle photo capacity resolver. Client entitlement snapshots are not authoritative.';
comment on function public.reserve_vehicle_photo_upload(uuid, uuid, uuid, text, text, bigint, text, uuid, uuid) is
  'Service-role-only, owner-verified, idempotent private vehicle-photo upload reservation with global Storage and plan-count enforcement.';
comment on function public.save_vehicle_photo(uuid, uuid, text) is
  'Authenticated owner-only atomic photo metadata completion; replacement retains the existing photo until the new upload is valid.';
