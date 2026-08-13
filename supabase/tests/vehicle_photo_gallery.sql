begin;

do $$
declare
  v_definer boolean;
  v_config text[];
begin
  select relrowsecurity into v_definer from pg_class where oid = 'public.vehicle_photos'::regclass;
  if not v_definer then raise exception 'vehicle_photos RLS is disabled'; end if;
  if has_table_privilege('authenticated', 'public.vehicle_photos', 'INSERT')
    or has_table_privilege('authenticated', 'public.vehicle_photos', 'UPDATE')
    or has_table_privilege('authenticated', 'public.vehicle_photos', 'DELETE') then
    raise exception 'client can bypass vehicle photo RPCs';
  end if;
  if has_function_privilege('anon', 'public.save_vehicle_photo(uuid,uuid,text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.set_vehicle_photo_primary(uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.delete_vehicle_photo(uuid)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.reserve_vehicle_photo_upload(uuid,uuid,uuid,text,text,bigint,text,uuid,uuid)', 'EXECUTE') then
    raise exception 'vehicle photo function grants are unsafe';
  end if;
  if has_function_privilege('authenticated', 'private.max_vehicle_photos_for_user(uuid)', 'EXECUTE') then
    raise exception 'client can call private vehicle photo limit resolver';
  end if;
  select prosecdef, proconfig into v_definer, v_config
  from pg_proc where oid = 'public.save_vehicle_photo(uuid,uuid,text)'::regprocedure;
  if not v_definer or not ('search_path=""' = any(v_config)) then
    raise exception 'vehicle photo save RPC has unsafe execution context';
  end if;
  if pg_get_functiondef('public.reserve_vehicle_photo_upload(uuid,uuid,uuid,text,text,bigint,text,uuid,uuid)'::regprocedure)
    not like '%pg_advisory_xact_lock%' then
    raise exception 'vehicle photo concurrency lock is missing';
  end if;
end $$;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('a3000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'photo-a@qa.invalid', now(), now(), false, false),
  ('b3000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'photo-b@qa.invalid', now(), now(), false, false);

insert into public.vehicles (id, owner_id, brand, model, current_km, fuel_type, body_type)
values
  ('a3010000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 'QA', 'Free', 1000, 'gasoline', 'sedan'),
  ('b3010000-0000-4000-8000-000000000002', 'b3000000-0000-4000-8000-000000000002', 'QA', 'Premium', 1000, 'gasoline', 'sedan');

insert into public.user_entitlements (user_id, plan_id, source, valid_until)
values ('b3000000-0000-4000-8000-000000000002', 'premium', 'support', now() + interval '1 day');

do $$
declare
  v_reservation record;
  v_blocked boolean := false;
begin
  begin
    perform public.reserve_vehicle_photo_upload(
      'a3000000-0000-4000-8000-000000000001',
      'b3010000-0000-4000-8000-000000000002',
      'a3020000-0000-4000-8000-000000000001',
      'camera', 'photo.jpg', 100, 'image/jpeg', 'a3030000-0000-4000-8000-000000000001', null
    );
  exception when others then v_blocked := sqlerrm like '%ATTACHMENT_VEHICLE_FORBIDDEN%'; end;
  if not v_blocked then raise exception 'foreign vehicle photo reservation was accepted'; end if;

  select * into v_reservation from public.reserve_vehicle_photo_upload(
    'a3000000-0000-4000-8000-000000000001',
    'a3010000-0000-4000-8000-000000000001',
    'a3020000-0000-4000-8000-000000000001',
    'camera', 'photo.jpg', 100, 'image/jpeg', 'a3030000-0000-4000-8000-000000000001', null
  );
  if v_reservation.object_path !~ '^a3000000-0000-4000-8000-000000000001/a3010000-0000-4000-8000-000000000001/vehicle_photo/a3020000-0000-4000-8000-000000000001/[0-9a-f-]+[.]jpg$' then
    raise exception 'vehicle photo object path is not owner-scoped/random';
  end if;
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values ('vehicle-attachments', v_reservation.object_path, 'a3000000-0000-4000-8000-000000000001', '{"size":100,"mimetype":"image/jpeg"}'::jsonb);
  if not public.mark_attachment_uploaded(v_reservation.reservation_id, 'a3000000-0000-4000-8000-000000000001') then
    raise exception 'free photo upload was not marked';
  end if;
end $$;

select set_config(
  'qa.vehicle_photo_a_first_path',
  (select object_path from public.attachment_upload_reservations where request_id = 'a3030000-0000-4000-8000-000000000001'),
  true
);
select set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a3000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.save_vehicle_photo(
  'a3010000-0000-4000-8000-000000000001',
  'a3020000-0000-4000-8000-000000000001',
  current_setting('qa.vehicle_photo_a_first_path')
);
-- Retry is idempotent and cannot duplicate metadata.
select public.save_vehicle_photo(
  'a3010000-0000-4000-8000-000000000001',
  'a3020000-0000-4000-8000-000000000001',
  current_setting('qa.vehicle_photo_a_first_path')
);
reset role;

do $$
declare
  v_reservation record;
  v_blocked boolean := false;
begin
  select * into v_reservation from public.reserve_vehicle_photo_upload(
    'a3000000-0000-4000-8000-000000000001',
    'a3010000-0000-4000-8000-000000000001',
    'a3020000-0000-4000-8000-000000000002',
    'gallery', 'replacement.jpg', 100, 'image/jpeg', 'a3030000-0000-4000-8000-000000000002',
    'a3020000-0000-4000-8000-000000000001'
  );
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values ('vehicle-attachments', v_reservation.object_path, 'a3000000-0000-4000-8000-000000000001', '{"size":100,"mimetype":"image/jpeg"}'::jsonb);
  perform public.mark_attachment_uploaded(v_reservation.reservation_id, 'a3000000-0000-4000-8000-000000000001');
end $$;

select set_config(
  'qa.vehicle_photo_a_replacement_path',
  (select object_path from public.attachment_upload_reservations where request_id = 'a3030000-0000-4000-8000-000000000002'),
  true
);
set local role authenticated;
select public.save_vehicle_photo(
  'a3010000-0000-4000-8000-000000000001',
  'a3020000-0000-4000-8000-000000000002',
  current_setting('qa.vehicle_photo_a_replacement_path')
);
reset role;

do $$
declare v_blocked boolean := false; v_count integer;
begin
  select count(*) into v_count from public.vehicle_photos where vehicle_id = 'a3010000-0000-4000-8000-000000000001';
  if v_count <> 1 or not exists (
    select 1 from public.vehicle_photos where id = 'a3020000-0000-4000-8000-000000000002' and is_primary
  ) then raise exception 'Free replacement did not retain exactly one primary'; end if;
  begin
    perform public.reserve_vehicle_photo_upload(
      'a3000000-0000-4000-8000-000000000001',
      'a3010000-0000-4000-8000-000000000001',
      'a3020000-0000-4000-8000-000000000003',
      'gallery', 'blocked.jpg', 100, 'image/jpeg', 'a3030000-0000-4000-8000-000000000003', null
    );
  exception when others then v_blocked := sqlerrm like '%VEHICLE_PHOTO_LIMIT_REACHED%'; end;
  if not v_blocked then raise exception 'Free user reserved a second vehicle photo'; end if;
end $$;

do $$
declare
  v_photo_id uuid;
  v_request_id uuid;
  v_reservation record;
begin
  foreach v_photo_id in array array[
    'b3020000-0000-4000-8000-000000000001'::uuid,
    'b3020000-0000-4000-8000-000000000002'::uuid
  ] loop
    v_request_id := pg_catalog.gen_random_uuid();
    select * into v_reservation from public.reserve_vehicle_photo_upload(
      'b3000000-0000-4000-8000-000000000002', 'b3010000-0000-4000-8000-000000000002',
      v_photo_id, 'gallery', 'premium.jpg', 100, 'image/jpeg', v_request_id, null
    );
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values ('vehicle-attachments', v_reservation.object_path, 'b3000000-0000-4000-8000-000000000002', '{"size":100,"mimetype":"image/jpeg"}'::jsonb);
    perform public.mark_attachment_uploaded(v_reservation.reservation_id, 'b3000000-0000-4000-8000-000000000002');
  end loop;
end $$;

select set_config(
  'qa.vehicle_photo_b_first_path',
  (select object_path from public.attachment_upload_reservations where parent_id = 'b3020000-0000-4000-8000-000000000001'),
  true
);
select set_config(
  'qa.vehicle_photo_b_second_path',
  (select object_path from public.attachment_upload_reservations where parent_id = 'b3020000-0000-4000-8000-000000000002'),
  true
);
select set_config('request.jwt.claim.sub', 'b3000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"b3000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.save_vehicle_photo('b3010000-0000-4000-8000-000000000002', 'b3020000-0000-4000-8000-000000000001',
  current_setting('qa.vehicle_photo_b_first_path'));
select public.save_vehicle_photo('b3010000-0000-4000-8000-000000000002', 'b3020000-0000-4000-8000-000000000002',
  current_setting('qa.vehicle_photo_b_second_path'));
select public.set_vehicle_photo_primary('b3020000-0000-4000-8000-000000000002');
select public.delete_vehicle_photo('b3020000-0000-4000-8000-000000000002');
reset role;

do $$
declare v_next_id uuid; v_blocked boolean := false;
begin
  select id into v_next_id from public.vehicle_photos where vehicle_id = 'b3010000-0000-4000-8000-000000000002' and is_primary;
  if v_next_id <> 'b3020000-0000-4000-8000-000000000001'::uuid then
    raise exception 'deleting the primary photo did not choose the stable fallback';
  end if;
  perform public.reserve_vehicle_photo_upload('b3000000-0000-4000-8000-000000000002','b3010000-0000-4000-8000-000000000002',
    'b3020000-0000-4000-8000-000000000003','gallery','three.jpg',100,'image/jpeg','b3030000-0000-4000-8000-000000000003',null);
  perform public.reserve_vehicle_photo_upload('b3000000-0000-4000-8000-000000000002','b3010000-0000-4000-8000-000000000002',
    'b3020000-0000-4000-8000-000000000004','gallery','four.jpg',100,'image/jpeg','b3030000-0000-4000-8000-000000000004',null);
  perform public.reserve_vehicle_photo_upload('b3000000-0000-4000-8000-000000000002','b3010000-0000-4000-8000-000000000002',
    'b3020000-0000-4000-8000-000000000005','gallery','five.jpg',100,'image/jpeg','b3030000-0000-4000-8000-000000000005',null);
  perform public.reserve_vehicle_photo_upload('b3000000-0000-4000-8000-000000000002','b3010000-0000-4000-8000-000000000002',
    'b3020000-0000-4000-8000-000000000006','gallery','six.jpg',100,'image/jpeg','b3030000-0000-4000-8000-000000000006',null);
  begin
    perform public.reserve_vehicle_photo_upload('b3000000-0000-4000-8000-000000000002','b3010000-0000-4000-8000-000000000002',
      'b3020000-0000-4000-8000-000000000007','gallery','seven.jpg',100,'image/jpeg','b3030000-0000-4000-8000-000000000007',null);
  exception when others then v_blocked := sqlerrm like '%VEHICLE_PHOTO_LIMIT_REACHED%'; end;
  if not v_blocked then raise exception 'Premium sixth vehicle photo reservation was accepted'; end if;
end $$;

select set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a3000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare v_count integer; v_blocked boolean := false;
begin
  select count(*) into v_count from public.vehicle_photos where vehicle_id = 'b3010000-0000-4000-8000-000000000002';
  if v_count <> 0 then raise exception 'foreign vehicle photos leaked through RLS'; end if;
  begin perform public.set_vehicle_photo_primary('b3020000-0000-4000-8000-000000000001');
  exception when others then v_blocked := sqlerrm like '%VEHICLE_PHOTO_NOT_FOUND%'; end;
  if not v_blocked then raise exception 'foreign primary mutation was accepted'; end if;
  if public.delete_vehicle_photo('b3020000-0000-4000-8000-000000000001') then
    raise exception 'foreign photo delete was accepted';
  end if;
end $$;

rollback;
