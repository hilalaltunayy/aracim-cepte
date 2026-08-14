begin;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values ('a3300000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'reminder-preferences@qa.invalid', now(), now(), false, false)
on conflict (id) do nothing;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values ('c3300000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'premium-reminder-preferences@qa.invalid', now(), now(), false, false)
on conflict (id) do nothing;

insert into public.vehicles (id, owner_id, brand, model, current_km, fuel_type, body_type)
values ('a3300000-0000-4000-8000-000000000002', 'a3300000-0000-4000-8000-000000000001',
  'QA', 'Reminder Preferences', 1000, 'gasoline', 'sedan')
on conflict (id) do nothing;

insert into public.vehicles (id, owner_id, brand, model, current_km, fuel_type, body_type)
values ('c3300000-0000-4000-8000-000000000002', 'c3300000-0000-4000-8000-000000000001',
  'QA', 'Premium Reminder Preferences', 1000, 'gasoline', 'sedan')
on conflict (id) do nothing;

insert into public.user_entitlements (user_id, plan_id, source)
values ('c3300000-0000-4000-8000-000000000001', 'premium', 'support')
on conflict (user_id) do update set plan_id = excluded.plan_id, valid_until = null;

insert into public.reminders (id, vehicle_id, owner_id, title, reminder_type, due_date, due_time)
values ('a3300000-0000-4000-8000-000000000003', 'a3300000-0000-4000-8000-000000000002',
  'a3300000-0000-4000-8000-000000000001', 'Existing premium time', 'custom', '2040-08-14', '18:30')
on conflict (id) do nothing;

select set_config('request.jwt.claim.sub', 'a3300000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims',
  '{"sub":"a3300000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  begin
    insert into public.reminders (vehicle_id, owner_id, title, reminder_type, due_date, due_time)
    values ('a3300000-0000-4000-8000-000000000002', auth.uid(), 'Blocked', 'custom', '2040-08-15', '14:30');
    raise exception 'Free user inserted a custom reminder time';
  exception when others then
    if sqlerrm not like '%CUSTOM_REMINDER_TIME_PREMIUM_REQUIRED%' then raise; end if;
  end;

  update public.reminders set due_date = '2040-08-16'
  where id = 'a3300000-0000-4000-8000-000000000003';

  if not exists (
    select 1 from public.reminders
    where id = 'a3300000-0000-4000-8000-000000000003' and due_time = '18:30'::time
  ) then
    raise exception 'Downgraded existing custom reminder time was not retained';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'c3300000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims',
  '{"sub":"c3300000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
begin
  insert into public.reminders (vehicle_id, owner_id, title, reminder_type, due_date, due_time)
  values ('c3300000-0000-4000-8000-000000000002', auth.uid(), 'Premium allowed', 'custom', '2040-08-15', '14:30');
  if not exists (
    select 1 from public.reminders
    where owner_id = auth.uid() and title = 'Premium allowed' and due_time = '14:30'::time
  ) then
    raise exception 'Premium custom reminder time was not retained';
  end if;
end;
$$;

rollback;
