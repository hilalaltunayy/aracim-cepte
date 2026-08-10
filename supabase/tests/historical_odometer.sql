begin;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.save_vehicle_record_atomic(uuid,uuid,uuid,public.record_type,text,numeric,date,integer,numeric,text)',
    'EXECUTE'
  ) then
    raise exception 'anon can execute save_vehicle_record_atomic';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.save_vehicle_record_atomic(uuid,uuid,uuid,public.record_type,text,numeric,date,integer,numeric,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot execute save_vehicle_record_atomic';
  end if;
end
$$;

insert into auth.users (
  id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous
) values
  (
    'a1000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'historical-a@qa.invalid',
    now(),
    now(),
    false,
    false
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'historical-b@qa.invalid',
    now(),
    now(),
    false,
    false
  )
on conflict (id) do nothing;

insert into public.vehicles (
  id, owner_id, brand, model, year, current_km, fuel_type, body_type
) values
  (
    'a2000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'QA',
    'Historical A',
    2020,
    150000,
    'gasoline',
    'sedan_hatchback'
  ),
  (
    'b2000000-0000-4000-8000-000000000002',
    'b1000000-0000-4000-8000-000000000002',
    'QA',
    'Historical B',
    2020,
    90000,
    'gasoline',
    'sedan_hatchback'
  );

insert into public.vehicle_records (
  id, vehicle_id, owner_id, record_type, category, amount, record_date, kilometer
) values (
  'b4000000-0000-4000-8000-000000000002',
  'b2000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000002',
  'maintenance',
  'User B record',
  75,
  '2026-05-01',
  89000
);

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  v_historical public.vehicle_records%rowtype;
  v_retry public.vehicle_records%rowtype;
  v_unknown public.vehicle_records%rowtype;
  v_high public.vehicle_records%rowtype;
  v_current_km integer;
  v_count integer;
  v_forbidden boolean := false;
  v_foreign_record_forbidden boolean := false;
  v_negative_blocked boolean := false;
begin
  select * into v_historical
  from public.save_vehicle_record_atomic(
    'a3000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    null,
    'maintenance',
    'Historical maintenance',
    100,
    '2026-04-01',
    148000,
    null,
    null
  );

  select current_km into v_current_km
  from public.vehicles
  where id = 'a2000000-0000-4000-8000-000000000001';
  if v_historical.kilometer <> 148000 or v_current_km <> 150000 then
    raise exception 'historical event changed current mileage';
  end if;

  select * into v_retry
  from public.save_vehicle_record_atomic(
    'a3000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    null,
    'maintenance',
    'Historical maintenance',
    100,
    '2026-04-01',
    148000,
    null,
    null
  );
  select count(*) into v_count
  from public.vehicle_records
  where owner_id = auth.uid() and category = 'Historical maintenance';
  if v_retry.id <> v_historical.id or v_count <> 1 then
    raise exception 'idempotent retry created a duplicate record';
  end if;

  select * into v_unknown
  from public.save_vehicle_record_atomic(
    'a3000000-0000-4000-8000-000000000002',
    'a2000000-0000-4000-8000-000000000001',
    null,
    'expense',
    'Unknown mileage',
    50,
    '2026-05-01',
    null,
    null,
    null
  );
  select current_km into v_current_km
  from public.vehicles
  where id = 'a2000000-0000-4000-8000-000000000001';
  if v_unknown.kilometer is not null or v_current_km <> 150000 then
    raise exception 'unknown event mileage changed current mileage';
  end if;

  select * into v_high
  from public.save_vehicle_record_atomic(
    'a3000000-0000-4000-8000-000000000003',
    'a2000000-0000-4000-8000-000000000001',
    null,
    'expense',
    'High mileage',
    200,
    '2026-07-01',
    151000,
    null,
    null
  );
  select current_km into v_current_km
  from public.vehicles
  where id = 'a2000000-0000-4000-8000-000000000001';
  if v_current_km <> 151000 then
    raise exception 'higher event did not advance current mileage';
  end if;

  perform public.save_vehicle_record_atomic(
    'a3000000-0000-4000-8000-000000000004',
    'a2000000-0000-4000-8000-000000000001',
    v_historical.id,
    'maintenance',
    'Historical maintenance',
    100,
    '2026-04-01',
    147000,
    null,
    null
  );
  select current_km into v_current_km
  from public.vehicles
  where id = 'a2000000-0000-4000-8000-000000000001';
  if v_current_km <> 151000 then
    raise exception 'historical edit regressed current mileage';
  end if;

  delete from public.vehicle_records where id = v_historical.id;
  delete from public.vehicle_records where id = v_high.id;
  select current_km into v_current_km
  from public.vehicles
  where id = 'a2000000-0000-4000-8000-000000000001';
  if v_current_km <> 151000 then
    raise exception 'record delete regressed current mileage';
  end if;

  begin
    perform public.save_vehicle_record_atomic(
      'a3000000-0000-4000-8000-000000000005',
      'a2000000-0000-4000-8000-000000000001',
      null,
      'expense',
      'Negative mileage',
      10,
      '2026-06-01',
      -1,
      null,
      null
    );
  exception when others then
    v_negative_blocked := sqlerrm like '%RECORD_VALIDATION_FAILED%';
  end;
  if not v_negative_blocked then
    raise exception 'negative mileage was not rejected safely';
  end if;

  begin
    perform public.save_vehicle_record_atomic(
      'a3000000-0000-4000-8000-000000000006',
      'b2000000-0000-4000-8000-000000000002',
      null,
      'expense',
      'Foreign vehicle',
      10,
      '2026-06-01',
      1000,
      null,
      null
    );
  exception when others then
    v_forbidden := sqlerrm like '%RECORD_VEHICLE_FORBIDDEN%';
  end;
  if not v_forbidden then
    raise exception 'cross-owner vehicle write was not rejected';
  end if;

  begin
    perform public.save_vehicle_record_atomic(
      'a3000000-0000-4000-8000-000000000007',
      'b2000000-0000-4000-8000-000000000002',
      'b4000000-0000-4000-8000-000000000002',
      'maintenance',
      'Unauthorized edit',
      999,
      '2026-05-01',
      99999,
      null,
      null
    );
  exception when others then
    v_foreign_record_forbidden := sqlerrm like '%RECORD_VEHICLE_FORBIDDEN%';
  end;
  if not v_foreign_record_forbidden then
    raise exception 'cross-owner record update was not rejected';
  end if;
end
$$;

rollback;
