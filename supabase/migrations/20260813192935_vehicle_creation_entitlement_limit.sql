-- TASK-029: vehicle creation is quota-sensitive and must not trust a mobile client plan snapshot.
-- Existing vehicles remain readable/editable after a downgrade; only new inserts are limited.
create or replace function private.max_vehicles_for_user(p_user_id uuid)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select case private.effective_plan_for_user(p_user_id)
    when 'premium' then 3
    else 1
  end;
$$;

revoke all on function private.max_vehicles_for_user(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.create_vehicle_with_limit(
  p_brand text,
  p_model text,
  p_year integer,
  p_plate text,
  p_current_km integer,
  p_fuel_type public.fuel_type,
  p_body_type public.body_type,
  p_color text,
  p_color_id text
)
returns public.vehicles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_limit integer;
  v_vehicle public.vehicles;
begin
  if v_owner_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_current_km is null or p_current_km < 0 then
    raise exception 'INVALID_CURRENT_KM';
  end if;

  -- Serializes create attempts per authenticated owner without blocking other owners.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_owner_id::text, 0));
  v_limit := private.max_vehicles_for_user(v_owner_id);

  if (
    select count(*)
    from public.vehicles
    where owner_id = v_owner_id and archived_at is null
  ) >= v_limit then
    raise exception 'VEHICLE_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  insert into public.vehicles (
    owner_id, brand, model, year, plate, current_km, fuel_type, body_type, color, color_id, archived_at
  ) values (
    v_owner_id,
    pg_catalog.btrim(p_brand),
    pg_catalog.btrim(p_model),
    p_year,
    nullif(pg_catalog.btrim(p_plate), ''),
    p_current_km,
    p_fuel_type,
    p_body_type,
    nullif(pg_catalog.btrim(p_color), ''),
    p_color_id,
    null
  ) returning * into v_vehicle;

  return v_vehicle;
end;
$$;

-- Direct authenticated inserts could otherwise bypass the entitlement check. Updates remain owner-RLS scoped.
revoke insert on table public.vehicles from public, anon, authenticated;
grant insert on table public.vehicles to service_role;
revoke all on function public.create_vehicle_with_limit(
  text, text, integer, text, integer, public.fuel_type, public.body_type, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.create_vehicle_with_limit(
  text, text, integer, text, integer, public.fuel_type, public.body_type, text, text
) to authenticated;

comment on function public.create_vehicle_with_limit(
  text, text, integer, text, integer, public.fuel_type, public.body_type, text, text
) is 'Authenticated owner-only vehicle creation with transaction-safe Free/Premium vehicle capacity enforcement.';
comment on function private.max_vehicles_for_user(uuid) is
  'Private server-side vehicle capacity resolver. Client plan snapshots are never authoritative.';

create index if not exists vehicles_owner_active_idx
  on public.vehicles (owner_id) where archived_at is null;
