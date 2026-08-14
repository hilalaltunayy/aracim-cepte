-- TASK-031: replaces historic universal attachment quotas with the authoritative plan resolver.
-- Storage metadata is the final byte source; reservations are temporary capacity only.
create or replace function private.attachment_limits_for_user(p_user_id uuid)
returns table(
  max_attachments_per_entity integer,
  max_attachment_bytes_per_entity bigint,
  max_storage_bytes_per_user bigint
)
language sql stable security invoker set search_path = '' as $$
  select case private.effective_plan_for_user(p_user_id)
    when 'premium' then 10 else 5 end,
    case private.effective_plan_for_user(p_user_id)
      when 'premium' then 31457280::bigint else 15728640::bigint end,
    case private.effective_plan_for_user(p_user_id)
      when 'premium' then 104857600::bigint else 26214400::bigint end;
$$;
revoke all on function private.attachment_limits_for_user(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.reserve_attachment_upload(
  p_owner_id uuid,
  p_vehicle_id uuid,
  p_size_bytes bigint,
  p_mime_type text,
  p_request_id uuid
)
returns table(reservation_id uuid, object_path text, reservation_status text)
language plpgsql security definer set search_path = '' as $$
declare
  v_actual_bytes bigint;
  v_pending_bytes bigint;
  v_storage_limit bigint;
  v_existing public.attachment_upload_reservations%rowtype;
  v_reservation_id uuid := pg_catalog.gen_random_uuid();
  v_object_id uuid := pg_catalog.gen_random_uuid();
  v_extension text;
  v_object_path text;
begin
  if p_owner_id is null or p_vehicle_id is null or p_request_id is null then
    raise exception 'ATTACHMENT_OWNER_REQUIRED';
  end if;
  if p_size_bytes is null or p_size_bytes < 1 or p_size_bytes > 5242880 then
    raise exception 'ATTACHMENT_FILE_TOO_LARGE';
  end if;
  if p_mime_type not in ('application/pdf', 'image/jpeg', 'image/png') then
    raise exception 'ATTACHMENT_TYPE_NOT_ALLOWED';
  end if;
  if not exists (
    select 1 from public.vehicles v where v.id = p_vehicle_id and v.owner_id = p_owner_id
  ) then raise exception 'ATTACHMENT_VEHICLE_FORBIDDEN'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text, 0));
  select * into v_existing from public.attachment_upload_reservations r
  where r.owner_id = p_owner_id and r.request_id = p_request_id for update;
  if found and (v_existing.vehicle_id <> p_vehicle_id or v_existing.expected_size <> p_size_bytes
    or v_existing.expected_mime <> p_mime_type) then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
  if found and (v_existing.status in ('uploaded', 'completed')
    or (v_existing.status = 'reserved' and v_existing.expires_at > pg_catalog.clock_timestamp())) then
    return query select v_existing.id, v_existing.object_path, v_existing.status; return;
  end if;

  update public.attachment_upload_reservations r
  set status = 'failed', failed_at = pg_catalog.clock_timestamp(), failure_code = 'RESERVATION_EXPIRED',
      updated_at = pg_catalog.clock_timestamp()
  where r.owner_id = p_owner_id and r.status = 'reserved' and r.expires_at <= pg_catalog.clock_timestamp()
    and not exists (select 1 from storage.objects o where o.bucket_id = 'vehicle-attachments' and o.name = r.object_path);

  select max_storage_bytes_per_user into v_storage_limit
  from private.attachment_limits_for_user(p_owner_id);
  select coalesce(sum(case when o.metadata->>'size' ~ '^[0-9]+$'
    then (o.metadata->>'size')::bigint else 0 end), 0)
  into v_actual_bytes from storage.objects o
  where o.bucket_id = 'vehicle-attachments' and (storage.foldername(o.name))[1] = p_owner_id::text;
  select coalesce(sum(r.expected_size), 0) into v_pending_bytes
  from public.attachment_upload_reservations r
  where r.owner_id = p_owner_id and r.status = 'reserved' and r.expires_at > pg_catalog.clock_timestamp()
    and not exists (select 1 from storage.objects o where o.bucket_id = 'vehicle-attachments' and o.name = r.object_path);
  if v_actual_bytes + v_pending_bytes + p_size_bytes > v_storage_limit then
    raise exception 'ATTACHMENT_BYTES_QUOTA_EXCEEDED';
  end if;

  v_extension := case p_mime_type when 'application/pdf' then 'pdf' when 'image/png' then 'png' else 'jpg' end;
  v_object_path := p_owner_id::text || '/' || p_vehicle_id::text || '/' || v_object_id::text || '.' || v_extension;
  if v_existing.id is null then
    insert into public.attachment_upload_reservations (
      id, owner_id, vehicle_id, object_path, expected_size, expected_mime, expires_at, request_id, status, updated_at
    ) values (
      v_reservation_id, p_owner_id, p_vehicle_id, v_object_path, p_size_bytes, p_mime_type,
      pg_catalog.clock_timestamp() + interval '5 minutes', p_request_id, 'reserved', pg_catalog.clock_timestamp()
    );
  else
    update public.attachment_upload_reservations
    set object_path = v_object_path, expires_at = pg_catalog.clock_timestamp() + interval '5 minutes', status = 'reserved',
        uploaded_at = null, completed_at = null, failed_at = null, failure_code = null,
        linked_entity_type = null, linked_entity_id = null, updated_at = pg_catalog.clock_timestamp()
    where id = v_existing.id returning id into v_reservation_id;
  end if;
  return query select v_reservation_id, v_object_path, 'reserved'::text;
end;
$$;

create or replace function public.reserve_attachment_upload_for_parent(
  p_owner_id uuid, p_vehicle_id uuid, p_parent_type text, p_parent_id uuid, p_source text,
  p_original_filename text, p_size_bytes bigint, p_mime_type text, p_request_id uuid
)
returns table(reservation_id uuid, attachment_id uuid, object_path text, reservation_status text)
language plpgsql security definer set search_path = '' as $$
declare
  v_actual_bytes bigint; v_pending_bytes bigint; v_storage_limit bigint;
  v_entity_count bigint; v_entity_bytes bigint; v_entity_pending_count bigint; v_entity_pending_bytes bigint;
  v_entity_limit integer; v_entity_byte_limit bigint;
  v_existing public.attachment_upload_reservations%rowtype;
  v_reservation_id uuid := pg_catalog.gen_random_uuid(); v_attachment_id uuid := pg_catalog.gen_random_uuid();
  v_extension text; v_object_path text; v_legacy_path text; v_original_filename text := pg_catalog.btrim(p_original_filename);
begin
  if p_owner_id is null or p_vehicle_id is null or p_parent_id is null or p_request_id is null then raise exception 'ATTACHMENT_OWNER_REQUIRED'; end if;
  if p_parent_type not in ('expertise_report', 'vehicle_document', 'maintenance_record') then raise exception 'ATTACHMENT_PARENT_TYPE_NOT_SUPPORTED'; end if;
  if p_source not in ('camera', 'gallery', 'document') then raise exception 'ATTACHMENT_SOURCE_INVALID'; end if;
  if pg_catalog.char_length(v_original_filename) not between 1 and 120 or v_original_filename like '%/%'
    or pg_catalog.strpos(v_original_filename, pg_catalog.chr(92)) > 0 then raise exception 'ATTACHMENT_FILENAME_INVALID'; end if;
  if p_size_bytes is null or p_size_bytes < 1 or p_size_bytes > 5242880 then raise exception 'ATTACHMENT_FILE_TOO_LARGE'; end if;
  if p_mime_type not in ('application/pdf', 'image/jpeg', 'image/png') then raise exception 'ATTACHMENT_TYPE_NOT_ALLOWED'; end if;
  if not exists (select 1 from public.vehicles v where v.id = p_vehicle_id and v.owner_id = p_owner_id) then raise exception 'ATTACHMENT_VEHICLE_FORBIDDEN'; end if;

  if p_parent_type = 'expertise_report' then
    if exists (select 1 from public.expertise_reports e where e.id = p_parent_id and (e.owner_id <> p_owner_id or e.vehicle_id <> p_vehicle_id)) then raise exception 'ATTACHMENT_PARENT_FORBIDDEN'; end if;
    select e.attachment_path into v_legacy_path from public.expertise_reports e where e.id = p_parent_id and e.owner_id = p_owner_id and e.vehicle_id = p_vehicle_id;
  elsif p_parent_type = 'vehicle_document' then
    if exists (select 1 from public.vehicle_documents d where d.id = p_parent_id and (d.owner_id <> p_owner_id or d.vehicle_id <> p_vehicle_id)) then raise exception 'ATTACHMENT_PARENT_FORBIDDEN'; end if;
    select d.attachment_path into v_legacy_path from public.vehicle_documents d where d.id = p_parent_id and d.owner_id = p_owner_id and d.vehicle_id = p_vehicle_id;
  else
    if exists (select 1 from public.vehicle_records r where r.id = p_parent_id and (r.owner_id <> p_owner_id or r.vehicle_id <> p_vehicle_id or r.record_type <> 'maintenance')) then raise exception 'ATTACHMENT_PARENT_FORBIDDEN'; end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text || ':' || p_parent_id::text, 1));
  select * into v_existing from public.attachment_upload_reservations r where r.owner_id = p_owner_id and r.request_id = p_request_id for update;
  if found and (v_existing.vehicle_id <> p_vehicle_id or v_existing.expected_size <> p_size_bytes or v_existing.expected_mime <> p_mime_type
    or v_existing.parent_type is distinct from p_parent_type or v_existing.parent_id is distinct from p_parent_id
    or v_existing.attachment_source is distinct from p_source or v_existing.original_filename is distinct from v_original_filename) then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
  if found and (v_existing.status in ('uploaded', 'completed') or (v_existing.status = 'reserved' and v_existing.expires_at > pg_catalog.clock_timestamp())) then
    return query select v_existing.id, v_existing.attachment_id, v_existing.object_path, v_existing.status; return;
  end if;

  update public.attachment_upload_reservations r set status = 'failed', failed_at = pg_catalog.clock_timestamp(), failure_code = 'RESERVATION_EXPIRED', updated_at = pg_catalog.clock_timestamp()
  where r.owner_id = p_owner_id and r.status = 'reserved' and r.expires_at <= pg_catalog.clock_timestamp()
    and not exists (select 1 from storage.objects o where o.bucket_id = 'vehicle-attachments' and o.name = r.object_path);
  select max_attachments_per_entity, max_attachment_bytes_per_entity, max_storage_bytes_per_user
  into v_entity_limit, v_entity_byte_limit, v_storage_limit from private.attachment_limits_for_user(p_owner_id);
  select coalesce(sum(case when o.metadata->>'size' ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else 0 end), 0)
  into v_actual_bytes from storage.objects o where o.bucket_id = 'vehicle-attachments' and (storage.foldername(o.name))[1] = p_owner_id::text;
  select coalesce(sum(r.expected_size), 0) into v_pending_bytes from public.attachment_upload_reservations r
  where r.owner_id = p_owner_id and r.status = 'reserved' and r.expires_at > pg_catalog.clock_timestamp()
    and not exists (select 1 from storage.objects o where o.bucket_id = 'vehicle-attachments' and o.name = r.object_path);
  if v_actual_bytes + v_pending_bytes + p_size_bytes > v_storage_limit then raise exception 'ATTACHMENT_BYTES_QUOTA_EXCEEDED'; end if;

  select count(*), coalesce(sum(a.size_bytes), 0) into v_entity_count, v_entity_bytes from public.attachments a
  where a.owner_id = p_owner_id and a.parent_type = p_parent_type and a.parent_id = p_parent_id;
  if v_legacy_path is not null and not exists (select 1 from public.attachments a where a.storage_path = v_legacy_path) then
    v_entity_count := v_entity_count + 1;
    v_entity_bytes := v_entity_bytes + coalesce((select case when o.metadata->>'size' ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else 0 end
      from storage.objects o where o.bucket_id = 'vehicle-attachments' and o.name = v_legacy_path), 0);
  end if;
  select count(*), coalesce(sum(r.expected_size), 0) into v_entity_pending_count, v_entity_pending_bytes from public.attachment_upload_reservations r
  where r.owner_id = p_owner_id and r.parent_type = p_parent_type and r.parent_id = p_parent_id
    and r.status in ('reserved', 'uploaded') and r.request_id <> p_request_id;
  if v_entity_count + v_entity_pending_count >= v_entity_limit then raise exception 'ATTACHMENT_ENTITY_COUNT_EXCEEDED'; end if;
  if v_entity_bytes + v_entity_pending_bytes + p_size_bytes > v_entity_byte_limit then raise exception 'ATTACHMENT_ENTITY_BYTES_EXCEEDED'; end if;

  v_extension := case p_mime_type when 'application/pdf' then 'pdf' when 'image/png' then 'png' else 'jpg' end;
  v_object_path := p_owner_id::text || '/' || p_vehicle_id::text || '/' || p_parent_type || '/' || p_parent_id::text || '/' || v_attachment_id::text || '.' || v_extension;
  if v_existing.id is null then
    insert into public.attachment_upload_reservations (id, owner_id, vehicle_id, object_path, expected_size, expected_mime, expires_at, request_id, status, updated_at, attachment_id, parent_type, parent_id, attachment_source, original_filename)
    values (v_reservation_id, p_owner_id, p_vehicle_id, v_object_path, p_size_bytes, p_mime_type, pg_catalog.clock_timestamp() + interval '5 minutes', p_request_id, 'reserved', pg_catalog.clock_timestamp(), v_attachment_id, p_parent_type, p_parent_id, p_source, v_original_filename);
  else
    update public.attachment_upload_reservations set object_path = v_object_path, expires_at = pg_catalog.clock_timestamp() + interval '5 minutes', status = 'reserved', uploaded_at = null, completed_at = null, failed_at = null, failure_code = null, linked_entity_type = null, linked_entity_id = null, attachment_id = v_attachment_id, parent_type = p_parent_type, parent_id = p_parent_id, attachment_source = p_source, original_filename = v_original_filename, updated_at = pg_catalog.clock_timestamp()
    where id = v_existing.id returning id into v_reservation_id;
  end if;
  return query select v_reservation_id, v_attachment_id, v_object_path, 'reserved'::text;
end;
$$;

create or replace function public.reserve_vehicle_photo_upload(
  p_owner_id uuid, p_vehicle_id uuid, p_photo_id uuid, p_source text, p_original_filename text,
  p_size_bytes bigint, p_mime_type text, p_request_id uuid, p_replaced_photo_id uuid default null
)
returns table(reservation_id uuid, attachment_id uuid, object_path text, reservation_status text)
language plpgsql security definer set search_path = '' as $$
declare
  v_actual_bytes bigint; v_pending_bytes bigint; v_storage_limit bigint; v_replaced_bytes bigint := 0;
  v_photo_count bigint; v_pending_photo_count bigint; v_existing public.attachment_upload_reservations%rowtype;
  v_reservation_id uuid := pg_catalog.gen_random_uuid(); v_attachment_id uuid := pg_catalog.gen_random_uuid();
  v_limit integer; v_extension text; v_object_path text; v_original_filename text := pg_catalog.btrim(p_original_filename);
begin
  if p_owner_id is null or p_vehicle_id is null or p_photo_id is null or p_request_id is null then raise exception 'ATTACHMENT_OWNER_REQUIRED'; end if;
  if p_source not in ('camera', 'gallery') then raise exception 'VEHICLE_PHOTO_SOURCE_INVALID'; end if;
  if p_mime_type not in ('image/jpeg', 'image/png') then raise exception 'ATTACHMENT_TYPE_NOT_ALLOWED'; end if;
  if pg_catalog.char_length(v_original_filename) not between 1 and 120 or v_original_filename like '%/%'
    or pg_catalog.strpos(v_original_filename, pg_catalog.chr(92)) > 0 then raise exception 'ATTACHMENT_FILENAME_INVALID'; end if;
  if p_size_bytes is null or p_size_bytes < 1 or p_size_bytes > 5242880 then raise exception 'ATTACHMENT_FILE_TOO_LARGE'; end if;
  if not exists (select 1 from public.vehicles v where v.id = p_vehicle_id and v.owner_id = p_owner_id) then raise exception 'ATTACHMENT_VEHICLE_FORBIDDEN'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text || ':' || p_vehicle_id::text, 1));
  select * into v_existing from public.attachment_upload_reservations r where r.owner_id = p_owner_id and r.request_id = p_request_id for update;
  if found and (v_existing.vehicle_id <> p_vehicle_id or v_existing.expected_size <> p_size_bytes or v_existing.expected_mime <> p_mime_type
    or v_existing.parent_type is distinct from 'vehicle_photo' or v_existing.parent_id is distinct from p_photo_id
    or v_existing.attachment_source is distinct from p_source or v_existing.original_filename is distinct from v_original_filename
    or v_existing.replaced_photo_id is distinct from p_replaced_photo_id) then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
  if found and (v_existing.status in ('uploaded', 'completed') or (v_existing.status = 'reserved' and v_existing.expires_at > pg_catalog.clock_timestamp())) then
    return query select v_existing.id, v_existing.attachment_id, v_existing.object_path, v_existing.status; return;
  end if;
  if exists (select 1 from public.vehicle_photos p where p.id = p_photo_id) then raise exception 'VEHICLE_PHOTO_ID_CONFLICT'; end if;
  if p_replaced_photo_id is not null and not exists (
    select 1 from public.vehicle_photos p where p.id = p_replaced_photo_id and p.owner_id = p_owner_id and p.vehicle_id = p_vehicle_id
  ) then raise exception 'VEHICLE_PHOTO_REPLACEMENT_NOT_FOUND'; end if;

  update public.attachment_upload_reservations r set status = 'failed', failed_at = pg_catalog.clock_timestamp(), failure_code = 'RESERVATION_EXPIRED', updated_at = pg_catalog.clock_timestamp()
  where r.owner_id = p_owner_id and r.status = 'reserved' and r.expires_at <= pg_catalog.clock_timestamp()
    and not exists (select 1 from storage.objects o where o.bucket_id = 'vehicle-attachments' and o.name = r.object_path);
  select max_storage_bytes_per_user into v_storage_limit from private.attachment_limits_for_user(p_owner_id);
  select coalesce(sum(case when o.metadata->>'size' ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else 0 end), 0)
  into v_actual_bytes from storage.objects o where o.bucket_id = 'vehicle-attachments' and (storage.foldername(o.name))[1] = p_owner_id::text;
  select coalesce(sum(r.expected_size), 0) into v_pending_bytes from public.attachment_upload_reservations r
  where r.owner_id = p_owner_id and r.status = 'reserved' and r.expires_at > pg_catalog.clock_timestamp()
    and not exists (select 1 from storage.objects o where o.bucket_id = 'vehicle-attachments' and o.name = r.object_path);
  if p_replaced_photo_id is not null then
    select coalesce(case when o.metadata->>'size' ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else 0 end, 0)
    into v_replaced_bytes from public.vehicle_photos p join public.attachments a on a.id = p.attachment_id
    left join storage.objects o on o.bucket_id = 'vehicle-attachments' and o.name = a.storage_path
    where p.id = p_replaced_photo_id and p.owner_id = p_owner_id and p.vehicle_id = p_vehicle_id;
  end if;
  if (case when v_actual_bytes > v_replaced_bytes then v_actual_bytes - v_replaced_bytes else 0::bigint end)
    + v_pending_bytes + p_size_bytes > v_storage_limit then
    raise exception 'ATTACHMENT_BYTES_QUOTA_EXCEEDED';
  end if;

  select count(*) into v_photo_count from public.vehicle_photos p where p.owner_id = p_owner_id and p.vehicle_id = p_vehicle_id;
  select count(distinct r.parent_id) into v_pending_photo_count from public.attachment_upload_reservations r
  where r.owner_id = p_owner_id and r.vehicle_id = p_vehicle_id and r.parent_type = 'vehicle_photo'
    and r.status in ('reserved', 'uploaded') and r.request_id <> p_request_id;
  if p_replaced_photo_id is null then
    v_limit := private.max_vehicle_photos_for_user(p_owner_id);
    if v_photo_count + v_pending_photo_count >= v_limit then raise exception 'VEHICLE_PHOTO_LIMIT_REACHED' using errcode = 'P0001'; end if;
  elsif v_pending_photo_count > 0 then
    raise exception 'VEHICLE_PHOTO_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  v_extension := case p_mime_type when 'image/png' then 'png' else 'jpg' end;
  v_object_path := p_owner_id::text || '/' || p_vehicle_id::text || '/vehicle_photo/' || p_photo_id::text || '/' || v_attachment_id::text || '.' || v_extension;
  if v_existing.id is null then
    insert into public.attachment_upload_reservations (id, owner_id, vehicle_id, object_path, expected_size, expected_mime, expires_at, request_id, status, updated_at, attachment_id, parent_type, parent_id, attachment_source, original_filename, replaced_photo_id)
    values (v_reservation_id, p_owner_id, p_vehicle_id, v_object_path, p_size_bytes, p_mime_type, pg_catalog.clock_timestamp() + interval '5 minutes', p_request_id, 'reserved', pg_catalog.clock_timestamp(), v_attachment_id, 'vehicle_photo', p_photo_id, p_source, v_original_filename, p_replaced_photo_id);
  else
    update public.attachment_upload_reservations set object_path = v_object_path, expires_at = pg_catalog.clock_timestamp() + interval '5 minutes', status = 'reserved', uploaded_at = null, completed_at = null, failed_at = null, failure_code = null, linked_entity_type = null, linked_entity_id = null, attachment_id = v_attachment_id, parent_type = 'vehicle_photo', parent_id = p_photo_id, attachment_source = p_source, original_filename = v_original_filename, replaced_photo_id = p_replaced_photo_id, updated_at = pg_catalog.clock_timestamp()
    where id = v_existing.id returning id into v_reservation_id;
  end if;
  return query select v_reservation_id, v_attachment_id, v_object_path, 'reserved'::text;
end;
$$;

create or replace function public.mark_attachment_uploaded(p_reservation_id uuid, p_owner_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_reservation public.attachment_upload_reservations%rowtype; v_actual_size bigint;
begin
  select * into v_reservation from public.attachment_upload_reservations r
  where r.id = p_reservation_id and r.owner_id = p_owner_id for update;
  if not found then return false; end if;
  select case when o.metadata->>'size' ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else null end
  into v_actual_size from storage.objects o where o.bucket_id = 'vehicle-attachments' and o.name = v_reservation.object_path;
  if v_actual_size is null or v_actual_size <> v_reservation.expected_size then return false; end if;
  update public.attachment_upload_reservations r set status = case when r.status = 'completed' then 'completed' else 'uploaded' end,
    uploaded_at = coalesce(r.uploaded_at, pg_catalog.clock_timestamp()), failure_code = null, updated_at = pg_catalog.clock_timestamp()
  where r.id = p_reservation_id and r.owner_id = p_owner_id and r.status in ('reserved', 'uploaded', 'completed');
  return found;
end;
$$;

revoke all on function public.reserve_attachment_upload(uuid, uuid, bigint, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.reserve_attachment_upload(uuid, uuid, bigint, text, uuid) to service_role;
revoke all on function public.reserve_attachment_upload_for_parent(uuid, uuid, text, uuid, text, text, bigint, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.reserve_attachment_upload_for_parent(uuid, uuid, text, uuid, text, text, bigint, text, uuid) to service_role;
revoke all on function public.reserve_vehicle_photo_upload(uuid, uuid, uuid, text, text, bigint, text, uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.reserve_vehicle_photo_upload(uuid, uuid, uuid, text, text, bigint, text, uuid, uuid) to service_role;
revoke all on function public.mark_attachment_uploaded(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.mark_attachment_uploaded(uuid, uuid) to service_role;
