begin;

do $$
declare v_definer boolean; v_config text[];
begin
  if has_function_privilege(
    'anon',
    'public.save_maintenance_record_with_details(uuid,uuid,uuid,text,numeric,date,integer,text,text[],text,text,numeric,numeric,text,jsonb)',
    'EXECUTE'
  ) then raise exception 'anon can execute maintenance details RPC'; end if;
  if not has_function_privilege(
    'authenticated',
    'public.save_maintenance_record_with_details(uuid,uuid,uuid,text,numeric,date,integer,text,text[],text,text,numeric,numeric,text,jsonb)',
    'EXECUTE'
  ) then raise exception 'authenticated cannot execute maintenance details RPC'; end if;
  if has_function_privilege(
    'authenticated',
    'public.reserve_attachment_upload_for_parent(uuid,uuid,text,uuid,text,text,bigint,text,uuid)',
    'EXECUTE'
  ) then raise exception 'authenticated can reserve maintenance attachment directly'; end if;
  select prosecdef, proconfig into v_definer, v_config from pg_proc
  where oid = 'public.save_maintenance_record_with_details(uuid,uuid,uuid,text,numeric,date,integer,text,text[],text,text,numeric,numeric,text,jsonb)'::regprocedure;
  if not v_definer or not ('search_path=""' = any(v_config)) then
    raise exception 'maintenance details RPC security context is unsafe';
  end if;
end $$;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('a2400000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'maintenance-details-a@qa.invalid', now(), now(), false, false),
  ('b2400000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'maintenance-details-b@qa.invalid', now(), now(), false, false);

insert into public.vehicles (id, owner_id, brand, model, current_km, fuel_type, body_type)
values
  ('a2410000-0000-4000-8000-000000000001', 'a2400000-0000-4000-8000-000000000001',
   'QA', 'Maintenance Details A', 150000, 'gasoline', 'sedan'),
  ('b2410000-0000-4000-8000-000000000002', 'b2400000-0000-4000-8000-000000000002',
   'QA', 'Maintenance Details B', 90000, 'gasoline', 'sedan');

insert into public.vehicle_records (
  id, vehicle_id, owner_id, record_type, category, amount, record_date, kilometer
) values (
  'b2420000-0000-4000-8000-000000000002',
  'b2410000-0000-4000-8000-000000000002',
  'b2400000-0000-4000-8000-000000000002',
  'maintenance', 'Private maintenance', 100, '2026-01-01', 89000
);

do $$
declare v_reservation record; v_forbidden boolean := false;
begin
  select * into v_reservation from public.reserve_attachment_upload_for_parent(
    'a2400000-0000-4000-8000-000000000001',
    'a2410000-0000-4000-8000-000000000001',
    'maintenance_record',
    'a2420000-0000-4000-8000-000000000001',
    'document', 'invoice.pdf', 1024, 'application/pdf',
    'a2430000-0000-4000-8000-000000000001'
  );
  if v_reservation.object_path !~ '^a2400000-0000-4000-8000-000000000001/a2410000-0000-4000-8000-000000000001/maintenance_record/a2420000-0000-4000-8000-000000000001/[0-9a-f-]+[.]pdf$' then
    raise exception 'maintenance attachment path is not parent scoped';
  end if;
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values (
    'vehicle-attachments', v_reservation.object_path,
    'a2400000-0000-4000-8000-000000000001',
    '{"size":1024,"mimetype":"application/pdf"}'::jsonb
  );
  if not public.mark_attachment_uploaded(
    v_reservation.reservation_id,
    'a2400000-0000-4000-8000-000000000001'
  ) then raise exception 'maintenance upload was not marked'; end if;
  perform set_config('qa.maintenance_attachment_path', v_reservation.object_path, true);

  begin
    perform public.reserve_attachment_upload_for_parent(
      'a2400000-0000-4000-8000-000000000001',
      'b2410000-0000-4000-8000-000000000002',
      'maintenance_record', 'b2420000-0000-4000-8000-000000000002',
      'document', 'foreign.pdf', 100, 'application/pdf',
      'a2430000-0000-4000-8000-000000000009'
    );
  exception when others then
    v_forbidden := sqlerrm like '%ATTACHMENT_VEHICLE_FORBIDDEN%';
  end;
  if not v_forbidden then raise exception 'foreign maintenance attachment reservation was allowed'; end if;
end $$;

select set_config('request.jwt.claim.sub', 'a2400000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a2400000-0000-4000-8000-000000000001","role":"authenticated"}',
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
  v_invalid boolean := false;
  v_path text := current_setting('qa.maintenance_attachment_path');
begin
  begin
    perform public.save_maintenance_record_with_details(
      'a2440000-0000-4000-8000-000000000008',
      'a2410000-0000-4000-8000-000000000001',
      'a2420000-0000-4000-8000-000000000008',
      'Invalid', 10, '2026-03-01', null, null, array[]::text[],
      'dealer_api', null, null, null, null, '[]'::jsonb
    );
  exception when others then
    v_invalid := sqlerrm like '%MAINTENANCE_SERVICE_TYPE_INVALID%';
  end;
  if not v_invalid then raise exception 'unsupported service type was accepted'; end if;

  v_invalid := false;
  begin
    perform public.save_maintenance_record_with_details(
      'a2440000-0000-4000-8000-000000000007',
      'a2410000-0000-4000-8000-000000000001',
      'a2420000-0000-4000-8000-000000000007',
      'Invalid', 10, '2026-03-01', null, null, array[]::text[],
      null, null, -1, null, null, '[]'::jsonb
    );
  exception when others then
    v_invalid := sqlerrm like '%MAINTENANCE_COST_INVALID%';
  end;
  if not v_invalid then raise exception 'negative maintenance cost was accepted'; end if;

  select * into v_saved from public.save_maintenance_record_with_details(
    'a2440000-0000-4000-8000-000000000001',
    'a2410000-0000-4000-8000-000000000001',
    'a2420000-0000-4000-8000-000000000001',
    'Periyodik bakım', 5000, '2026-03-01', 148000, 'Sentetik not',
    array['engine_oil', 'oil_filter'],
    'authorized_service', 'QA Servis', 3200, 1800, 'QA-001',
    pg_catalog.jsonb_build_array(v_path)
  );
  if v_saved.service_type <> 'authorized_service'
    or v_saved.service_name <> 'QA Servis'
    or v_saved.parts_cost <> 3200
    or v_saved.labor_cost <> 1800
    or v_saved.invoice_number <> 'QA-001'
    or v_saved.description <> 'Sentetik not' then
    raise exception 'maintenance optional details were not saved';
  end if;
  select current_km into v_current_km from public.vehicles
  where id = 'a2410000-0000-4000-8000-000000000001';
  if v_current_km <> 150000 then
    raise exception 'TASK-016 historical odometer high-water mark regressed';
  end if;
  select count(*) into v_count from public.maintenance_items
  where maintenance_record_id = v_saved.id;
  if v_count <> 2 then raise exception 'maintenance items were not saved atomically'; end if;
  select count(*) into v_count from public.attachments
  where parent_type = 'maintenance_record' and parent_id = v_saved.id and storage_path = v_path;
  if v_count <> 1 then raise exception 'maintenance attachment metadata was not linked'; end if;

  select * into v_retry from public.save_maintenance_record_with_details(
    'a2440000-0000-4000-8000-000000000001',
    'a2410000-0000-4000-8000-000000000001',
    'a2420000-0000-4000-8000-000000000001',
    'Periyodik bakım', 5000, '2026-03-01', 148000, 'Sentetik not',
    array['engine_oil', 'oil_filter'],
    'authorized_service', 'QA Servis', 3200, 1800, 'QA-001',
    pg_catalog.jsonb_build_array(v_path)
  );
  select count(*) into v_count from public.attachments
  where parent_type = 'maintenance_record' and parent_id = v_retry.id;
  if v_retry.id <> v_saved.id or v_count <> 1 then
    raise exception 'idempotent retry duplicated maintenance data';
  end if;

  perform public.save_maintenance_record_with_details(
    'a2440000-0000-4000-8000-000000000003',
    'a2410000-0000-4000-8000-000000000001', v_saved.id,
    'Hava filtresi', 750, '2026-02-01', 147000, null, array['air_filter'],
    null, null, null, null, null, '[]'::jsonb
  );
  select current_km into v_current_km from public.vehicles
  where id = 'a2410000-0000-4000-8000-000000000001';
  if v_current_km <> 150000 then raise exception 'historical edit regressed current_km'; end if;
  select count(*) into v_count from public.attachments
  where parent_type = 'maintenance_record' and parent_id = v_saved.id;
  if v_count <> 0 then raise exception 'removed maintenance attachment metadata remained'; end if;

  begin
    perform public.save_maintenance_record_with_details(
      'a2440000-0000-4000-8000-000000000004',
      'b2410000-0000-4000-8000-000000000002',
      'b2420000-0000-4000-8000-000000000002',
      'Foreign', 10, '2026-01-01', null, null, array[]::text[],
      null, null, null, null, null, '[]'::jsonb
    );
  exception when others then
    v_forbidden := sqlerrm like '%RECORD_VEHICLE_FORBIDDEN%';
  end;
  if not v_forbidden then raise exception 'cross-owner maintenance write was allowed'; end if;

  update public.vehicle_records set record_type = 'expense' where id = v_saved.id;
  select * into v_saved from public.vehicle_records where id = v_saved.id;
  if v_saved.service_type is not null or v_saved.service_name is not null
    or v_saved.parts_cost is not null or v_saved.labor_cost is not null
    or v_saved.invoice_number is not null then
    raise exception 'maintenance-only details remained after record type change';
  end if;

  delete from public.vehicle_records where id = v_saved.id;
  select current_km into v_current_km from public.vehicles
  where id = 'a2410000-0000-4000-8000-000000000001';
  if v_current_km <> 150000 then raise exception 'maintenance delete regressed current_km'; end if;
end $$;

rollback;
