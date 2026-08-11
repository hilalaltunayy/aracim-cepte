begin;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.save_vehicle_record_atomic_v2(uuid,uuid,uuid,public.record_type,text,numeric,date,integer,numeric,numeric,text,text)',
    'EXECUTE'
  ) then
    raise exception 'anon can execute save_vehicle_record_atomic_v2';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.save_vehicle_record_atomic_v2(uuid,uuid,uuid,public.record_type,text,numeric,date,integer,numeric,numeric,text,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot execute save_vehicle_record_atomic_v2';
  end if;
end
$$;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('a2000000-0000-4000-8000-000000000020', 'authenticated', 'authenticated',
   'fuel-a@qa.invalid', now(), now(), false, false),
  ('b2000000-0000-4000-8000-000000000020', 'authenticated', 'authenticated',
   'fuel-b@qa.invalid', now(), now(), false, false)
on conflict (id) do nothing;

insert into public.vehicles (id, owner_id, brand, model, current_km, fuel_type, body_type)
values
  ('a2100000-0000-4000-8000-000000000020', 'a2000000-0000-4000-8000-000000000020',
   'QA', 'Fuel A', 150000, 'gasoline', 'sedan'),
  ('b2100000-0000-4000-8000-000000000020', 'b2000000-0000-4000-8000-000000000020',
   'QA', 'Fuel B', 90000, 'diesel', 'suv');

select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-000000000020', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a2000000-0000-4000-8000-000000000020","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  v_total_only public.vehicle_records%rowtype;
  v_complete public.vehicle_records%rowtype;
  v_legacy_rpc public.vehicle_records%rowtype;
  v_retry public.vehicle_records%rowtype;
  v_count integer;
  v_invalid_station boolean := false;
  v_foreign_write boolean := false;
begin
  select * into v_total_only
  from public.save_vehicle_record_atomic_v2(
    'a2200000-0000-4000-8000-000000000020',
    'a2100000-0000-4000-8000-000000000020',
    null, 'fuel', 'Yakıt alımı', 500, '2026-08-11', 148000,
    null, null, null, null
  );
  if v_total_only.amount <> 500 or v_total_only.liters is not null
    or v_total_only.price_per_liter is not null or v_total_only.station_brand is not null then
    raise exception 'total-only fuel did not preserve unknown details as null';
  end if;

  select * into v_legacy_rpc
  from public.save_vehicle_record_atomic(
    'a2200000-0000-4000-8000-000000000024',
    'a2100000-0000-4000-8000-000000000020',
    null, 'fuel', 'Eski istemci yakıtı', 450, '2026-08-10', null,
    null, null
  );
  if v_legacy_rpc.amount <> 450 or v_legacy_rpc.liters is not null then
    raise exception 'legacy RPC could not save a total-only fuel record';
  end if;

  select * into v_complete
  from public.save_vehicle_record_atomic_v2(
    'a2200000-0000-4000-8000-000000000021',
    'a2100000-0000-4000-8000-000000000020',
    null, 'fuel', 'Yakıt alımı', 1000, '2026-08-11', 151000,
    20, 50, 'petrol_ofisi', null
  );
  if v_complete.liters <> 20 or v_complete.price_per_liter <> 50
    or v_complete.station_brand <> 'petrol_ofisi' then
    raise exception 'normalized fuel details were not persisted';
  end if;

  select * into v_retry
  from public.save_vehicle_record_atomic_v2(
    'a2200000-0000-4000-8000-000000000021',
    'a2100000-0000-4000-8000-000000000020',
    null, 'fuel', 'Yakıt alımı', 1000, '2026-08-11', 151000,
    20, 50, 'petrol_ofisi', null
  );
  select count(*) into v_count from public.vehicle_records
  where owner_id = auth.uid() and amount = 1000 and record_date = '2026-08-11';
  if v_retry.id <> v_complete.id or v_count <> 1 then
    raise exception 'idempotent retry created duplicate fuel data';
  end if;

  perform public.save_vehicle_record_atomic(
    'a2200000-0000-4000-8000-000000000025',
    'a2100000-0000-4000-8000-000000000020',
    v_complete.id, 'expense', 'Eski istemci tür değişimi', 1000, '2026-08-11', 151000,
    null, null
  );
  select * into v_complete from public.vehicle_records where id = v_complete.id;
  if v_complete.record_type <> 'expense' or v_complete.liters is not null
    or v_complete.price_per_liter is not null or v_complete.station_brand is not null then
    raise exception 'legacy RPC left stale fuel details after a type change';
  end if;

  begin
    perform public.save_vehicle_record_atomic_v2(
      'a2200000-0000-4000-8000-000000000022',
      'a2100000-0000-4000-8000-000000000020',
      null, 'fuel', 'Yakıt alımı', 100, '2026-08-11', null,
      2, 50, 'unsupported', null
    );
  exception when others then
    v_invalid_station := sqlerrm like '%FUEL_STATION_INVALID%';
  end;
  if not v_invalid_station then raise exception 'unsupported station was accepted'; end if;

  begin
    perform public.save_vehicle_record_atomic_v2(
      'a2200000-0000-4000-8000-000000000023',
      'b2100000-0000-4000-8000-000000000020',
      null, 'fuel', 'Foreign fuel', 100, '2026-08-11', null,
      null, null, null, null
    );
  exception when others then
    v_foreign_write := sqlerrm like '%RECORD_VEHICLE_FORBIDDEN%';
  end;
  if not v_foreign_write then raise exception 'cross-owner fuel write was accepted'; end if;

  select count(*) into v_count from public.vehicle_records
  where id = v_complete.id and owner_id = auth.uid();
  if v_count <> 1 then raise exception 'owner could not read own fuel record'; end if;
end
$$;

rollback;
