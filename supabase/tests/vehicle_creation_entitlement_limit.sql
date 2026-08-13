begin;

do $$
declare
  v_definer boolean;
  v_config text[];
begin
  select prosecdef, proconfig into v_definer, v_config
  from pg_proc where oid = 'public.create_vehicle_with_limit(text, text, integer, text, integer, public.fuel_type, public.body_type, text, text)'::regprocedure;
  if not v_definer or not ('search_path=""' = any(v_config)) then
    raise exception 'vehicle creation function has unsafe execution context';
  end if;
  if has_function_privilege('anon', 'public.create_vehicle_with_limit(text, text, integer, text, integer, public.fuel_type, public.body_type, text, text)', 'EXECUTE') then
    raise exception 'anon can create vehicles';
  end if;
  if has_function_privilege('authenticated', 'private.max_vehicles_for_user(uuid)', 'EXECUTE') then
    raise exception 'client can call the private vehicle capacity resolver';
  end if;
  if has_table_privilege('authenticated', 'public.vehicles', 'INSERT') then
    raise exception 'authenticated direct vehicle insert bypass remains open';
  end if;
  if pg_get_functiondef('public.create_vehicle_with_limit(text, text, integer, text, integer, public.fuel_type, public.body_type, text, text)'::regprocedure) not like '%pg_advisory_xact_lock%' then
    raise exception 'concurrent create guard is missing';
  end if;
end $$;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('a2900000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'vehicle-limit-a@qa.invalid', now(), now(), false, false),
  ('b2900000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'vehicle-limit-b@qa.invalid', now(), now(), false, false)
on conflict (id) do nothing;

select set_config('request.jwt.claim.sub', 'a2900000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a2900000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare v_blocked boolean := false;
begin
  begin
    perform public.create_vehicle_with_limit('Kia', 'Sportage', 2024, '42 QA 000', -1, 'gasoline', 'sedan_hatchback', 'Beyaz', 'white');
  exception when others then v_blocked := sqlerrm like '%INVALID_CURRENT_KM%'; end;
  if not v_blocked then raise exception 'negative current mileage was accepted'; end if;
end $$;

select public.create_vehicle_with_limit('Kia', 'Sportage', 2024, '42 QA 001', 12000, 'gasoline', 'sedan_hatchback', 'Beyaz', 'white');
do $$
declare v_blocked boolean := false;
begin
  begin
    perform public.create_vehicle_with_limit('Toyota', 'Corolla', 2025, '42 QA 002', 100, 'gasoline', 'sedan_hatchback', 'Gri', 'gray');
  exception when others then
    v_blocked := sqlerrm like '%VEHICLE_LIMIT_REACHED%';
  end;
  if not v_blocked then raise exception 'Free user created a second vehicle'; end if;
end $$;

reset role;
insert into public.user_entitlements (user_id, plan_id, source, valid_until)
values ('a2900000-0000-4000-8000-000000000001', 'premium', 'support', now() + interval '1 day');
set local role authenticated;
select public.create_vehicle_with_limit('Toyota', 'Corolla', 2025, '42 QA 002', 100, 'gasoline', 'sedan_hatchback', 'Gri', 'gray');
select public.create_vehicle_with_limit('Honda', 'Civic', 2023, '42 QA 003', 500, 'gasoline', 'sedan_hatchback', 'Mavi', 'blue');
do $$
declare v_blocked boolean := false; v_count integer;
begin
  begin
    perform public.create_vehicle_with_limit('Ford', 'Focus', 2022, '42 QA 004', 600, 'diesel', 'sedan_hatchback', 'Siyah', 'black');
  exception when others then v_blocked := sqlerrm like '%VEHICLE_LIMIT_REACHED%'; end;
  select count(*) into v_count from public.vehicles where owner_id = auth.uid() and archived_at is null;
  if not v_blocked or v_count <> 3 then raise exception 'Premium capacity was not exactly three'; end if;
end $$;

reset role;
select set_config('request.jwt.claim.sub', 'b2900000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"b2900000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.create_vehicle_with_limit('Renault', 'Clio', 2021, '42 QB 001', 1000, 'gasoline', 'sedan_hatchback', 'Kırmızı', 'red');
do $$
declare v_count integer; v_direct_insert_blocked boolean := false;
begin
  select count(*) into v_count from public.vehicles;
  if v_count <> 1 then raise exception 'cross-user vehicle rows leaked'; end if;
  begin
    insert into public.vehicles (owner_id, brand, model, current_km, fuel_type, body_type)
    values (auth.uid(), 'Bypass', 'Attempt', 0, 'gasoline', 'sedan_hatchback');
  exception when insufficient_privilege then v_direct_insert_blocked := true; end;
  if not v_direct_insert_blocked then raise exception 'direct client creation bypassed RPC'; end if;
end $$;

rollback;
