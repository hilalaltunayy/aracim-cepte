-- ROUND2 physical-device fix: a failed AI provider call must never read as a
-- spent daily quota.
--
-- Two changes to reserve_ai_usage only (commit / release / get_my_ai_usage /
-- max_ai_usage_for_user are already correct and untouched):
--
-- 1. Reservation TTL cut from 2 minutes to 45 seconds. The provider timeout is
--    20s, so 45s is ample for a slow-but-successful commit while a stuck
--    reservation (e.g. a best-effort release that did not land) self-clears
--    within seconds instead of blocking the user for two minutes.
--
-- 2. The "cannot reserve" error is split:
--       AI_MONTHLY_QUOTA_EXCEEDED  -> only when committed usage >= quota
--                                     (a genuinely spent daily quota)
--       AI_USAGE_IN_PROGRESS       -> an in-flight reservation is still holding
--                                     the slot; the quota is NOT spent, retry
--                                     shortly.
--
-- Additive forward change. Applied migrations are not modified.

create or replace function public.reserve_ai_usage(p_operation_id uuid, p_vehicle_id uuid)
returns table(operation_id uuid, used_count integer, monthly_quota integer, period_start date)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_period date := (pg_catalog.now() at time zone 'utc')::date;
  v_used integer;
  v_reserved integer;
  v_quota integer;
  v_existing public.ai_usage_reservations%rowtype;
begin
  if v_user is null or p_operation_id is null or p_vehicle_id is null then
    raise exception 'AI_REQUEST_INVALID';
  end if;
  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id and v.owner_id = v_user and v.archived_at is null
  ) then
    raise exception 'AI_VEHICLE_FORBIDDEN' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user::text || ':ai:' || v_period::text, 0)
  );
  update public.ai_usage_reservations
    set status = 'released', updated_at = pg_catalog.now()
    where user_id = v_user and status = 'reserved' and expires_at <= pg_catalog.now();

  select * into v_existing from public.ai_usage_reservations r
    where r.user_id = v_user and r.operation_id = p_operation_id for update;
  if found then
    if v_existing.vehicle_id <> p_vehicle_id then raise exception 'AI_OPERATION_CONFLICT'; end if;
    if v_existing.status = 'committed' then raise exception 'AI_OPERATION_ALREADY_COMMITTED'; end if;
    if v_existing.status = 'reserved' then raise exception 'AI_OPERATION_IN_PROGRESS'; end if;
    raise exception 'AI_OPERATION_RELEASED';
  end if;

  v_quota := private.max_ai_usage_for_user(v_user);
  select
    count(*) filter (where r.status = 'committed'),
    count(*) filter (where r.status = 'reserved' and r.expires_at > pg_catalog.now())
  into v_used, v_reserved
  from public.ai_usage_reservations r
  where r.user_id = v_user and r.period_start = v_period;

  if v_used >= v_quota then
    raise exception 'AI_MONTHLY_QUOTA_EXCEEDED' using errcode = 'P0001';
  elsif v_used + v_reserved >= v_quota then
    raise exception 'AI_USAGE_IN_PROGRESS' using errcode = 'P0001';
  end if;

  insert into public.ai_usage_reservations(
    user_id, operation_id, vehicle_id, period_start, status, expires_at
  ) values (
    v_user, p_operation_id, p_vehicle_id, v_period, 'reserved',
    pg_catalog.now() + interval '45 seconds'
  );
  return query select p_operation_id, v_used, v_quota, v_period;
end;
$$;

revoke all on function public.reserve_ai_usage(uuid,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.reserve_ai_usage(uuid,uuid) to authenticated;

comment on function public.reserve_ai_usage(uuid,uuid) is
  'Daily AI quota reservation. 45s TTL. AI_MONTHLY_QUOTA_EXCEEDED only when '
  'committed usage is full; AI_USAGE_IN_PROGRESS when a reservation still holds the slot.';
