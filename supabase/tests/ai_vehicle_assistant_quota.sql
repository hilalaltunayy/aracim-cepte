begin;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('a3500000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'ai-free@qa.invalid', now(), now(), false, false),
  ('a3500000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'ai-premium@qa.invalid', now(), now(), false, false);
insert into public.user_entitlements(user_id, plan_id, source)
values ('a3500000-0000-4000-8000-000000000002', 'premium', 'support');
insert into public.vehicles(id, owner_id, brand, model, year, current_km, fuel_type, body_type)
values
  ('a3510000-0000-4000-8000-000000000001', 'a3500000-0000-4000-8000-000000000001', 'Test', 'Free', 2025, 1000, 'gasoline', 'sedan_hatchback'),
  ('a3510000-0000-4000-8000-000000000002', 'a3500000-0000-4000-8000-000000000002', 'Test', 'Premium', 2025, 1000, 'diesel', 'suv_crossover');

select set_config('request.jwt.claim.sub', 'a3500000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a3500000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select * from public.reserve_ai_usage('a3520000-0000-4000-8000-000000000001', 'a3510000-0000-4000-8000-000000000001');
select public.release_ai_usage('a3520000-0000-4000-8000-000000000001');
select * from public.reserve_ai_usage('a3520000-0000-4000-8000-000000000002', 'a3510000-0000-4000-8000-000000000001');
select * from public.commit_ai_usage('a3520000-0000-4000-8000-000000000002');
select * from public.commit_ai_usage('a3520000-0000-4000-8000-000000000002');
do $$
declare blocked boolean := false; used integer;
begin
  begin
    perform public.reserve_ai_usage('a3520000-0000-4000-8000-000000000002', 'a3510000-0000-4000-8000-000000000001');
  exception when others then blocked := sqlerrm like '%AI_OPERATION_ALREADY_COMMITTED%'; end;
  if not blocked then raise exception 'Committed AI operation was replayed'; end if;
  select used_count into used from public.get_my_ai_usage();
  if used <> 1 then raise exception 'Released request consumed quota or committed request was not counted'; end if;
  blocked := false;
  begin
    perform public.reserve_ai_usage('a3520000-0000-4000-8000-000000000003', 'a3510000-0000-4000-8000-000000000001');
  exception when others then blocked := sqlerrm like '%AI_MONTHLY_QUOTA_EXCEEDED%'; end;
  if not blocked then raise exception 'Second successful Free AI request was accepted'; end if;
end $$;

do $$
declare blocked boolean := false; own_count integer;
begin
  if has_table_privilege('authenticated', 'public.ai_usage_reservations', 'INSERT')
    or has_table_privilege('authenticated', 'public.ai_usage_reservations', 'UPDATE')
    or has_table_privilege('authenticated', 'public.ai_usage_reservations', 'DELETE') then
    raise exception 'client can mutate AI usage directly';
  end if;
  if has_function_privilege('anon', 'public.reserve_ai_usage(uuid,uuid)'::regprocedure, 'EXECUTE')
    or has_function_privilege('anon', 'public.commit_ai_usage(uuid)'::regprocedure, 'EXECUTE')
    or has_function_privilege('anon', 'public.release_ai_usage(uuid)'::regprocedure, 'EXECUTE')
    or has_function_privilege('anon', 'public.get_my_ai_usage()'::regprocedure, 'EXECUTE') then
    raise exception 'anon can execute privileged AI quota RPC';
  end if;
  blocked := false;
  begin
    perform public.reserve_ai_usage(pg_catalog.gen_random_uuid(), 'a3510000-0000-4000-8000-000000000002');
  exception when others then blocked := sqlerrm like '%AI_VEHICLE_FORBIDDEN%'; end;
  if not blocked then raise exception 'foreign vehicle accepted for AI quota'; end if;
  select count(*) into own_count from public.ai_usage_reservations
    where user_id = 'a3500000-0000-4000-8000-000000000002';
  if own_count <> 0 then raise exception 'foreign AI usage leaked'; end if;
end $$;

reset role;
select set_config('request.jwt.claim.sub', 'a3500000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"a3500000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select * from public.reserve_ai_usage('a3530000-0000-4000-8000-000000000001', 'a3510000-0000-4000-8000-000000000002');
do $$
declare i integer; blocked boolean := false;
begin
  for i in 2..50 loop
    perform public.reserve_ai_usage(pg_catalog.gen_random_uuid(), 'a3510000-0000-4000-8000-000000000002');
  end loop;
  begin
    perform public.reserve_ai_usage(pg_catalog.gen_random_uuid(), 'a3510000-0000-4000-8000-000000000002');
  exception when others then blocked := sqlerrm like '%AI_MONTHLY_QUOTA_EXCEEDED%'; end;
  if not blocked then raise exception 'Premium AI reservation 51 was accepted'; end if;
end $$;

reset role;
select set_config('request.jwt.claim.sub', 'a3500000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a3500000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare blocked boolean := false;
begin
  begin perform public.commit_ai_usage('a3530000-0000-4000-8000-000000000001');
  exception when others then blocked := sqlerrm like '%AI_RESERVATION_NOT_FOUND%'; end;
  if not blocked then raise exception 'foreign AI reservation commit accepted'; end if;
  if public.release_ai_usage('a3530000-0000-4000-8000-000000000001') then
    raise exception 'foreign AI reservation release accepted';
  end if;
end $$;
reset role;

rollback;
