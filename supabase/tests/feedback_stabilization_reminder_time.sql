begin;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('a2000000-0000-4000-8000-000000000021', 'authenticated', 'authenticated',
   'reminder-a@qa.invalid', now(), now(), false, false),
  ('b2000000-0000-4000-8000-000000000021', 'authenticated', 'authenticated',
   'reminder-b@qa.invalid', now(), now(), false, false)
on conflict (id) do nothing;

insert into public.vehicles (id, owner_id, brand, model, current_km, fuel_type, body_type)
values
  ('a2100000-0000-4000-8000-000000000021', 'a2000000-0000-4000-8000-000000000021',
   'QA', 'Reminder A', 1000, 'gasoline', 'sedan'),
  ('b2100000-0000-4000-8000-000000000021', 'b2000000-0000-4000-8000-000000000021',
   'QA', 'Reminder B', 1000, 'gasoline', 'sedan');

insert into public.reminders (
  id, vehicle_id, owner_id, title, reminder_type, due_date, due_time
) values
  ('a2200000-0000-4000-8000-000000000021', 'a2100000-0000-4000-8000-000000000021',
   'a2000000-0000-4000-8000-000000000021', 'Saatli', 'custom', '2026-08-12', '18:30'),
  ('a2200000-0000-4000-8000-000000000022', 'a2100000-0000-4000-8000-000000000021',
   'a2000000-0000-4000-8000-000000000021', 'Legacy', 'custom', '2026-08-10', null),
  ('b2200000-0000-4000-8000-000000000021', 'b2100000-0000-4000-8000-000000000021',
   'b2000000-0000-4000-8000-000000000021', 'Foreign', 'custom', '2026-08-12', '19:00');

select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-000000000021', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a2000000-0000-4000-8000-000000000021","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  v_count integer;
  v_time time;
begin
  select count(*) into v_count from public.reminders
  where id in (
    'a2200000-0000-4000-8000-000000000021',
    'a2200000-0000-4000-8000-000000000022'
  );
  if v_count <> 2 then raise exception 'owner reminder rows were not readable'; end if;

  select due_time into v_time from public.reminders
  where id = 'a2200000-0000-4000-8000-000000000021';
  if v_time <> '18:30'::time then raise exception 'due_time did not persist'; end if;

  select due_time into v_time from public.reminders
  where id = 'a2200000-0000-4000-8000-000000000022';
  if v_time is not null then raise exception 'legacy null due_time was rewritten'; end if;

  select count(*) into v_count from public.reminders
  where id = 'b2200000-0000-4000-8000-000000000021';
  if v_count <> 0 then raise exception 'cross-owner reminder read leaked'; end if;
end
$$;

rollback;
