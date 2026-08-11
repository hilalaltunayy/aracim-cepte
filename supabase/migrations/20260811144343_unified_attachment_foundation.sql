-- TASK-022: reusable attachment metadata and one source-independent parent pool.

create table public.attachments (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  parent_type text not null check (
    parent_type in ('expertise_report', 'vehicle_document', 'maintenance_record', 'vehicle_photo')
  ),
  parent_id uuid not null,
  source text not null check (source in ('camera', 'gallery', 'document')),
  original_filename text not null check (
    pg_catalog.char_length(pg_catalog.btrim(original_filename)) between 1 and 120
    and original_filename not like '%/%'
    and pg_catalog.strpos(original_filename, pg_catalog.chr(92)) = 0
  ),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes bigint not null check (size_bytes between 1 and 5242880),
  created_at timestamptz not null default now()
);

create index attachments_owner_vehicle_idx on public.attachments(owner_id, vehicle_id);
create index attachments_parent_idx on public.attachments(owner_id, parent_type, parent_id, created_at);

alter table public.attachments enable row level security;
revoke all on table public.attachments from public, anon, authenticated;
grant select on table public.attachments to authenticated;
grant select, insert, update, delete on table public.attachments to service_role;

create policy attachments_metadata_select_own
on public.attachments for select to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.owner_id = (select auth.uid())
  )
);

alter table public.attachment_upload_reservations
  add column attachment_id uuid,
  add column parent_type text,
  add column parent_id uuid,
  add column attachment_source text,
  add column original_filename text;

alter table public.attachment_upload_reservations
  add constraint attachment_reservations_parent_type_check check (
    parent_type is null
    or parent_type in ('expertise_report', 'vehicle_document', 'maintenance_record', 'vehicle_photo')
  ),
  add constraint attachment_reservations_source_check check (
    attachment_source is null or attachment_source in ('camera', 'gallery', 'document')
  );

create index attachment_reservations_parent_idx
on public.attachment_upload_reservations(owner_id, parent_type, parent_id, status);

create or replace function public.reserve_attachment_upload_for_parent(
  p_owner_id uuid,
  p_vehicle_id uuid,
  p_parent_type text,
  p_parent_id uuid,
  p_source text,
  p_original_filename text,
  p_size_bytes bigint,
  p_mime_type text,
  p_request_id uuid
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
  v_entity_count bigint;
  v_entity_bytes bigint;
  v_entity_pending_count bigint;
  v_entity_pending_bytes bigint;
  v_existing public.attachment_upload_reservations%rowtype;
  v_reservation_id uuid := pg_catalog.gen_random_uuid();
  v_attachment_id uuid := pg_catalog.gen_random_uuid();
  v_extension text;
  v_object_path text;
  v_original_filename text := pg_catalog.btrim(p_original_filename);
begin
  if p_owner_id is null or p_vehicle_id is null or p_parent_id is null or p_request_id is null then
    raise exception 'ATTACHMENT_OWNER_REQUIRED';
  end if;
  if p_parent_type <> 'expertise_report' then
    raise exception 'ATTACHMENT_PARENT_TYPE_NOT_SUPPORTED';
  end if;
  if p_source not in ('camera', 'gallery', 'document') then
    raise exception 'ATTACHMENT_SOURCE_INVALID';
  end if;
  if pg_catalog.char_length(v_original_filename) not between 1 and 120
    or v_original_filename like '%/%'
    or pg_catalog.strpos(v_original_filename, pg_catalog.chr(92)) > 0 then
    raise exception 'ATTACHMENT_FILENAME_INVALID';
  end if;
  if p_size_bytes is null or p_size_bytes < 1 or p_size_bytes > 5242880 then
    raise exception 'ATTACHMENT_FILE_TOO_LARGE';
  end if;
  if p_mime_type not in ('application/pdf', 'image/jpeg', 'image/png') then
    raise exception 'ATTACHMENT_TYPE_NOT_ALLOWED';
  end if;
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = p_owner_id
  ) then
    raise exception 'ATTACHMENT_VEHICLE_FORBIDDEN';
  end if;
  if exists (
    select 1 from public.expertise_reports e
    where e.id = p_parent_id
      and (e.owner_id <> p_owner_id or e.vehicle_id <> p_vehicle_id)
  ) then
    raise exception 'ATTACHMENT_PARENT_FORBIDDEN';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text, 0));
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text || ':' || p_parent_id::text, 1)
  );

  select * into v_existing
  from public.attachment_upload_reservations r
  where r.owner_id = p_owner_id and r.request_id = p_request_id
  for update;

  if found and (
    v_existing.vehicle_id <> p_vehicle_id
    or v_existing.expected_size <> p_size_bytes
    or v_existing.expected_mime <> p_mime_type
    or v_existing.parent_type is distinct from p_parent_type
    or v_existing.parent_id is distinct from p_parent_id
    or v_existing.attachment_source is distinct from p_source
    or v_existing.original_filename is distinct from v_original_filename
  ) then
    raise exception 'IDEMPOTENCY_KEY_REUSED';
  end if;
  if found and (
    v_existing.status in ('uploaded', 'completed')
    or (v_existing.status = 'reserved' and v_existing.expires_at > pg_catalog.clock_timestamp())
  ) then
    return query select v_existing.id, v_existing.attachment_id, v_existing.object_path, v_existing.status;
    return;
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

  select count(*), coalesce(sum(a.size_bytes), 0)
  into v_entity_count, v_entity_bytes
  from public.attachments a
  where a.owner_id = p_owner_id and a.parent_type = p_parent_type and a.parent_id = p_parent_id;

  if exists (
    select 1 from public.expertise_reports e
    where e.id = p_parent_id and e.owner_id = p_owner_id
      and e.attachment_path is not null
      and not exists (
        select 1 from public.attachments a where a.storage_path = e.attachment_path
      )
  ) then
    v_entity_count := v_entity_count + 1;
    v_entity_bytes := v_entity_bytes + coalesce((
      select case
        when o.metadata->>'size' ~ '^[0-9]+$' then (o.metadata->>'size')::bigint
        else 0
      end
      from storage.objects o
      where o.bucket_id = 'vehicle-attachments'
        and o.name = (
          select e.attachment_path from public.expertise_reports e
          where e.id = p_parent_id and e.owner_id = p_owner_id
        )
    ), 0);
  end if;

  select count(*), coalesce(sum(r.expected_size), 0)
  into v_entity_pending_count, v_entity_pending_bytes
  from public.attachment_upload_reservations r
  where r.owner_id = p_owner_id and r.parent_type = p_parent_type and r.parent_id = p_parent_id
    and r.status in ('reserved', 'uploaded')
    and r.request_id <> p_request_id;

  if v_entity_count + v_entity_pending_count >= 5 then
    raise exception 'ATTACHMENT_ENTITY_COUNT_EXCEEDED';
  end if;
  if v_entity_bytes + v_entity_pending_bytes + p_size_bytes > 15728640 then
    raise exception 'ATTACHMENT_ENTITY_BYTES_EXCEEDED';
  end if;

  v_extension := case p_mime_type
    when 'application/pdf' then 'pdf'
    when 'image/png' then 'png'
    else 'jpg'
  end;
  v_object_path := p_owner_id::text || '/' || p_vehicle_id::text || '/' ||
    p_parent_type || '/' || p_parent_id::text || '/' || v_attachment_id::text || '.' || v_extension;

  if v_existing.id is null then
    insert into public.attachment_upload_reservations (
      id, owner_id, vehicle_id, object_path, expected_size, expected_mime,
      expires_at, request_id, status, updated_at, attachment_id,
      parent_type, parent_id, attachment_source, original_filename
    ) values (
      v_reservation_id, p_owner_id, p_vehicle_id, v_object_path, p_size_bytes, p_mime_type,
      pg_catalog.clock_timestamp() + interval '5 minutes', p_request_id, 'reserved',
      pg_catalog.clock_timestamp(), v_attachment_id, p_parent_type, p_parent_id, p_source,
      v_original_filename
    );
  else
    update public.attachment_upload_reservations
    set object_path = v_object_path, expires_at = pg_catalog.clock_timestamp() + interval '5 minutes',
        status = 'reserved', uploaded_at = null, completed_at = null, failed_at = null,
        failure_code = null, linked_entity_type = null, linked_entity_id = null,
        attachment_id = v_attachment_id, parent_type = p_parent_type, parent_id = p_parent_id,
        attachment_source = p_source, original_filename = v_original_filename,
        updated_at = pg_catalog.clock_timestamp()
    where id = v_existing.id
    returning id into v_reservation_id;
  end if;

  return query select v_reservation_id, v_attachment_id, v_object_path, 'reserved'::text;
end;
$$;

revoke all on function public.reserve_attachment_upload_for_parent(uuid, uuid, text, uuid, text, text, bigint, text, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.reserve_attachment_upload_for_parent(uuid, uuid, text, uuid, text, text, bigint, text, uuid)
to service_role;

create or replace function public.save_expertise_report_with_attachments(
  p_id uuid,
  p_vehicle_id uuid,
  p_report_date date,
  p_company_name text,
  p_overall_note text,
  p_report_number text,
  p_keep_legacy_attachment boolean,
  p_attachment_paths jsonb
)
returns public.expertise_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_existing public.expertise_reports%rowtype;
  v_saved public.expertise_reports%rowtype;
  v_path text;
  v_paths text[] := array[]::text[];
  v_operation public.attachment_upload_reservations%rowtype;
  v_removed record;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_id is null or p_vehicle_id is null then raise exception 'EXPERTISE_REQUEST_REQUIRED'; end if;
  if not exists (
    select 1 from public.vehicles v where v.id = p_vehicle_id and v.owner_id = v_owner_id
  ) then raise exception 'ATTACHMENT_VEHICLE_FORBIDDEN'; end if;
  if p_attachment_paths is null or pg_catalog.jsonb_typeof(p_attachment_paths) <> 'array'
    or pg_catalog.jsonb_array_length(p_attachment_paths) > 5 then
    raise exception 'ATTACHMENT_ENTITY_COUNT_EXCEEDED';
  end if;

  select * into v_existing from public.expertise_reports e where e.id = p_id for update;
  if found and (v_existing.owner_id <> v_owner_id or v_existing.vehicle_id <> p_vehicle_id) then
    raise exception 'EXPERTISE_NOT_FOUND';
  end if;

  for v_path in select pg_catalog.jsonb_array_elements_text(p_attachment_paths)
  loop
    if v_path is null or v_path = any(v_paths) then raise exception 'ATTACHMENT_REFERENCE_INVALID'; end if;
    v_paths := pg_catalog.array_append(v_paths, v_path);

    if not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'vehicle-attachments' and o.name = v_path
    ) then
      raise exception 'ATTACHMENT_REFERENCE_INVALID';
    end if;

    if not exists (
      select 1 from public.attachments a
      where a.owner_id = v_owner_id and a.vehicle_id = p_vehicle_id
        and a.parent_type = 'expertise_report' and a.parent_id = p_id
        and a.storage_path = v_path
    ) then
      select * into v_operation from public.attachment_upload_reservations r
      where r.owner_id = v_owner_id and r.vehicle_id = p_vehicle_id
        and r.parent_type = 'expertise_report' and r.parent_id = p_id
        and r.object_path = v_path and r.status in ('uploaded', 'completed')
      for update;
      if not found or v_operation.attachment_id is null then
        raise exception 'ATTACHMENT_REFERENCE_INVALID';
      end if;
    end if;
  end loop;

  if v_existing.id is null then
    insert into public.expertise_reports (
      id, vehicle_id, owner_id, report_date, company_name, overall_note, report_number, attachment_path
    ) values (
      p_id, p_vehicle_id, v_owner_id, p_report_date,
      nullif(pg_catalog.btrim(p_company_name), ''),
      nullif(pg_catalog.btrim(p_overall_note), ''),
      nullif(pg_catalog.btrim(p_report_number), ''), null
    ) returning * into v_saved;
  else
    update public.expertise_reports
    set report_date = p_report_date,
        company_name = nullif(pg_catalog.btrim(p_company_name), ''),
        overall_note = nullif(pg_catalog.btrim(p_overall_note), ''),
        report_number = nullif(pg_catalog.btrim(p_report_number), ''),
        attachment_path = case when p_keep_legacy_attachment then v_existing.attachment_path else null end
    where id = p_id and owner_id = v_owner_id
    returning * into v_saved;
  end if;

  foreach v_path in array v_paths
  loop
    select * into v_operation from public.attachment_upload_reservations r
    where r.owner_id = v_owner_id and r.object_path = v_path
      and r.parent_type = 'expertise_report' and r.parent_id = p_id
      and r.status in ('uploaded', 'completed')
    for update;
    if found then
      insert into public.attachments (
        id, owner_id, vehicle_id, parent_type, parent_id, source,
        original_filename, storage_path, mime_type, size_bytes
      ) values (
        v_operation.attachment_id, v_owner_id, p_vehicle_id, 'expertise_report', p_id,
        v_operation.attachment_source, v_operation.original_filename, v_operation.object_path,
        v_operation.expected_mime, v_operation.expected_size
      ) on conflict (storage_path) do nothing;
      update public.attachment_upload_reservations
      set status = 'completed', completed_at = coalesce(completed_at, pg_catalog.clock_timestamp()),
          linked_entity_type = 'expertise_report', linked_entity_id = p_id,
          updated_at = pg_catalog.clock_timestamp()
      where id = v_operation.id and owner_id = v_owner_id;
    end if;
  end loop;

  for v_removed in
    select a.storage_path from public.attachments a
    where a.owner_id = v_owner_id and a.parent_type = 'expertise_report' and a.parent_id = p_id
      and not (a.storage_path = any(v_paths))
  loop
    perform private.queue_attachment_cleanup(v_owner_id, v_removed.storage_path);
  end loop;
  delete from public.attachments a
  where a.owner_id = v_owner_id and a.parent_type = 'expertise_report' and a.parent_id = p_id
    and not (a.storage_path = any(v_paths));

  if not p_keep_legacy_attachment and v_existing.attachment_path is not null then
    perform private.queue_attachment_cleanup(v_owner_id, v_existing.attachment_path);
  end if;
  return v_saved;
end;
$$;

revoke all on function public.save_expertise_report_with_attachments(uuid, uuid, date, text, text, text, boolean, jsonb)
from public, anon, authenticated, service_role;
grant execute on function public.save_expertise_report_with_attachments(uuid, uuid, date, text, text, text, boolean, jsonb)
to authenticated;

create or replace function private.cleanup_expertise_attachments_on_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attachment record;
begin
  for v_attachment in
    select a.storage_path
    from public.attachments a
    where a.owner_id = old.owner_id
      and a.parent_type = 'expertise_report'
      and a.parent_id = old.id
  loop
    perform private.queue_attachment_cleanup(old.owner_id, v_attachment.storage_path);
  end loop;

  delete from public.attachments a
  where a.owner_id = old.owner_id
    and a.parent_type = 'expertise_report'
    and a.parent_id = old.id;

  perform private.queue_attachment_cleanup(old.owner_id, old.attachment_path);
  return old;
end;
$$;

revoke all on function private.cleanup_expertise_attachments_on_delete()
from public, anon, authenticated, service_role;

drop trigger if exists expertise_attachments_cleanup_before_delete on public.expertise_reports;
create trigger expertise_attachments_cleanup_before_delete
before delete on public.expertise_reports
for each row execute function private.cleanup_expertise_attachments_on_delete();

create or replace function public.delete_expertise_report_consistent(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_owner_id uuid := auth.uid(); v_path text; v_attachment record;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select attachment_path into v_path from public.expertise_reports
  where id = p_id and owner_id = v_owner_id for update;
  if not found then return false; end if;
  for v_attachment in
    select storage_path from public.attachments
    where owner_id = v_owner_id and parent_type = 'expertise_report' and parent_id = p_id
  loop
    perform private.queue_attachment_cleanup(v_owner_id, v_attachment.storage_path);
  end loop;
  delete from public.attachments
  where owner_id = v_owner_id and parent_type = 'expertise_report' and parent_id = p_id;
  delete from public.expertise_reports where id = p_id and owner_id = v_owner_id;
  perform private.queue_attachment_cleanup(v_owner_id, v_path);
  return true;
end; $$;

revoke all on function public.delete_expertise_report_consistent(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.delete_expertise_report_consistent(uuid) to authenticated;

create or replace function public.request_attachment_cleanup(p_object_path text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_owner_id uuid := auth.uid();
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.attachment_upload_reservations r
    where r.owner_id = v_owner_id and r.object_path = p_object_path
  ) and not exists (
    select 1 from public.attachments a
    where a.owner_id = v_owner_id and a.storage_path = p_object_path
  ) and not exists (
    select 1 from public.vehicle_documents d
    where d.owner_id = v_owner_id and d.attachment_path = p_object_path
  ) and not exists (
    select 1 from public.expertise_reports e
    where e.owner_id = v_owner_id and e.attachment_path = p_object_path
  ) then return false; end if;
  perform private.queue_attachment_cleanup(v_owner_id, p_object_path);
  return true;
end; $$;

revoke all on function public.request_attachment_cleanup(text)
from public, anon, authenticated, service_role;
grant execute on function public.request_attachment_cleanup(text) to authenticated;

create or replace function private.reconcile_attachment_metadata(p_owner_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer := 0; v_changed integer;
begin
  update public.vehicle_documents d set attachment_path = null
  where d.owner_id = p_owner_id and d.attachment_path is not null and not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'vehicle-attachments' and o.name = d.attachment_path
  );
  get diagnostics v_changed = row_count; v_count := v_count + v_changed;
  update public.expertise_reports e set attachment_path = null
  where e.owner_id = p_owner_id and e.attachment_path is not null and not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'vehicle-attachments' and o.name = e.attachment_path
  );
  get diagnostics v_changed = row_count; v_count := v_count + v_changed;
  delete from public.attachments a
  where a.owner_id = p_owner_id and not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'vehicle-attachments' and o.name = a.storage_path
  );
  get diagnostics v_changed = row_count; v_count := v_count + v_changed;
  update public.attachment_upload_reservations r
  set status = 'failed', failed_at = pg_catalog.clock_timestamp(),
      failure_code = 'OBJECT_MISSING', updated_at = pg_catalog.clock_timestamp()
  where r.owner_id = p_owner_id and r.status in ('uploaded', 'completed') and not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'vehicle-attachments' and o.name = r.object_path
  );
  return v_count;
end; $$;

revoke all on function private.reconcile_attachment_metadata(uuid)
from public, anon, authenticated, service_role;

comment on table public.attachments is
  'Owner-scoped reusable metadata for camera, gallery and document attachments in one parent pool.';
comment on function public.reserve_attachment_upload_for_parent(uuid, uuid, text, uuid, text, text, bigint, text, uuid) is
  'Service-role-only source-independent per-user and per-parent quota reservation.';
comment on function public.save_expertise_report_with_attachments(uuid, uuid, date, text, text, text, boolean, jsonb) is
  'Authenticated owner-scoped atomic expertise and attachment metadata save.';
