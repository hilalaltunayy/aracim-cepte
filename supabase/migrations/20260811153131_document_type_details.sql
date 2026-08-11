-- TASK-023: document-type metadata and unified vehicle-document attachments.

alter table public.vehicle_documents
  add column issuer_name text,
  add column start_date date,
  add column event_date date;

alter table public.vehicle_documents
  add constraint vehicle_documents_issuer_name_length
    check (issuer_name is null or char_length(pg_catalog.btrim(issuer_name)) between 1 and 120),
  add constraint vehicle_documents_insurance_dates_valid
    check (
      document_type not in ('traffic_insurance', 'comprehensive_insurance')
      or start_date is null
      or expiry_date is null
      or expiry_date >= start_date
    ),
  add constraint vehicle_documents_inspection_dates_valid
    check (
      document_type <> 'inspection'
      or event_date is null
      or expiry_date is null
      or expiry_date >= event_date
    );

create index vehicle_documents_vehicle_event_idx
on public.vehicle_documents(vehicle_id, event_date desc)
where event_date is not null;

create or replace function private.sync_vehicle_document_event_date()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.document_type in ('traffic_insurance', 'comprehensive_insurance') then
      new.start_date := coalesce(new.start_date, new.issue_date);
    else
      new.event_date := coalesce(new.event_date, new.issue_date);
    end if;
  elsif new.issue_date is distinct from old.issue_date then
    if new.document_type in ('traffic_insurance', 'comprehensive_insurance')
      and new.start_date is not distinct from old.start_date then
      new.start_date := new.issue_date;
    elsif new.document_type not in ('traffic_insurance', 'comprehensive_insurance')
      and new.event_date is not distinct from old.event_date then
      new.event_date := new.issue_date;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_vehicle_document_event_date()
from public, anon, authenticated, service_role;

create trigger vehicle_documents_sync_event_date
before insert or update of issue_date, event_date on public.vehicle_documents
for each row execute function private.sync_vehicle_document_event_date();

update public.vehicle_documents
set start_date = issue_date
where document_type in ('traffic_insurance', 'comprehensive_insurance')
  and start_date is null and issue_date is not null;

update public.vehicle_documents
set event_date = issue_date
where document_type not in ('traffic_insurance', 'comprehensive_insurance')
  and event_date is null and issue_date is not null;

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
  v_legacy_path text;
  v_original_filename text := pg_catalog.btrim(p_original_filename);
begin
  if p_owner_id is null or p_vehicle_id is null or p_parent_id is null or p_request_id is null then
    raise exception 'ATTACHMENT_OWNER_REQUIRED';
  end if;
  if p_parent_type not in ('expertise_report', 'vehicle_document') then
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

  if p_parent_type = 'expertise_report' then
    if exists (
      select 1 from public.expertise_reports e
      where e.id = p_parent_id
        and (e.owner_id <> p_owner_id or e.vehicle_id <> p_vehicle_id)
    ) then raise exception 'ATTACHMENT_PARENT_FORBIDDEN'; end if;
    select e.attachment_path into v_legacy_path
    from public.expertise_reports e
    where e.id = p_parent_id and e.owner_id = p_owner_id and e.vehicle_id = p_vehicle_id;
  else
    if exists (
      select 1 from public.vehicle_documents d
      where d.id = p_parent_id
        and (d.owner_id <> p_owner_id or d.vehicle_id <> p_vehicle_id)
    ) then raise exception 'ATTACHMENT_PARENT_FORBIDDEN'; end if;
    select d.attachment_path into v_legacy_path
    from public.vehicle_documents d
    where d.id = p_parent_id and d.owner_id = p_owner_id and d.vehicle_id = p_vehicle_id;
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
    return query
      select v_existing.id, v_existing.attachment_id, v_existing.object_path, v_existing.status;
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

  if v_legacy_path is not null and not exists (
    select 1 from public.attachments a where a.storage_path = v_legacy_path
  ) then
    v_entity_count := v_entity_count + 1;
    v_entity_bytes := v_entity_bytes + coalesce((
      select case
        when o.metadata->>'size' ~ '^[0-9]+$' then (o.metadata->>'size')::bigint
        else 0
      end
      from storage.objects o
      where o.bucket_id = 'vehicle-attachments' and o.name = v_legacy_path
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

create or replace function public.save_vehicle_document_with_attachments(
  p_id uuid,
  p_vehicle_id uuid,
  p_document_type public.document_type,
  p_title text,
  p_document_number text,
  p_issuer_name text,
  p_start_date date,
  p_event_date date,
  p_expiry_date date,
  p_note text,
  p_keep_legacy_attachment boolean,
  p_attachment_paths jsonb
)
returns public.vehicle_documents
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_existing public.vehicle_documents%rowtype;
  v_saved public.vehicle_documents%rowtype;
  v_path text;
  v_paths text[] := array[]::text[];
  v_operation public.attachment_upload_reservations%rowtype;
  v_removed record;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_id is null or p_vehicle_id is null then raise exception 'DOCUMENT_REQUEST_REQUIRED'; end if;
  if not exists (
    select 1 from public.vehicles v where v.id = p_vehicle_id and v.owner_id = v_owner_id
  ) then raise exception 'ATTACHMENT_VEHICLE_FORBIDDEN'; end if;
  if pg_catalog.btrim(coalesce(p_title, '')) = '' then raise exception 'DOCUMENT_TITLE_REQUIRED'; end if;
  if pg_catalog.char_length(pg_catalog.btrim(p_title)) > 120 then
    raise exception 'DOCUMENT_TITLE_INVALID';
  end if;
  if p_document_type in ('traffic_insurance', 'comprehensive_insurance')
    and p_start_date is not null and p_expiry_date is not null and p_expiry_date < p_start_date then
    raise exception 'DOCUMENT_DATE_ORDER_INVALID';
  end if;
  if p_document_type = 'inspection'
    and p_event_date is not null and p_expiry_date is not null and p_expiry_date < p_event_date then
    raise exception 'DOCUMENT_DATE_ORDER_INVALID';
  end if;
  if p_attachment_paths is null or pg_catalog.jsonb_typeof(p_attachment_paths) <> 'array'
    or pg_catalog.jsonb_array_length(p_attachment_paths) > 5 then
    raise exception 'ATTACHMENT_ENTITY_COUNT_EXCEEDED';
  end if;

  select * into v_existing from public.vehicle_documents d where d.id = p_id for update;
  if found and (v_existing.owner_id <> v_owner_id or v_existing.vehicle_id <> p_vehicle_id) then
    raise exception 'DOCUMENT_NOT_FOUND';
  end if;

  for v_path in select pg_catalog.jsonb_array_elements_text(p_attachment_paths)
  loop
    if v_path is null or v_path = any(v_paths) then raise exception 'ATTACHMENT_REFERENCE_INVALID'; end if;
    v_paths := pg_catalog.array_append(v_paths, v_path);
    if not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'vehicle-attachments' and o.name = v_path
    ) then raise exception 'ATTACHMENT_REFERENCE_INVALID'; end if;
    if not exists (
      select 1 from public.attachments a
      where a.owner_id = v_owner_id and a.vehicle_id = p_vehicle_id
        and a.parent_type = 'vehicle_document' and a.parent_id = p_id
        and a.storage_path = v_path
    ) then
      select * into v_operation from public.attachment_upload_reservations r
      where r.owner_id = v_owner_id and r.vehicle_id = p_vehicle_id
        and r.parent_type = 'vehicle_document' and r.parent_id = p_id
        and r.object_path = v_path and r.status in ('uploaded', 'completed')
      for update;
      if not found or v_operation.attachment_id is null then
        raise exception 'ATTACHMENT_REFERENCE_INVALID';
      end if;
    end if;
  end loop;

  if v_existing.id is null then
    insert into public.vehicle_documents (
      id, vehicle_id, owner_id, document_type, title, document_number, issuer_name,
      start_date, event_date, issue_date, expiry_date, note, attachment_path
    ) values (
      p_id, p_vehicle_id, v_owner_id, p_document_type, pg_catalog.btrim(p_title),
      nullif(pg_catalog.btrim(p_document_number), ''),
      nullif(pg_catalog.btrim(p_issuer_name), ''), p_start_date, p_event_date,
      case
        when p_document_type in ('traffic_insurance', 'comprehensive_insurance') then p_start_date
        else p_event_date
      end,
      p_expiry_date, nullif(pg_catalog.btrim(p_note), ''), null
    ) returning * into v_saved;
  else
    update public.vehicle_documents
    set document_type = p_document_type,
        title = pg_catalog.btrim(p_title),
        document_number = nullif(pg_catalog.btrim(p_document_number), ''),
        issuer_name = nullif(pg_catalog.btrim(p_issuer_name), ''),
        start_date = p_start_date,
        event_date = p_event_date,
        issue_date = case
          when p_document_type in ('traffic_insurance', 'comprehensive_insurance') then p_start_date
          else p_event_date
        end,
        expiry_date = p_expiry_date,
        note = nullif(pg_catalog.btrim(p_note), ''),
        attachment_path = case
          when coalesce(p_keep_legacy_attachment, false) then v_existing.attachment_path
          else null
        end
    where id = p_id and owner_id = v_owner_id
    returning * into v_saved;
  end if;

  foreach v_path in array v_paths
  loop
    select * into v_operation from public.attachment_upload_reservations r
    where r.owner_id = v_owner_id and r.object_path = v_path
      and r.parent_type = 'vehicle_document' and r.parent_id = p_id
      and r.status in ('uploaded', 'completed')
    for update;
    if found then
      insert into public.attachments (
        id, owner_id, vehicle_id, parent_type, parent_id, source,
        original_filename, storage_path, mime_type, size_bytes
      ) values (
        v_operation.attachment_id, v_owner_id, p_vehicle_id, 'vehicle_document', p_id,
        v_operation.attachment_source, v_operation.original_filename, v_operation.object_path,
        v_operation.expected_mime, v_operation.expected_size
      ) on conflict (storage_path) do nothing;
      update public.attachment_upload_reservations
      set status = 'completed', completed_at = coalesce(completed_at, pg_catalog.clock_timestamp()),
          linked_entity_type = 'vehicle_document', linked_entity_id = p_id,
          updated_at = pg_catalog.clock_timestamp()
      where id = v_operation.id and owner_id = v_owner_id;
    end if;
  end loop;

  for v_removed in
    select a.storage_path from public.attachments a
    where a.owner_id = v_owner_id and a.parent_type = 'vehicle_document' and a.parent_id = p_id
      and not (a.storage_path = any(v_paths))
  loop
    perform private.queue_attachment_cleanup(v_owner_id, v_removed.storage_path);
  end loop;
  delete from public.attachments a
  where a.owner_id = v_owner_id and a.parent_type = 'vehicle_document' and a.parent_id = p_id
    and not (a.storage_path = any(v_paths));

  if not coalesce(p_keep_legacy_attachment, false) and v_existing.attachment_path is not null then
    perform private.queue_attachment_cleanup(v_owner_id, v_existing.attachment_path);
  end if;
  return v_saved;
end;
$$;

revoke all on function public.save_vehicle_document_with_attachments(uuid, uuid, public.document_type, text, text, text, date, date, date, text, boolean, jsonb)
from public, anon, authenticated, service_role;
grant execute on function public.save_vehicle_document_with_attachments(uuid, uuid, public.document_type, text, text, text, date, date, date, text, boolean, jsonb)
to authenticated;

create or replace function private.cleanup_vehicle_document_attachments_on_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attachment record;
begin
  for v_attachment in
    select a.storage_path from public.attachments a
    where a.owner_id = old.owner_id
      and a.parent_type = 'vehicle_document'
      and a.parent_id = old.id
  loop
    perform private.queue_attachment_cleanup(old.owner_id, v_attachment.storage_path);
  end loop;
  delete from public.attachments a
  where a.owner_id = old.owner_id
    and a.parent_type = 'vehicle_document'
    and a.parent_id = old.id;
  perform private.queue_attachment_cleanup(old.owner_id, old.attachment_path);
  return old;
end;
$$;

revoke all on function private.cleanup_vehicle_document_attachments_on_delete()
from public, anon, authenticated, service_role;

create trigger vehicle_document_attachments_cleanup_before_delete
before delete on public.vehicle_documents
for each row execute function private.cleanup_vehicle_document_attachments_on_delete();

comment on column public.vehicle_documents.issuer_name is
  'Normalized insurer, inspection station, expertise company or issuing institution name.';
comment on column public.vehicle_documents.start_date is
  'Type-specific start date, currently used by insurance policies.';
comment on column public.vehicle_documents.event_date is
  'Type-specific registration, inspection, report, invoice or other document event date.';
comment on function public.save_vehicle_document_with_attachments(uuid, uuid, public.document_type, text, text, text, date, date, date, text, boolean, jsonb) is
  'Owner-scoped atomic normalized vehicle document and unified attachment metadata save.';
