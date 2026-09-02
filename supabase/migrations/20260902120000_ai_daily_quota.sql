-- REV-008: AI Vehicle Assistant quota moves from a UTC calendar month to a UTC
-- calendar day. Free = 1 successful answer/day, Premium = 10 successful
-- answers/day. Additive forward change: the reservation table, advisory lock,
-- ownership checks and reserve -> commit -> release lifecycle are unchanged; only
-- the accounting period and the per-plan limit change. Applied migrations are
-- not modified. The RPC return column keeps the name `monthly_quota` as an
-- internal wire identifier — it now carries the daily quota.

create or replace function private.max_ai_usage_for_user(p_user_id uuid)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select case private.effective_plan_for_user(p_user_id)
    when 'premium' then 10
    else 1
  end;
$$;

revoke all on function private.max_ai_usage_for_user(uuid)
from public, anon, authenticated, service_role;

comment on function private.max_ai_usage_for_user(uuid) is
  'Server-authoritative daily successful AI answer quota: Free 1, Premium 10.';

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
  if v_used + v_reserved >= v_quota then
    raise exception 'AI_MONTHLY_QUOTA_EXCEEDED' using errcode = 'P0001';
  end if;

  insert into public.ai_usage_reservations(
    user_id, operation_id, vehicle_id, period_start, status, expires_at
  ) values (
    v_user, p_operation_id, p_vehicle_id, v_period, 'reserved', pg_catalog.now() + interval '2 minutes'
  );
  return query select p_operation_id, v_used, v_quota, v_period;
end;
$$;

create or replace function public.commit_ai_usage(p_operation_id uuid)
returns table(used_count integer, monthly_quota integer, period_start date)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_row public.ai_usage_reservations%rowtype;
  v_used integer;
begin
  if v_user is null or p_operation_id is null then raise exception 'AI_REQUEST_INVALID'; end if;
  select * into v_row from public.ai_usage_reservations r
    where r.user_id = v_user and r.operation_id = p_operation_id for update;
  if not found then raise exception 'AI_RESERVATION_NOT_FOUND'; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user::text || ':ai:' || v_row.period_start::text, 0)
  );
  if v_row.status = 'reserved' and v_row.expires_at > pg_catalog.now() then
    update public.ai_usage_reservations
      set status = 'committed', responded_at = pg_catalog.now(), updated_at = pg_catalog.now()
      where id = v_row.id;
  elsif v_row.status <> 'committed' then
    raise exception 'AI_RESERVATION_EXPIRED';
  end if;
  select count(*) into v_used from public.ai_usage_reservations r
    where r.user_id = v_user and r.period_start = v_row.period_start and r.status = 'committed';
  return query select v_used, private.max_ai_usage_for_user(v_user), v_row.period_start;
end;
$$;

create or replace function public.get_my_ai_usage()
returns table(used_count integer, monthly_quota integer, period_start date)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_period date := (pg_catalog.now() at time zone 'utc')::date;
  v_used integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select count(*) into v_used from public.ai_usage_reservations r
    where r.user_id = v_user and r.period_start = v_period and r.status = 'committed';
  return query select v_used, private.max_ai_usage_for_user(v_user), v_period;
end;
$$;

revoke all on function public.reserve_ai_usage(uuid,uuid), public.commit_ai_usage(uuid),
  public.get_my_ai_usage()
  from public, anon, authenticated, service_role;
grant execute on function public.reserve_ai_usage(uuid,uuid), public.commit_ai_usage(uuid),
  public.get_my_ai_usage()
  to authenticated;

comment on table public.ai_usage_reservations is
  'Server-authoritative AI quota lifecycle (UTC day); never stores questions, responses or vehicle context.';
