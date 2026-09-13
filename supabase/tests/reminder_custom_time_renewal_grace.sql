-- TASK-013: a Premium account must be able to persist a real custom reminder time.
--
-- The reminder trigger's only entitlement gate is private.effective_plan_for_user(auth.uid()),
-- the same helper the vehicle capacity path uses. TASK-012 fixed that helper's input data
-- (valid_until now carries a renewal grace instead of hard-expiring at the billing-period
-- end), so this test pins the reminder path to the same guarantee: an actively auto-renewing
-- subscription whose period end has passed can still write a custom time, while Free and a
-- genuinely expired subscription still cannot.
begin;

-- The deployed trigger must keep its security context and its canonical entitlement source.
do $$
declare v_definer boolean; v_config text[]; v_body text;
begin
  select prosecdef, proconfig, pg_get_functiondef(oid)
    into v_definer, v_config, v_body
  from pg_proc where oid = 'public.enforce_reminder_due_time_entitlement()'::regprocedure;
  if not v_definer or not ('search_path=""' = any(v_config)) then
    raise exception 'reminder entitlement trigger security context is unsafe';
  end if;
  if v_body not like '%private.effective_plan_for_user%' then
    raise exception 'reminder trigger no longer uses the canonical entitlement helper';
  end if;
  if v_body not like '%REMINDER_OWNER_MISMATCH%' then
    raise exception 'reminder trigger lost its ownership assertion';
  end if;
  if not exists (
    select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
    where c.oid = 'public.reminders'::regclass
      and t.tgname = 'reminders_enforce_due_time_entitlement'
      and t.tgenabled <> 'D'
  ) then
    raise exception 'reminder entitlement trigger is missing or disabled';
  end if;
end $$;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('c1300000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'reminder-premium@qa.invalid', now(), now(), false, false),
  ('c1300000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'reminder-free@qa.invalid', now(), now(), false, false);

-- User 1: the TASK-012 shape -- active, auto-renewing, current period already ended.
select public.process_revenuecat_subscription_event(
  'evt-r13-premium', 'c1300000-0000-4000-8000-000000000001', 'RENEWAL', 'active',
  'premium_monthly:monthly', now() - interval '5 minutes', true, now() - interval '8 minutes', 'SANDBOX');

-- User 2: genuinely finished, well beyond the grace.
select public.process_revenuecat_subscription_event(
  'evt-r13-free', 'c1300000-0000-4000-8000-000000000002', 'RENEWAL', 'active',
  'premium_monthly:monthly', now() - interval '3 hours', true, now() - interval '3 hours', 'SANDBOX');

do $$
begin
  if private.effective_plan_for_user('c1300000-0000-4000-8000-000000000001') <> 'premium'
    or private.max_vehicles_for_user('c1300000-0000-4000-8000-000000000001') <> 3 then
    raise exception 'renewing Premium was not recognised (TASK-012 regression)';
  end if;
  if private.effective_plan_for_user('c1300000-0000-4000-8000-000000000002') <> 'free' then
    raise exception 'a genuinely expired subscription kept Premium';
  end if;
end $$;

-- ---------------------------------------------------------------- Premium path
set local role authenticated;
set local request.jwt.claims = '{"sub":"c1300000-0000-4000-8000-000000000001","role":"authenticated"}';

select public.create_vehicle_with_limit('Volkswagen','Golf',2018,'34 RRR 001',10000,'gasoline','hatchback',null,'white');

-- The exact failing device payload: a future date with a custom 22:30 notification time.
insert into public.reminders (vehicle_id, owner_id, title, reminder_type, due_date, due_time)
select v.id, v.owner_id, 'Periyodik bakım', 'periodic_maintenance', date '2026-09-25', time '22:30'
from public.vehicles v where v.owner_id = 'c1300000-0000-4000-8000-000000000001';

do $$
declare v_time time;
begin
  select due_time into v_time from public.reminders
  where owner_id = 'c1300000-0000-4000-8000-000000000001';
  if v_time is distinct from time '22:30' then
    raise exception 'Premium custom reminder time was not persisted (got %)', v_time;
  end if;
end $$;

-- Editing an unrelated field must not disturb the stored custom time.
update public.reminders set title = 'Periyodik bakım (güncel)'
where owner_id = 'c1300000-0000-4000-8000-000000000001';

-- Changing to another custom time must also succeed.
update public.reminders set due_time = time '07:45'
where owner_id = 'c1300000-0000-4000-8000-000000000001';

do $$
declare v_time time; v_title text;
begin
  select due_time, title into v_time, v_title from public.reminders
  where owner_id = 'c1300000-0000-4000-8000-000000000001';
  if v_time is distinct from time '07:45' then
    raise exception 'Premium custom reminder time could not be changed (got %)', v_time;
  end if;
  if v_title <> 'Periyodik bakım (güncel)' then
    raise exception 'unrelated reminder edit did not persist';
  end if;
end $$;
reset role;

-- ------------------------------------------------------------------- Free path
set local role authenticated;
set local request.jwt.claims = '{"sub":"c1300000-0000-4000-8000-000000000002","role":"authenticated"}';

select public.create_vehicle_with_limit('Fiat','Egea',2017,'01 RRR 002',20000,'gasoline','sedan',null,'gray');

-- No time at all, and the Free default, both remain allowed.
insert into public.reminders (vehicle_id, owner_id, title, reminder_type, due_date, due_time)
select v.id, v.owner_id, 'Kilometre planı', 'periodic_maintenance', date '2026-09-25', null
from public.vehicles v where v.owner_id = 'c1300000-0000-4000-8000-000000000002';

insert into public.reminders (vehicle_id, owner_id, title, reminder_type, due_date, due_time)
select v.id, v.owner_id, 'Varsayılan saat', 'periodic_maintenance', date '2026-09-25', time '09:00'
from public.vehicles v where v.owner_id = 'c1300000-0000-4000-8000-000000000002';

do $$
declare v_blocked boolean := false; v_vehicle uuid;
begin
  select id into v_vehicle from public.vehicles where owner_id = 'c1300000-0000-4000-8000-000000000002';
  begin
    insert into public.reminders (vehicle_id, owner_id, title, reminder_type, due_date, due_time)
    values (v_vehicle, 'c1300000-0000-4000-8000-000000000002', 'Özel saat', 'periodic_maintenance', date '2026-09-25', time '22:30');
  exception when others then
    if sqlerrm like '%CUSTOM_REMINDER_TIME_PREMIUM_REQUIRED%' then v_blocked := true; else raise; end if;
  end;
  if not v_blocked then
    raise exception 'a Free account created a new custom reminder time';
  end if;
end $$;
reset role;

-- ------------------------------------------- Premium expiry keeps stored data safe
-- The subscription genuinely ends: a NEW custom time must be refused, but the custom
-- time already stored on the existing reminder must survive an unrelated edit.
select public.process_revenuecat_subscription_event(
  'evt-r13-expired', 'c1300000-0000-4000-8000-000000000001', 'EXPIRATION', 'expired',
  'premium_monthly:monthly', now() - interval '1 minute', false, now(), 'SANDBOX');

do $$
begin
  if private.effective_plan_for_user('c1300000-0000-4000-8000-000000000001') <> 'free' then
    raise exception 'expiry did not demote the account';
  end if;
end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"c1300000-0000-4000-8000-000000000001","role":"authenticated"}';

-- Unrelated edit on a downgraded account: the stored 07:45 is retained, not corrupted.
update public.reminders set title = 'Düşüş sonrası'
where owner_id = 'c1300000-0000-4000-8000-000000000001';

do $$
declare v_time time; v_blocked boolean := false;
begin
  select due_time into v_time from public.reminders
  where owner_id = 'c1300000-0000-4000-8000-000000000001';
  if v_time is distinct from time '07:45' then
    raise exception 'a downgrade corrupted an existing custom reminder time (got %)', v_time;
  end if;
  begin
    update public.reminders set due_time = time '23:15'
    where owner_id = 'c1300000-0000-4000-8000-000000000001';
  exception when others then
    if sqlerrm like '%CUSTOM_REMINDER_TIME_PREMIUM_REQUIRED%' then v_blocked := true; else raise; end if;
  end;
  if not v_blocked then
    raise exception 'a downgraded account changed to a new custom reminder time';
  end if;
end $$;

-- Ownership is still asserted independently of any plan.
do $$
declare v_blocked boolean := false; v_vehicle uuid;
begin
  select id into v_vehicle from public.vehicles where owner_id = 'c1300000-0000-4000-8000-000000000001';
  begin
    insert into public.reminders (vehicle_id, owner_id, title, reminder_type, due_date, due_time)
    values (v_vehicle, 'c1300000-0000-4000-8000-000000000002', 'Başkasının kaydı', 'periodic_maintenance', date '2026-09-25', null);
  exception when others then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'a reminder was written for another owner';
  end if;
end $$;
reset role;

select
  'TASK-013 REMINDER CUSTOM TIME: PASS'                                        as result,
  (select due_time::text from public.reminders
     where owner_id = 'c1300000-0000-4000-8000-000000000001')                  as premium_persisted_due_time,
  (select count(*) from public.reminders
     where owner_id = 'c1300000-0000-4000-8000-000000000002')                  as free_reminders_allowed;

rollback;
