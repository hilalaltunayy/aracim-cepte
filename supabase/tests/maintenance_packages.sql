begin;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.save_maintenance_record_atomic(uuid,uuid,uuid,text,numeric,date,integer,text,text[])',
    'EXECUTE'
  ) then raise exception 'anon can execute maintenance RPC'; end if;
  if not has_function_privilege(
    'authenticated',
    'public.save_maintenance_record_atomic(uuid,uuid,uuid,text,numeric,date,integer,text,text[])',
    'EXECUTE'
  ) then raise exception 'authenticated cannot execute maintenance RPC'; end if;
  if has_table_privilege('authenticated', 'public.maintenance_items', 'INSERT') then
    raise exception 'authenticated can bypass atomic maintenance item write';
  end if;
end
$$;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('a7100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'maintenance-a@qa.invalid', now(), now(), false, false),
  ('b7100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'maintenance-b@qa.invalid', now(), now(), false, false)
on conflict (id) do nothing;

insert into public.vehicles (id, owner_id, brand, model, current_km, fuel_type, body_type)
values
  ('a7200000-0000-4000-8000-000000000001', 'a7100000-0000-4000-8000-000000000001',
   'QA', 'Maintenance A', 150000, 'gasoline', 'sedan_hatchback'),
  ('b7200000-0000-4000-8000-000000000002', 'b7100000-0000-4000-8000-000000000002',
   'QA', 'Maintenance B', 90000, 'gasoline', 'sedan_hatchback');

insert into public.vehicle_records (
  id, vehicle_id, owner_id, record_type, category, amount, record_date, kilometer
) values
  (
    'b7300000-0000-4000-8000-000000000002',
    'b7200000-0000-4000-8000-000000000002',
    'b7100000-0000-4000-8000-000000000002',
    'maintenance', 'Legacy B maintenance', 100, '2026-01-01', 88000
  ),
  (
    'b7300000-0000-4000-8000-000000000003',
    'b7200000-0000-4000-8000-000000000002',
    'b7100000-0000-4000-8000-000000000002',
    'maintenance', 'Structured B maintenance', 200, '2026-02-01', 89000
  );

insert into public.maintenance_items (
  id, maintenance_record_id, vehicle_id, owner_id, item_type
) values (
  'b7350000-0000-4000-8000-000000000003',
  'b7300000-0000-4000-8000-000000000003',
  'b7200000-0000-4000-8000-000000000002',
  'b7100000-0000-4000-8000-000000000002',
  'engine_oil'
);

insert into public.maintenance_templates (id, owner_id, title, item_definitions)
values (
  'b7400000-0000-4000-8000-000000000002',
  'b7100000-0000-4000-8000-000000000002',
  'User B package', array['engine_oil']
);

select set_config('request.jwt.claim.sub', 'a7100000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a7100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  v_saved public.vehicle_records%rowtype;
  v_retry public.vehicle_records%rowtype;
  v_count integer;
  v_current_km integer;
  v_forbidden boolean := false;
begin
  select * into v_saved
  from public.save_maintenance_record_atomic(
    'a7500000-0000-4000-8000-000000000001',
    'a7200000-0000-4000-8000-000000000001',
    null,
    'Periyodik bakım',
    10000,
    '2026-03-12',
    148000,
    'Synthetic QA',
    array['engine_oil', 'oil_filter', 'air_filter', 'cabin_filter']
  );
  select count(*) into v_count from public.maintenance_items
  where maintenance_record_id = v_saved.id;
  select current_km into v_current_km from public.vehicles
  where id = 'a7200000-0000-4000-8000-000000000001';
  if v_count <> 4 or v_current_km <> 150000 or v_saved.source <> 'manual' then
    raise exception 'multi-item historical maintenance save failed';
  end if;

  select * into v_retry
  from public.save_maintenance_record_atomic(
    'a7500000-0000-4000-8000-000000000001',
    'a7200000-0000-4000-8000-000000000001',
    null,
    'Periyodik bakım', 10000, '2026-03-12', 148000, 'Synthetic QA',
    array['engine_oil', 'oil_filter', 'air_filter', 'cabin_filter']
  );
  select count(*) into v_count from public.maintenance_items
  where maintenance_record_id = v_saved.id;
  if v_retry.id <> v_saved.id or v_count <> 4 then
    raise exception 'idempotent retry duplicated maintenance data';
  end if;

  perform public.save_maintenance_record_atomic(
    'a7500000-0000-4000-8000-000000000003',
    'a7200000-0000-4000-8000-000000000001',
    v_saved.id,
    'Hava filtresi', 750, '2026-03-12', 147000, null,
    array['air_filter']
  );
  select count(*) into v_count from public.maintenance_items
  where maintenance_record_id = v_saved.id and item_type = 'air_filter';
  select current_km into v_current_km from public.vehicles
  where id = 'a7200000-0000-4000-8000-000000000001';
  if v_count <> 1 or v_current_km <> 150000 then
    raise exception 'single-item edit or monotonic mileage failed';
  end if;

  begin
    perform public.save_maintenance_record_atomic(
      'a7500000-0000-4000-8000-000000000004',
      'b7200000-0000-4000-8000-000000000002', null,
      'Foreign', 10, '2026-01-01', null, null, array['engine_oil']
    );
  exception when others then
    v_forbidden := sqlerrm like '%RECORD_VEHICLE_FORBIDDEN%';
  end;
  if not v_forbidden then raise exception 'cross-owner maintenance write was allowed'; end if;

  select count(*) into v_count from public.maintenance_templates
  where id = 'b7400000-0000-4000-8000-000000000002';
  if v_count <> 0 then raise exception 'cross-owner template read leaked'; end if;

  select count(*) into v_count from public.maintenance_items
  where id = 'b7350000-0000-4000-8000-000000000003';
  if v_count <> 0 then raise exception 'cross-owner maintenance item read leaked'; end if;

  update public.maintenance_templates set title = 'Tampered'
  where id = 'b7400000-0000-4000-8000-000000000002';
  if found then raise exception 'cross-owner template update succeeded'; end if;

  delete from public.vehicle_records where id = v_saved.id;
  select count(*) into v_count from public.maintenance_items
  where maintenance_record_id = v_saved.id;
  if v_count <> 0 then raise exception 'maintenance item cascade cleanup failed'; end if;
end
$$;

insert into public.maintenance_templates (owner_id, title, item_definitions)
values (auth.uid(), 'My 10,000 km Service', array['engine_oil', 'oil_filter']);

rollback;
