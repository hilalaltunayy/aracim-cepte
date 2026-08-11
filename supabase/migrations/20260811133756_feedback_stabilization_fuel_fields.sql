-- TASK-020: optional normalized fuel details and total-only fuel records.
-- The existing save_vehicle_record_atomic signature remains available for older clients.

alter table public.vehicle_records
  add column price_per_liter numeric(10,3),
  add column station_brand text;

alter table public.vehicle_records
  drop constraint if exists fuel_requires_liters,
  add constraint vehicle_records_price_per_liter_positive
    check (price_per_liter is null or price_per_liter > 0),
  add constraint vehicle_records_fuel_detail_scope
    check (
      record_type = 'fuel'
      or (liters is null and price_per_liter is null and station_brand is null)
    ),
  add constraint vehicle_records_station_brand_catalog
    check (
      station_brand is null
      or station_brand in (
        'opet', 'shell', 'petrol_ofisi', 'bp', 'totalenergies', 'aytemiz', 'other'
      )
    );

create or replace function private.normalize_vehicle_record_fuel_details()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.record_type <> 'fuel' then
    new.liters := null;
    new.price_per_liter := null;
    new.station_brand := null;
  end if;
  return new;
end;
$$;

revoke all on function private.normalize_vehicle_record_fuel_details()
from public, anon, authenticated, service_role;

create trigger normalize_vehicle_record_fuel_details
  before insert or update of record_type, liters, price_per_liter, station_brand
  on public.vehicle_records
  for each row execute function private.normalize_vehicle_record_fuel_details();

create or replace function public.save_vehicle_record_atomic_v2(
  p_request_id uuid,
  p_vehicle_id uuid,
  p_record_id uuid,
  p_record_type public.record_type,
  p_category text,
  p_amount numeric,
  p_record_date date,
  p_kilometer integer,
  p_liters numeric,
  p_price_per_liter numeric,
  p_station_brand text,
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
    or p_kilometer is not null and p_kilometer < 0
    or p_liters is not null and p_liters <= 0
    or p_price_per_liter is not null and p_price_per_liter <= 0 then
    raise exception 'RECORD_VALIDATION_FAILED';
  end if;
  if p_record_type <> 'fuel'
    and (p_liters is not null or p_price_per_liter is not null or p_station_brand is not null) then
    raise exception 'FUEL_DETAILS_INVALID';
  end if;
  if p_station_brand is not null and p_station_brand not in (
    'opet', 'shell', 'petrol_ofisi', 'bp', 'totalenergies', 'aytemiz', 'other'
  ) then
    raise exception 'FUEL_STATION_INVALID';
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
    coalesce(p_price_per_liter::text, ''),
    coalesce(p_station_brand, ''),
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
      kilometer, liters, price_per_liter, station_brand, description
    ) values (
      v_record_id, p_vehicle_id, v_owner_id, p_record_type, pg_catalog.btrim(p_category),
      p_amount, p_record_date, p_kilometer,
      case when p_record_type = 'fuel' then p_liters else null end,
      case when p_record_type = 'fuel' then p_price_per_liter else null end,
      case when p_record_type = 'fuel' then p_station_brand else null end,
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
        price_per_liter = case when p_record_type = 'fuel' then p_price_per_liter else null end,
        station_brand = case when p_record_type = 'fuel' then p_station_brand else null end,
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

revoke all on function public.save_vehicle_record_atomic_v2(
  uuid, uuid, uuid, public.record_type, text, numeric, date, integer, numeric, numeric, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.save_vehicle_record_atomic_v2(
  uuid, uuid, uuid, public.record_type, text, numeric, date, integer, numeric, numeric, text, text
) to authenticated;

comment on function public.save_vehicle_record_atomic_v2(
  uuid, uuid, uuid, public.record_type, text, numeric, date, integer, numeric, numeric, text, text
) is 'Authenticated-only idempotent fuel-aware record write with owner isolation and monotonic mileage.';
