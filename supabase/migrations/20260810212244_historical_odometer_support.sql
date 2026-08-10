-- V1.1 historical odometer support.
-- Event mileage is an optional observation. vehicles.current_km remains a monotonic, separately
-- stored high-water mark and is never recomputed from record history.

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

comment on function public.save_vehicle_record_atomic(
  uuid, uuid, uuid, public.record_type, text, numeric, date, integer, numeric, text
) is 'Authenticated-only idempotent historical record write with monotonic vehicle mileage.';
