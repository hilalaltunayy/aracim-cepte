-- TASK-024: optional maintenance service details and unified maintenance attachments.

alter table public.vehicle_records
  add column service_type text,
  add column service_name text,
  add column parts_cost numeric(12,2),
  add column labor_cost numeric(12,2),
  add column invoice_number text;

alter table public.vehicle_records
  add constraint vehicle_records_service_type_valid check (
    service_type is null
    or service_type in ('authorized_service', 'independent_service', 'self_service', 'other')
  ),
  add constraint vehicle_records_service_name_length check (
    service_name is null or pg_catalog.char_length(pg_catalog.btrim(service_name)) between 1 and 120
  ),
  add constraint vehicle_records_parts_cost_valid check (
    parts_cost is null or (parts_cost >= 0 and parts_cost <> 'NaN'::numeric)
  ),
  add constraint vehicle_records_labor_cost_valid check (
    labor_cost is null or (labor_cost >= 0 and labor_cost <> 'NaN'::numeric)
  ),
  add constraint vehicle_records_invoice_number_length check (
    invoice_number is null
    or pg_catalog.char_length(pg_catalog.btrim(invoice_number)) between 1 and 80
  ),
  add constraint vehicle_records_maintenance_details_scope check (
    record_type = 'maintenance'
    or (
      service_type is null and service_name is null and parts_cost is null
      and labor_cost is null and invoice_number is null
    )
  );

alter table public.attachment_upload_reservations
  drop constraint attachment_upload_reservations_linked_entity_type_check,
  add constraint attachment_upload_reservations_linked_entity_type_check check (
    linked_entity_type is null
    or linked_entity_type in ('vehicle_document', 'expertise_report', 'maintenance_record')
  );

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
  if p_parent_type not in ('expertise_report', 'vehicle_document', 'maintenance_record') then
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
  elsif p_parent_type = 'vehicle_document' then
    if exists (
      select 1 from public.vehicle_documents d
      where d.id = p_parent_id
        and (d.owner_id <> p_owner_id or d.vehicle_id <> p_vehicle_id)
    ) then raise exception 'ATTACHMENT_PARENT_FORBIDDEN'; end if;
    select d.attachment_path into v_legacy_path
    from public.vehicle_documents d
    where d.id = p_parent_id and d.owner_id = p_owner_id and d.vehicle_id = p_vehicle_id;
  else
    if exists (
      select 1 from public.vehicle_records r
      where r.id = p_parent_id
        and (
          r.owner_id <> p_owner_id
          or r.vehicle_id <> p_vehicle_id
          or r.record_type <> 'maintenance'
        )
    ) then raise exception 'ATTACHMENT_PARENT_FORBIDDEN'; end if;
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

create or replace function public.save_maintenance_record_with_details(
  p_request_id uuid,
  p_vehicle_id uuid,
  p_record_id uuid,
  p_category text,
  p_amount numeric,
  p_record_date date,
  p_kilometer integer,
  p_description text,
  p_item_types text[],
  p_service_type text,
  p_service_name text,
  p_parts_cost numeric,
  p_labor_cost numeric,
  p_invoice_number text,
  p_attachment_paths jsonb
)
returns public.vehicle_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_existing public.vehicle_records%rowtype;
  v_saved public.vehicle_records%rowtype;
  v_inner_request_id uuid;
  v_path text;
  v_paths text[] := array[]::text[];
  v_operation public.attachment_upload_reservations%rowtype;
  v_removed record;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_request_id is null or p_vehicle_id is null or p_record_id is null then
    raise exception 'RECORD_REQUEST_REQUIRED';
  end if;
  if p_service_type is not null
    and p_service_type not in ('authorized_service', 'independent_service', 'self_service', 'other') then
    raise exception 'MAINTENANCE_SERVICE_TYPE_INVALID';
  end if;
  if p_parts_cost is not null and (p_parts_cost < 0 or p_parts_cost = 'NaN'::numeric)
    or p_labor_cost is not null and (p_labor_cost < 0 or p_labor_cost = 'NaN'::numeric) then
    raise exception 'MAINTENANCE_COST_INVALID';
  end if;
  if pg_catalog.char_length(pg_catalog.btrim(coalesce(p_service_name, ''))) > 120
    or pg_catalog.char_length(pg_catalog.btrim(coalesce(p_invoice_number, ''))) > 80
    or pg_catalog.char_length(pg_catalog.btrim(coalesce(p_description, ''))) > 1000 then
    raise exception 'MAINTENANCE_DETAILS_INVALID';
  end if;
  if p_attachment_paths is null or pg_catalog.jsonb_typeof(p_attachment_paths) <> 'array'
    or pg_catalog.jsonb_array_length(p_attachment_paths) > 5 then
    raise exception 'ATTACHMENT_ENTITY_COUNT_EXCEEDED';
  end if;
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = v_owner_id and v.archived_at is null
  ) then raise exception 'RECORD_VEHICLE_FORBIDDEN'; end if;

  select * into v_existing from public.vehicle_records r where r.id = p_record_id for update;
  if found and (v_existing.owner_id <> v_owner_id or v_existing.vehicle_id <> p_vehicle_id) then
    raise exception 'RECORD_NOT_FOUND';
  end if;

  for v_path in select pg_catalog.jsonb_array_elements_text(p_attachment_paths)
  loop
    if v_path is null or v_path = any(v_paths) then
      raise exception 'ATTACHMENT_REFERENCE_INVALID';
    end if;
    v_paths := pg_catalog.array_append(v_paths, v_path);
    if not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'vehicle-attachments' and o.name = v_path
    ) then raise exception 'ATTACHMENT_REFERENCE_INVALID'; end if;
    if not exists (
      select 1 from public.attachments a
      where a.owner_id = v_owner_id and a.vehicle_id = p_vehicle_id
        and a.parent_type = 'maintenance_record' and a.parent_id = p_record_id
        and a.storage_path = v_path
    ) then
      select * into v_operation from public.attachment_upload_reservations r
      where r.owner_id = v_owner_id and r.vehicle_id = p_vehicle_id
        and r.parent_type = 'maintenance_record' and r.parent_id = p_record_id
        and r.object_path = v_path and r.status in ('uploaded', 'completed')
      for update;
      if not found or v_operation.attachment_id is null then
        raise exception 'ATTACHMENT_REFERENCE_INVALID';
      end if;
    end if;
  end loop;

  if v_existing.id is null then
    insert into public.vehicle_records (
      id, vehicle_id, owner_id, record_type, category, amount, record_date,
      kilometer, liters, description, source
    ) values (
      p_record_id, p_vehicle_id, v_owner_id, 'maintenance', pg_catalog.btrim(p_category),
      p_amount, p_record_date, p_kilometer, null,
      nullif(pg_catalog.btrim(p_description), ''), 'manual'
    );
  end if;

  v_inner_request_id := pg_catalog.md5(pg_catalog.concat_ws('|',
    p_request_id::text,
    p_record_id::text,
    coalesce(p_service_type, ''),
    coalesce(pg_catalog.btrim(p_service_name), ''),
    coalesce(p_parts_cost::text, ''),
    coalesce(p_labor_cost::text, ''),
    coalesce(pg_catalog.btrim(p_invoice_number), ''),
    p_attachment_paths::text
  ))::uuid;

  select * into v_saved from public.save_maintenance_record_atomic(
    v_inner_request_id,
    p_vehicle_id,
    p_record_id,
    p_category,
    p_amount,
    p_record_date,
    p_kilometer,
    p_description,
    p_item_types
  );

  update public.vehicle_records
  set service_type = nullif(p_service_type, ''),
      service_name = nullif(pg_catalog.btrim(p_service_name), ''),
      parts_cost = p_parts_cost,
      labor_cost = p_labor_cost,
      invoice_number = nullif(pg_catalog.btrim(p_invoice_number), '')
  where id = v_saved.id and owner_id = v_owner_id
  returning * into v_saved;

  foreach v_path in array v_paths
  loop
    select * into v_operation from public.attachment_upload_reservations r
    where r.owner_id = v_owner_id and r.object_path = v_path
      and r.parent_type = 'maintenance_record' and r.parent_id = p_record_id
      and r.status in ('uploaded', 'completed')
    for update;
    if found then
      insert into public.attachments (
        id, owner_id, vehicle_id, parent_type, parent_id, source,
        original_filename, storage_path, mime_type, size_bytes
      ) values (
        v_operation.attachment_id, v_owner_id, p_vehicle_id, 'maintenance_record', p_record_id,
        v_operation.attachment_source, v_operation.original_filename, v_operation.object_path,
        v_operation.expected_mime, v_operation.expected_size
      ) on conflict (storage_path) do nothing;
      update public.attachment_upload_reservations
      set status = 'completed', completed_at = coalesce(completed_at, pg_catalog.clock_timestamp()),
          linked_entity_type = 'maintenance_record', linked_entity_id = p_record_id,
          updated_at = pg_catalog.clock_timestamp()
      where id = v_operation.id and owner_id = v_owner_id;
    end if;
  end loop;

  for v_removed in
    select a.storage_path from public.attachments a
    where a.owner_id = v_owner_id and a.parent_type = 'maintenance_record'
      and a.parent_id = p_record_id and not (a.storage_path = any(v_paths))
  loop
    perform private.queue_attachment_cleanup(v_owner_id, v_removed.storage_path);
  end loop;
  delete from public.attachments a
  where a.owner_id = v_owner_id and a.parent_type = 'maintenance_record'
    and a.parent_id = p_record_id and not (a.storage_path = any(v_paths));

  return v_saved;
end;
$$;

revoke all on function public.save_maintenance_record_with_details(
  uuid, uuid, uuid, text, numeric, date, integer, text, text[],
  text, text, numeric, numeric, text, jsonb
) from public, anon, authenticated, service_role;
grant execute on function public.save_maintenance_record_with_details(
  uuid, uuid, uuid, text, numeric, date, integer, text, text[],
  text, text, numeric, numeric, text, jsonb
) to authenticated;

create or replace function private.cleanup_maintenance_record_attachments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attachment record;
begin
  if old.record_type = 'maintenance'
    and (tg_op = 'DELETE' or (tg_op = 'UPDATE' and new.record_type <> 'maintenance')) then
    for v_attachment in
      select a.storage_path from public.attachments a
      where a.owner_id = old.owner_id
        and a.parent_type = 'maintenance_record'
        and a.parent_id = old.id
    loop
      perform private.queue_attachment_cleanup(old.owner_id, v_attachment.storage_path);
    end loop;
    delete from public.attachments a
    where a.owner_id = old.owner_id
      and a.parent_type = 'maintenance_record'
      and a.parent_id = old.id;
    if tg_op = 'UPDATE' then
      new.service_type := null;
      new.service_name := null;
      new.parts_cost := null;
      new.labor_cost := null;
      new.invoice_number := null;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.cleanup_maintenance_record_attachments()
from public, anon, authenticated, service_role;

create trigger maintenance_record_attachments_cleanup
before delete or update of record_type on public.vehicle_records
for each row execute function private.cleanup_maintenance_record_attachments();

comment on column public.vehicle_records.service_type is
  'Optional normalized maintenance service context: authorized, independent, self or other.';
comment on column public.vehicle_records.parts_cost is
  'Optional maintenance parts breakdown; vehicle_records.amount remains the canonical total.';
comment on column public.vehicle_records.labor_cost is
  'Optional maintenance labor breakdown; vehicle_records.amount remains the canonical total.';
comment on function public.save_maintenance_record_with_details(
  uuid, uuid, uuid, text, numeric, date, integer, text, text[],
  text, text, numeric, numeric, text, jsonb
) is 'Owner-scoped maintenance event/item/detail and attachment metadata save preserving TASK-016/017 semantics.';
