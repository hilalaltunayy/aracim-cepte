-- TASK-012: an actively auto-renewing subscription must stay Premium across the
-- billing-period boundary, all the way through to create_vehicle_with_limit.
--
-- This is the regression test for the P0 where a real Premium account could not add a
-- second vehicle: the mirror stored valid_until = the current period end, so every gap
-- between a period end and the next RENEWAL webhook made the server answer Free.
begin;

-- Security context of the new helpers must match the rest of the private schema.
do $$
declare v_definer boolean; v_config text[];
begin
  select prosecdef, proconfig into v_definer, v_config
  from pg_proc where oid = 'private.revenuecat_entitlement_window(text,timestamptz,boolean)'::regprocedure;
  if v_definer or not ('search_path=""' = any(v_config)) then
    raise exception 'entitlement window helper security context is unsafe';
  end if;
  if has_function_privilege('anon', 'private.revenuecat_entitlement_window(text,timestamptz,boolean)', 'EXECUTE')
    or has_function_privilege('authenticated', 'private.revenuecat_entitlement_window(text,timestamptz,boolean)', 'EXECUTE')
    or has_function_privilege('anon', 'private.revenuecat_renewal_grace()', 'EXECUTE')
    or has_function_privilege('authenticated', 'private.revenuecat_renewal_grace()', 'EXECUTE') then
    raise exception 'renewal grace helpers are client callable';
  end if;
end $$;

-- The window rule itself.
do $$
declare v_grace interval := private.revenuecat_renewal_grace();
begin
  -- Auto-renewing: the period end is NOT the entitlement end.
  if private.revenuecat_entitlement_window('active', timestamptz '2026-09-12 10:00:00+00', true)
     <> timestamptz '2026-09-12 10:00:00+00' + v_grace then
    raise exception 'auto-renewing subscription did not receive the renewal grace';
  end if;
  -- Nothing will renew it: the period end is final.
  if private.revenuecat_entitlement_window('active', timestamptz '2026-09-12 10:00:00+00', false)
     <> timestamptz '2026-09-12 10:00:00+00'
   or private.revenuecat_entitlement_window('cancelled', timestamptz '2026-09-12 10:00:00+00', true)
     <> timestamptz '2026-09-12 10:00:00+00'
   or private.revenuecat_entitlement_window('billing_issue', timestamptz '2026-09-12 10:00:00+00', true)
     <> timestamptz '2026-09-12 10:00:00+00' then
    raise exception 'a non-renewing subscription was granted a grace it must not get';
  end if;
  -- A lifetime entitlement still has no scheduled end.
  if private.revenuecat_entitlement_window('active', null, true) is not null then
    raise exception 'lifetime entitlement acquired an end date';
  end if;
end $$;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('c1200000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'grace-renewing@qa.invalid', now(), now(), false, false),
  ('c1200000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'grace-expired@qa.invalid', now(), now(), false, false),
  ('c1200000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'grace-cancelled@qa.invalid', now(), now(), false, false);

-- The exact failing shape: an active auto-renewing subscription whose current period
-- ended five minutes ago because the RENEWAL event has not landed yet.
select public.process_revenuecat_subscription_event(
  'evt-grace-renewing', 'c1200000-0000-4000-8000-000000000001', 'RENEWAL', 'active',
  'premium_monthly:monthly', now() - interval '5 minutes', true, now() - interval '8 minutes', 'SANDBOX');

-- A genuinely finished subscription: period ended well beyond the grace.
select public.process_revenuecat_subscription_event(
  'evt-grace-expired', 'c1200000-0000-4000-8000-000000000002', 'RENEWAL', 'active',
  'premium_monthly:monthly', now() - interval '3 hours', true, now() - interval '3 hours', 'SANDBOX');

-- Cancelled inside the grace window: no renewal is coming, so it must end on time.
select public.process_revenuecat_subscription_event(
  'evt-grace-cancelled', 'c1200000-0000-4000-8000-000000000003', 'CANCELLATION', 'cancelled',
  'premium_monthly:monthly', now() - interval '5 minutes', false, now() - interval '5 minutes', 'SANDBOX');

do $$
begin
  -- The fix: renewal latency no longer demotes a paying subscriber.
  if private.effective_plan_for_user('c1200000-0000-4000-8000-000000000001') <> 'premium' then
    raise exception 'an actively renewing subscriber was demoted at the period boundary';
  end if;
  if private.max_vehicles_for_user('c1200000-0000-4000-8000-000000000001') <> 3 then
    raise exception 'renewing Premium did not get the Premium vehicle capacity';
  end if;
  -- And a real expiry still demotes, with Free capacity.
  if private.effective_plan_for_user('c1200000-0000-4000-8000-000000000002') <> 'free'
    or private.max_vehicles_for_user('c1200000-0000-4000-8000-000000000002') <> 1 then
    raise exception 'a genuinely expired subscription kept Premium';
  end if;
  if private.effective_plan_for_user('c1200000-0000-4000-8000-000000000003') <> 'free'
    or private.max_vehicles_for_user('c1200000-0000-4000-8000-000000000003') <> 1 then
    raise exception 'a cancelled subscription was extended past its paid period';
  end if;
  -- The grace is bounded and recorded, not open-ended.
  if exists (
    select 1 from public.user_entitlements
    where user_id = 'c1200000-0000-4000-8000-000000000001'
      and (plan_id <> 'premium'
           or valid_until is null
           or valid_until > now() + private.revenuecat_renewal_grace())
  ) then
    raise exception 'renewing entitlement window is missing or unbounded';
  end if;
end $$;

-- End to end through the real create RPC, as the real authenticated user.
set local role authenticated;
set local request.jwt.claims = '{"sub":"c1200000-0000-4000-8000-000000000001","role":"authenticated"}';

select public.create_vehicle_with_limit('Volkswagen','Golf',2018,'34 AAA 001',10000,'gasoline','hatchback',null,'white');
select public.create_vehicle_with_limit('Volkswagen','Jetta',2018,'42 ABC 052',20000,'gasoline','sedan',null,'blue');
select public.create_vehicle_with_limit('Volkswagen','Passat',2019,'06 BBB 003',30000,'gasoline','sedan',null,'black');

do $$
declare v_count integer; v_blocked boolean := false;
begin
  select count(*) into v_count from public.vehicles
  where owner_id = 'c1200000-0000-4000-8000-000000000001' and archived_at is null;
  if v_count <> 3 then
    raise exception 'renewing Premium could not create three vehicles (got %)', v_count;
  end if;
  begin
    perform public.create_vehicle_with_limit('Volkswagen','Polo',2020,'35 CCC 004',40000,'gasoline','hatchback',null,'red');
  exception when others then
    if sqlerrm like '%VEHICLE_LIMIT_REACHED%' then v_blocked := true; else raise; end if;
  end;
  if not v_blocked then
    raise exception 'a fourth vehicle was allowed above the Premium limit of 3';
  end if;
end $$;

reset role;

-- Free stays Free: one vehicle only.
set local role authenticated;
set local request.jwt.claims = '{"sub":"c1200000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.create_vehicle_with_limit('Fiat','Egea',2017,'01 DDD 005',50000,'gasoline','sedan',null,'gray');
do $$
declare v_blocked boolean := false;
begin
  begin
    perform public.create_vehicle_with_limit('Fiat','Panda',2016,'01 EEE 006',60000,'gasoline','hatchback',null,'white');
  exception when others then
    if sqlerrm like '%VEHICLE_LIMIT_REACHED%' then v_blocked := true; else raise; end if;
  end;
  if not v_blocked then
    raise exception 'a Free account created a second vehicle';
  end if;
end $$;
reset role;

-- Account isolation: the renewing user's Premium never leaks to another account.
do $$
begin
  if private.effective_plan_for_user('c1200000-0000-4000-8000-000000000003') = 'premium' then
    raise exception 'entitlement leaked across accounts';
  end if;
end $$;

-- Explicit, auditable result. Every assertion above raises on failure, so reaching
-- this row at all is the pass signal; the values make the proof readable.
select
  'TASK-012 RENEWAL GRACE: PASS'                                              as result,
  private.effective_plan_for_user('c1200000-0000-4000-8000-000000000001')     as renewing_plan,
  private.max_vehicles_for_user('c1200000-0000-4000-8000-000000000001')       as renewing_max_vehicles,
  (select count(*) from public.vehicles
     where owner_id='c1200000-0000-4000-8000-000000000001' and archived_at is null)
                                                                              as renewing_vehicles_created,
  private.effective_plan_for_user('c1200000-0000-4000-8000-000000000002')     as expired_plan,
  private.max_vehicles_for_user('c1200000-0000-4000-8000-000000000002')       as expired_max_vehicles,
  private.effective_plan_for_user('c1200000-0000-4000-8000-000000000003')     as cancelled_plan;

rollback;
