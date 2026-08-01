-- TASK-008: atomic record/mileage writes, recoverable reminder scheduling metadata,
-- and idempotent attachment upload/metadata cleanup state.

create table public.record_mutation_requests (
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  record_id uuid not null references public.vehicle_records(id) on delete cascade,
  request_hash text not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, request_id)
);

alter table public.record_mutation_requests enable row level security;
revoke all on table public.record_mutation_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.record_mutation_requests to service_role;

create or replace function public.save_vehicle_record_atomic(
  p_request_id uuid,
  p_vehicle_id uuid,
  p_record_id uuid,
  p_record_type public.record_type,
  p_category text,
  p_amount numeric,
  p_record_date date,
  p_kilometer integer,
  p_liters numeric,
  p_description text
)
returns public.vehicle_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_request_hash text;
  v_previous_request public.record_mutation_requests%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_existing public.vehicle_records%rowtype;
  v_saved public.vehicle_records%rowtype;
  v_record_id uuid := coalesce(p_record_id, pg_catalog.gen_random_uuid());
begin
  if v_owner_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_request_id is null or p_vehicle_id is null then
    raise exception 'RECORD_REQUEST_REQUIRED';
  end if;
  if pg_catalog.length(pg_catalog.btrim(coalesce(p_category, ''))) = 0
    or p_amount is null or p_amount <= 0 or p_record_date is null
    or p_kilometer is not null and p_kilometer < 0 then
    raise exception 'RECORD_VALIDATION_FAILED';
  end if;

  v_request_hash := pg_catalog.md5(pg_catalog.concat_ws('|',
    p_vehicle_id::text,
    coalesce(p_record_id::text, ''),
    p_record_type::text,
    pg_catalog.btrim(p_category),
    p_amount::text,
    p_record_date::text,
    coalesce(p_kilometer::text, ''),
    coalesce(p_liters::text, ''),
    coalesce(pg_catalog.btrim(p_description), '')
  ));

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner_id::text || ':' || p_request_id::text, 0)
  );

  select * into v_previous_request
  from public.record_mutation_requests r
  where r.owner_id = v_owner_id and r.request_id = p_request_id;

  if found then
    if v_previous_request.request_hash <> v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    select * into v_saved
    from public.vehicle_records r
    where r.id = v_previous_request.record_id and r.owner_id = v_owner_id;
    if not found then
      raise exception 'IDEMPOTENCY_RESULT_MISSING';
    end if;
    return v_saved;
  end if;

  select * into v_vehicle
  from public.vehicles v
  where v.id = p_vehicle_id and v.owner_id = v_owner_id and v.archived_at is null
  for update;
  if not found then
    raise exception 'RECORD_VEHICLE_FORBIDDEN';
  end if;

  if p_record_id is not null then
    select * into v_existing
    from public.vehicle_records r
    where r.id = p_record_id and r.owner_id = v_owner_id and r.vehicle_id = p_vehicle_id
    for update;
    if not found then
      raise exception 'RECORD_NOT_FOUND';
    end if;
  end if;

  if p_kilometer is not null
    and p_kilometer < v_vehicle.current_km
    and not (p_record_id is not null and v_existing.kilometer is not distinct from p_kilometer) then
    raise exception 'RECORD_MILEAGE_TOO_LOW';
  end if;

  if p_record_id is null then
    insert into public.vehicle_records (
      id, vehicle_id, owner_id, record_type, category, amount, record_date,
      kilometer, liters, description
    ) values (
      v_record_id, p_vehicle_id, v_owner_id, p_record_type, pg_catalog.btrim(p_category),
      p_amount, p_record_date, p_kilometer,
      case when p_record_type = 'fuel' then p_liters else null end,
      nullif(pg_catalog.btrim(p_description), '')
    ) returning * into v_saved;
  else
    update public.vehicle_records
    set record_type = p_record_type,
        category = pg_catalog.btrim(p_category),
        amount = p_amount,
        record_date = p_record_date,
        kilometer = p_kilometer,
        liters = case when p_record_type = 'fuel' then p_liters else null end,
        description = nullif(pg_catalog.btrim(p_description), '')
    where id = p_record_id and owner_id = v_owner_id
    returning * into v_saved;
  end if;

  if p_kilometer is not null and p_kilometer > v_vehicle.current_km then
    update public.vehicles
    set current_km = p_kilometer
    where id = p_vehicle_id and owner_id = v_owner_id;
  end if;

  insert into public.record_mutation_requests (owner_id, request_id, record_id, request_hash)
  values (v_owner_id, p_request_id, v_saved.id, v_request_hash);

  return v_saved;
end;
$$;

revoke all on function public.save_vehicle_record_atomic(
  uuid, uuid, uuid, public.record_type, text, numeric, date, integer, numeric, text
) from public, anon, authenticated, service_role;
grant execute on function public.save_vehicle_record_atomic(
  uuid, uuid, uuid, public.record_type, text, numeric, date, integer, numeric, text
) to authenticated;

alter table public.reminders
  add column notification_status text not null default 'pending'
    check (notification_status in ('pending', 'scheduled', 'not_required', 'permission_denied', 'failed')),
  add column notification_last_attempt_at timestamptz,
  add column notification_error_code text;

update public.reminders
set notification_status = case
  when completed or due_date is null then 'not_required'
  when notification_id is not null then 'scheduled'
  else 'pending'
end;

alter table public.attachment_upload_reservations
  add column request_id uuid,
  add column status text not null default 'reserved'
    check (status in ('reserved', 'uploaded', 'completed', 'failed', 'cleanup_required')),
  add column uploaded_at timestamptz,
  add column completed_at timestamptz,
  add column failed_at timestamptz,
  add column failure_code text,
  add column linked_entity_type text
    check (linked_entity_type in ('vehicle_document', 'expertise_report')),
  add column linked_entity_id uuid,
  add column updated_at timestamptz not null default now();

update public.attachment_upload_reservations set request_id = id where request_id is null;
alter table public.attachment_upload_reservations alter column request_id set not null;
create unique index attachment_reservations_owner_request_idx
  on public.attachment_upload_reservations(owner_id, request_id);
create index attachment_reservations_owner_status_idx
  on public.attachment_upload_reservations(owner_id, status, updated_at);

create table public.attachment_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, object_path)
);

alter table public.attachment_cleanup_queue enable row level security;
revoke all on table public.attachment_cleanup_queue from public, anon, authenticated;
grant select, insert, update, delete on table public.attachment_cleanup_queue to service_role;

create or replace function private.queue_attachment_cleanup(p_owner_id uuid, p_object_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_owner_id is null or p_object_path is null or pg_catalog.btrim(p_object_path) = '' then
    return;
  end if;
  insert into public.attachment_cleanup_queue (owner_id, object_path, status, attempts, last_error_code)
  values (p_owner_id, p_object_path, 'pending', 0, null)
  on conflict (owner_id, object_path) do update
  set status = 'pending', last_error_code = null, updated_at = pg_catalog.clock_timestamp();

  update public.attachment_upload_reservations
  set status = 'cleanup_required', updated_at = pg_catalog.clock_timestamp()
  where owner_id = p_owner_id and object_path = p_object_path and status <> 'failed';
end;
$$;

revoke all on function private.queue_attachment_cleanup(uuid, text)
from public, anon, authenticated, service_role;

drop function public.reserve_attachment_upload(uuid, uuid, bigint, text);

create function public.reserve_attachment_upload(
  p_owner_id uuid,
  p_vehicle_id uuid,
  p_size_bytes bigint,
  p_mime_type text,
  p_request_id uuid
)
returns table(reservation_id uuid, object_path text, reservation_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actual_count bigint;
  v_actual_bytes bigint;
  v_pending_count bigint;
  v_pending_bytes bigint;
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
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = p_owner_id
  ) then
    raise exception 'ATTACHMENT_VEHICLE_FORBIDDEN';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text, 0));

  select * into v_existing
  from public.attachment_upload_reservations r
  where r.owner_id = p_owner_id and r.request_id = p_request_id
  for update;

  if found and (
    v_existing.vehicle_id <> p_vehicle_id or v_existing.expected_size <> p_size_bytes
    or v_existing.expected_mime <> p_mime_type
  ) then
    raise exception 'IDEMPOTENCY_KEY_REUSED';
  end if;
  if found and (
    v_existing.status in ('uploaded', 'completed')
    or (v_existing.status = 'reserved' and v_existing.expires_at > pg_catalog.clock_timestamp())
  ) then
    return query select v_existing.id, v_existing.object_path, v_existing.status;
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

  v_extension := case p_mime_type when 'application/pdf' then 'pdf' when 'image/png' then 'png' else 'jpg' end;
  v_object_path := p_owner_id::text || '/' || p_vehicle_id::text || '/' || v_object_id::text || '.' || v_extension;

  if v_existing.id is null then
    insert into public.attachment_upload_reservations (
      id, owner_id, vehicle_id, object_path, expected_size, expected_mime,
      expires_at, request_id, status, updated_at
    ) values (
      v_reservation_id, p_owner_id, p_vehicle_id, v_object_path, p_size_bytes, p_mime_type,
      pg_catalog.clock_timestamp() + interval '5 minutes', p_request_id, 'reserved', pg_catalog.clock_timestamp()
    );
  else
    update public.attachment_upload_reservations
    set object_path = v_object_path, expires_at = pg_catalog.clock_timestamp() + interval '5 minutes',
        status = 'reserved', uploaded_at = null, completed_at = null, failed_at = null,
        failure_code = null, linked_entity_type = null, linked_entity_id = null,
        updated_at = pg_catalog.clock_timestamp()
    where id = v_existing.id
    returning id into v_reservation_id;
  end if;

  return query select v_reservation_id, v_object_path, 'reserved'::text;
end;
$$;

revoke all on function public.reserve_attachment_upload(uuid, uuid, bigint, text, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.reserve_attachment_upload(uuid, uuid, bigint, text, uuid)
to service_role;

create or replace function public.mark_attachment_uploaded(p_reservation_id uuid, p_owner_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.attachment_upload_reservations r
  set status = case when r.status = 'completed' then 'completed' else 'uploaded' end,
      uploaded_at = coalesce(r.uploaded_at, pg_catalog.clock_timestamp()),
      failure_code = null,
      updated_at = pg_catalog.clock_timestamp()
  where r.id = p_reservation_id and r.owner_id = p_owner_id
    and r.status in ('reserved', 'uploaded', 'completed')
    and exists (
      select 1 from storage.objects o
      where o.bucket_id = 'vehicle-attachments' and o.name = r.object_path
    );
  return found;
end;
$$;

revoke all on function public.mark_attachment_uploaded(uuid, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.mark_attachment_uploaded(uuid, uuid) to service_role;

create or replace function private.validate_attachment_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.attachment_path is null or (tg_op = 'UPDATE' and new.attachment_path is not distinct from old.attachment_path) then
    return new;
  end if;
  if auth.role() = 'service_role' then
    return new;
  end if;
  if auth.uid() is null or new.owner_id <> auth.uid() or not exists (
    select 1
    from public.attachment_upload_reservations r
    join storage.objects o on o.bucket_id = 'vehicle-attachments' and o.name = r.object_path
    where r.owner_id = auth.uid() and r.vehicle_id = new.vehicle_id
      and r.object_path = new.attachment_path and r.status in ('uploaded', 'completed')
  ) then
    raise exception 'ATTACHMENT_REFERENCE_INVALID';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_attachment_reference()
from public, anon, authenticated, service_role;

create trigger vehicle_documents_validate_attachment
before insert or update of attachment_path on public.vehicle_documents
for each row execute function private.validate_attachment_reference();

create trigger expertise_reports_validate_attachment
before insert or update of attachment_path on public.expertise_reports
for each row execute function private.validate_attachment_reference();

create or replace function public.save_vehicle_document_consistent(
  p_id uuid, p_vehicle_id uuid, p_document_type public.document_type, p_title text,
  p_document_number text, p_issue_date date, p_expiry_date date, p_note text,
  p_attachment_path text
)
returns public.vehicle_documents
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_existing public.vehicle_documents%rowtype;
  v_operation public.attachment_upload_reservations%rowtype;
  v_saved public.vehicle_documents%rowtype;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.vehicles v where v.id = p_vehicle_id and v.owner_id = v_owner_id) then
    raise exception 'ATTACHMENT_VEHICLE_FORBIDDEN';
  end if;

  if p_id is not null then
    select * into v_existing from public.vehicle_documents d
    where d.id = p_id and d.owner_id = v_owner_id and d.vehicle_id = p_vehicle_id for update;
    if not found then raise exception 'DOCUMENT_NOT_FOUND'; end if;
  end if;

  if p_attachment_path is not null and p_attachment_path is distinct from v_existing.attachment_path then
    select * into v_operation from public.attachment_upload_reservations r
    where r.owner_id = v_owner_id and r.vehicle_id = p_vehicle_id
      and r.object_path = p_attachment_path and r.status in ('uploaded', 'completed')
    for update;
    if not found or not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'vehicle-attachments' and o.name = p_attachment_path
    ) then raise exception 'ATTACHMENT_REFERENCE_INVALID'; end if;

    if v_operation.status = 'completed' and v_operation.linked_entity_type = 'vehicle_document' then
      select * into v_saved from public.vehicle_documents d
      where d.id = v_operation.linked_entity_id and d.owner_id = v_owner_id;
      if found and p_id is null then return v_saved; end if;
    end if;
    if v_operation.linked_entity_id is not null
      and (v_operation.linked_entity_type <> 'vehicle_document' or v_operation.linked_entity_id <> p_id) then
      raise exception 'ATTACHMENT_ALREADY_LINKED';
    end if;
  end if;

  if p_id is null then
    insert into public.vehicle_documents (
      vehicle_id, owner_id, document_type, title, document_number,
      issue_date, expiry_date, note, attachment_path
    ) values (
      p_vehicle_id, v_owner_id, p_document_type, pg_catalog.btrim(p_title),
      nullif(pg_catalog.btrim(p_document_number), ''), p_issue_date, p_expiry_date,
      nullif(pg_catalog.btrim(p_note), ''), p_attachment_path
    ) returning * into v_saved;
  else
    update public.vehicle_documents
    set document_type = p_document_type, title = pg_catalog.btrim(p_title),
        document_number = nullif(pg_catalog.btrim(p_document_number), ''),
        issue_date = p_issue_date, expiry_date = p_expiry_date,
        note = nullif(pg_catalog.btrim(p_note), ''), attachment_path = p_attachment_path
    where id = p_id and owner_id = v_owner_id returning * into v_saved;
  end if;

  if p_attachment_path is not null and p_attachment_path is distinct from v_existing.attachment_path then
    update public.attachment_upload_reservations
    set status = 'completed', completed_at = pg_catalog.clock_timestamp(),
        linked_entity_type = 'vehicle_document', linked_entity_id = v_saved.id,
        updated_at = pg_catalog.clock_timestamp()
    where id = v_operation.id;
  end if;
  if v_existing.attachment_path is not null and v_existing.attachment_path is distinct from p_attachment_path then
    perform private.queue_attachment_cleanup(v_owner_id, v_existing.attachment_path);
  end if;
  return v_saved;
end;
$$;

revoke all on function public.save_vehicle_document_consistent(uuid, uuid, public.document_type, text, text, date, date, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.save_vehicle_document_consistent(uuid, uuid, public.document_type, text, text, date, date, text, text)
to authenticated;

create or replace function public.save_expertise_report_consistent(
  p_id uuid, p_vehicle_id uuid, p_report_date date, p_company_name text,
  p_overall_note text, p_report_number text, p_attachment_path text
)
returns public.expertise_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_existing public.expertise_reports%rowtype;
  v_operation public.attachment_upload_reservations%rowtype;
  v_saved public.expertise_reports%rowtype;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.vehicles v where v.id = p_vehicle_id and v.owner_id = v_owner_id) then
    raise exception 'ATTACHMENT_VEHICLE_FORBIDDEN';
  end if;
  if p_id is not null then
    select * into v_existing from public.expertise_reports e
    where e.id = p_id and e.owner_id = v_owner_id and e.vehicle_id = p_vehicle_id for update;
    if not found then raise exception 'EXPERTISE_NOT_FOUND'; end if;
  end if;
  if p_attachment_path is not null and p_attachment_path is distinct from v_existing.attachment_path then
    select * into v_operation from public.attachment_upload_reservations r
    where r.owner_id = v_owner_id and r.vehicle_id = p_vehicle_id
      and r.object_path = p_attachment_path and r.status in ('uploaded', 'completed') for update;
    if not found or not exists (
      select 1 from storage.objects o where o.bucket_id = 'vehicle-attachments' and o.name = p_attachment_path
    ) then raise exception 'ATTACHMENT_REFERENCE_INVALID'; end if;
    if v_operation.status = 'completed' and v_operation.linked_entity_type = 'expertise_report' then
      select * into v_saved from public.expertise_reports e
      where e.id = v_operation.linked_entity_id and e.owner_id = v_owner_id;
      if found and p_id is null then return v_saved; end if;
    end if;
    if v_operation.linked_entity_id is not null
      and (v_operation.linked_entity_type <> 'expertise_report' or v_operation.linked_entity_id <> p_id) then
      raise exception 'ATTACHMENT_ALREADY_LINKED';
    end if;
  end if;

  if p_id is null then
    insert into public.expertise_reports (
      vehicle_id, owner_id, report_date, company_name, overall_note, report_number, attachment_path
    ) values (
      p_vehicle_id, v_owner_id, p_report_date,
      nullif(pg_catalog.btrim(p_company_name), ''),
      nullif(pg_catalog.btrim(p_overall_note), ''),
      nullif(pg_catalog.btrim(p_report_number), ''), p_attachment_path
    ) returning * into v_saved;
  else
    update public.expertise_reports
    set report_date = p_report_date,
        company_name = nullif(pg_catalog.btrim(p_company_name), ''),
        overall_note = nullif(pg_catalog.btrim(p_overall_note), ''),
        report_number = nullif(pg_catalog.btrim(p_report_number), ''),
        attachment_path = p_attachment_path
    where id = p_id and owner_id = v_owner_id returning * into v_saved;
  end if;

  if p_attachment_path is not null and p_attachment_path is distinct from v_existing.attachment_path then
    update public.attachment_upload_reservations
    set status = 'completed', completed_at = pg_catalog.clock_timestamp(),
        linked_entity_type = 'expertise_report', linked_entity_id = v_saved.id,
        updated_at = pg_catalog.clock_timestamp()
    where id = v_operation.id;
  end if;
  if v_existing.attachment_path is not null and v_existing.attachment_path is distinct from p_attachment_path then
    perform private.queue_attachment_cleanup(v_owner_id, v_existing.attachment_path);
  end if;
  return v_saved;
end;
$$;

revoke all on function public.save_expertise_report_consistent(uuid, uuid, date, text, text, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.save_expertise_report_consistent(uuid, uuid, date, text, text, text, text)
to authenticated;

create or replace function public.delete_vehicle_document_consistent(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_owner_id uuid := auth.uid(); v_path text;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select attachment_path into v_path from public.vehicle_documents
  where id = p_id and owner_id = v_owner_id for update;
  if not found then return false; end if;
  delete from public.vehicle_documents where id = p_id and owner_id = v_owner_id;
  perform private.queue_attachment_cleanup(v_owner_id, v_path);
  return true;
end; $$;

revoke all on function public.delete_vehicle_document_consistent(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.delete_vehicle_document_consistent(uuid) to authenticated;

create or replace function public.delete_expertise_report_consistent(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_owner_id uuid := auth.uid(); v_path text;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select attachment_path into v_path from public.expertise_reports
  where id = p_id and owner_id = v_owner_id for update;
  if not found then return false; end if;
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
    select 1 from public.vehicle_documents d
    where d.owner_id = v_owner_id and d.attachment_path = p_object_path
  ) and not exists (
    select 1 from public.expertise_reports e
    where e.owner_id = v_owner_id and e.attachment_path = p_object_path
  ) then
    return false;
  end if;
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

create or replace function public.reconcile_my_attachment_metadata()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_owner_id uuid := auth.uid();
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  return private.reconcile_attachment_metadata(v_owner_id);
end; $$;

revoke all on function public.reconcile_my_attachment_metadata()
from public, anon, authenticated, service_role;
grant execute on function public.reconcile_my_attachment_metadata() to authenticated;

create or replace function public.reconcile_attachment_metadata_for_owner(p_owner_id uuid)
returns integer language sql security definer set search_path = '' as $$
  select private.reconcile_attachment_metadata(p_owner_id);
$$;

revoke all on function public.reconcile_attachment_metadata_for_owner(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.reconcile_attachment_metadata_for_owner(uuid) to service_role;

create or replace function private.is_valid_attachment_reservation(p_object_path text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_owner_id uuid := auth.uid();
begin
  if v_owner_id is null or p_object_path is null then return false; end if;
  return exists (
    select 1 from public.attachment_upload_reservations r
    where r.owner_id = v_owner_id and r.object_path = p_object_path
      and r.status = 'reserved' and r.expires_at > pg_catalog.clock_timestamp()
  );
end; $$;

revoke all on function private.is_valid_attachment_reservation(text)
from public, anon, authenticated, service_role;
grant execute on function private.is_valid_attachment_reservation(text) to authenticated;

comment on function public.save_vehicle_record_atomic(uuid, uuid, uuid, public.record_type, text, numeric, date, integer, numeric, text)
is 'Authenticated-only idempotent record and vehicle mileage transaction.';
comment on table public.attachment_upload_reservations
is 'Stateful, idempotent attachment upload operations: reserved, uploaded, completed, failed, cleanup_required.';
comment on table public.attachment_cleanup_queue
is 'Server-only retry queue for idempotent Storage object cleanup after metadata commits.';
