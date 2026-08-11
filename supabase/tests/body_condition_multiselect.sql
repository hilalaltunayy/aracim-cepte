begin;

do $$
declare
  v_security_definer boolean;
  v_config text[];
  v_rls_enabled boolean;
begin
  if has_function_privilege(
    'anon',
    'public.save_body_part_conditions_atomic(uuid,public.body_type,text,public.body_condition[],text)',
    'EXECUTE'
  ) then raise exception 'anon can execute body condition RPC'; end if;
  if not has_function_privilege(
    'authenticated',
    'public.save_body_part_conditions_atomic(uuid,public.body_type,text,public.body_condition[],text)',
    'EXECUTE'
  ) then raise exception 'authenticated cannot execute body condition RPC'; end if;
  if has_table_privilege('authenticated', 'public.body_part_condition_values', 'INSERT')
    or has_table_privilege('authenticated', 'public.body_part_condition_values', 'UPDATE')
    or has_table_privilege('authenticated', 'public.body_part_condition_values', 'DELETE') then
    raise exception 'authenticated can bypass atomic body condition write';
  end if;
  select procedure.prosecdef, procedure.proconfig
  into v_security_definer, v_config
  from pg_proc procedure
  where procedure.oid = (
    'public.save_body_part_conditions_atomic(uuid,public.body_type,text,public.body_condition[],text)'
  )::regprocedure;
  if not v_security_definer or not ('search_path=""' = any(v_config)) then
    raise exception 'body condition RPC security definer/search_path is unsafe';
  end if;
  select relation.relrowsecurity into v_rls_enabled
  from pg_class relation where relation.oid = 'public.body_part_condition_values'::regclass;
  if not v_rls_enabled then raise exception 'body condition values RLS is disabled'; end if;
end
$$;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('a9100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'body-a@qa.invalid', now(), now(), false, false),
  ('b9100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'body-b@qa.invalid', now(), now(), false, false)
on conflict (id) do nothing;

insert into public.vehicles (id, owner_id, brand, model, current_km, fuel_type, body_type)
values
  ('a9200000-0000-4000-8000-000000000001', 'a9100000-0000-4000-8000-000000000001',
   'QA', 'Body A', 1000, 'gasoline', 'sedan'),
  ('a9200000-0000-4000-8000-000000000003', 'a9100000-0000-4000-8000-000000000001',
   'QA', 'Cascade A', 1000, 'gasoline', 'sedan'),
  ('b9200000-0000-4000-8000-000000000002', 'b9100000-0000-4000-8000-000000000002',
   'QA', 'Body B', 1000, 'gasoline', 'sedan');

-- Existing V1 rows remain untouched and readable as a legacy singleton in the client mapper.
insert into public.body_part_conditions (
  id, vehicle_id, owner_id, schema_type, part_key, condition, condition_set_initialized, note
) values (
  'a9300000-0000-4000-8000-000000000001',
  'a9200000-0000-4000-8000-000000000001',
  'a9100000-0000-4000-8000-000000000001',
  'sedan_hatchback', 'roof', 'painted', false, 'Legacy note'
), (
  'b9300000-0000-4000-8000-000000000002',
  'b9200000-0000-4000-8000-000000000002',
  'b9100000-0000-4000-8000-000000000002',
  'sedan_hatchback', 'hood', 'replaced', true, null
);

insert into public.body_part_condition_values (
  id, body_part_condition_id, vehicle_id, owner_id, condition
) values (
  'b9350000-0000-4000-8000-000000000002',
  'b9300000-0000-4000-8000-000000000002',
  'b9200000-0000-4000-8000-000000000002',
  'b9100000-0000-4000-8000-000000000002',
  'replaced'
);

select set_config('request.jwt.claim.sub', 'a9100000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a9100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  v_parent public.body_part_conditions%rowtype;
  v_count integer;
  v_initialized boolean;
  v_note text;
  v_forbidden boolean := false;
  v_invalid boolean := false;
begin
  select count(*) into v_count
  from public.body_part_condition_values
  where body_part_condition_id = 'a9300000-0000-4000-8000-000000000001';
  if v_count <> 0 then raise exception 'legacy row was rewritten'; end if;
  select condition_set_initialized into v_initialized
  from public.body_part_conditions
  where id = 'a9300000-0000-4000-8000-000000000001';
  if v_initialized then raise exception 'legacy row was marked initialized'; end if;

  select * into v_parent
  from public.save_body_part_conditions_atomic(
    'a9200000-0000-4000-8000-000000000001',
    'sedan_hatchback',
    'roof',
    array['painted', 'damaged']::public.body_condition[],
    'Multi condition'
  );
  select count(*) into v_count
  from public.body_part_condition_values
  where body_part_condition_id = v_parent.id;
  if v_parent.condition <> 'damaged' or v_count <> 2 then
    raise exception 'compatible multi-condition save failed';
  end if;
  select condition_set_initialized into v_initialized
  from public.body_part_conditions where id = v_parent.id;
  if not v_initialized then raise exception 'normalized set marker was not saved'; end if;

  -- Duplicate values are idempotently normalized into one child row each.
  perform public.save_body_part_conditions_atomic(
    'a9200000-0000-4000-8000-000000000001',
    'sedan_hatchback',
    'roof',
    array['damaged', 'painted', 'damaged']::public.body_condition[],
    'Multi condition'
  );
  select count(*) into v_count
  from public.body_part_condition_values
  where body_part_condition_id = v_parent.id;
  if v_count <> 2 then raise exception 'duplicate condition was persisted'; end if;

  begin
    perform public.save_body_part_conditions_atomic(
      'a9200000-0000-4000-8000-000000000001', 'sedan_hatchback', 'roof',
      array['painted', 'replaced']::public.body_condition[], null
    );
  exception when others then
    v_invalid := sqlerrm like '%BODY_CONDITION_PRIMARY_CONFLICT%';
  end;
  if not v_invalid then raise exception 'conflicting primary conditions were accepted'; end if;

  v_invalid := false;
  begin
    perform public.save_body_part_conditions_atomic(
      'a9200000-0000-4000-8000-000000000001', 'sedan_hatchback', 'roof',
      array['unknown', 'damaged']::public.body_condition[], null
    );
  exception when others then
    v_invalid := sqlerrm like '%BODY_CONDITION_UNKNOWN_EXCLUSIVE%';
  end;
  if not v_invalid then raise exception 'unknown compatibility rule was bypassed'; end if;

  begin
    perform public.save_body_part_conditions_atomic(
      'b9200000-0000-4000-8000-000000000002', 'sedan_hatchback', 'hood',
      array['original']::public.body_condition[], null
    );
  exception when others then
    v_forbidden := sqlerrm like '%BODY_CONDITION_VEHICLE_FORBIDDEN%';
  end;
  if not v_forbidden then raise exception 'cross-owner RPC write was allowed'; end if;

  select count(*) into v_count
  from public.body_part_conditions
  where id = 'b9300000-0000-4000-8000-000000000002';
  if v_count <> 0 then raise exception 'cross-owner parent read leaked'; end if;
  select count(*) into v_count
  from public.body_part_condition_values
  where owner_id = 'b9100000-0000-4000-8000-000000000002';
  if v_count <> 0 then raise exception 'cross-owner child read leaked'; end if;
  update public.body_part_conditions set condition = 'original'
  where id = 'b9300000-0000-4000-8000-000000000002';
  if found then raise exception 'cross-owner parent update succeeded'; end if;
  delete from public.body_part_conditions
  where id = 'b9300000-0000-4000-8000-000000000002';
  if found then raise exception 'cross-owner parent delete succeeded'; end if;

  update public.body_part_conditions set condition = 'original'
  where id = v_parent.id;
  select count(*) into v_count
  from public.body_part_condition_values
  where body_part_condition_id = v_parent.id;
  if v_count <> 0 then raise exception 'legacy write did not clear normalized children'; end if;
  select condition_set_initialized into v_initialized
  from public.body_part_conditions where id = v_parent.id;
  if v_initialized then raise exception 'legacy write did not restore singleton mode'; end if;

  perform public.save_body_part_conditions_atomic(
    'a9200000-0000-4000-8000-000000000001', 'sedan_hatchback', 'roof',
    array[]::public.body_condition[], 'Cleared note'
  );
  select count(*) into v_count
  from public.body_part_conditions where id = v_parent.id;
  select condition_set_initialized and condition = 'unknown', note
  into v_initialized, v_note
  from public.body_part_conditions where id = v_parent.id;
  if v_count <> 1 or not v_initialized or v_note <> 'Cleared note' then
    raise exception 'clear did not persist an explicit empty set';
  end if;
  select count(*) into v_count
  from public.body_part_condition_values where body_part_condition_id = v_parent.id;
  if v_count <> 0 then raise exception 'clear left child values'; end if;

  select * into v_parent
  from public.save_body_part_conditions_atomic(
    'a9200000-0000-4000-8000-000000000003', 'sedan_hatchback', 'hood',
    array['original', 'damaged']::public.body_condition[], null
  );
  delete from public.vehicles where id = 'a9200000-0000-4000-8000-000000000003';
  select count(*) into v_count
  from public.body_part_condition_values where body_part_condition_id = v_parent.id;
  if v_count <> 0 then raise exception 'vehicle cascade left child values'; end if;
end
$$;

rollback;
