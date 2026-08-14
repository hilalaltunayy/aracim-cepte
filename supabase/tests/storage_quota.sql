begin;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('f0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'quota-free@qa.invalid', now(), now(), false, false),
  ('f0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'quota-premium@qa.invalid', now(), now(), false, false),
  ('f0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'quota-missing@qa.invalid', now(), now(), false, false),
  ('f0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'quota-expired@qa.invalid', now(), now(), false, false)
on conflict (id) do nothing;

insert into public.user_entitlements(user_id, plan_id, source, valid_until)
values
  ('f0000000-0000-4000-8000-000000000003', 'premium', 'support', null),
  ('f0000000-0000-4000-8000-000000000005', 'premium', 'support', now() - interval '1 second')
on conflict (user_id) do update set plan_id = excluded.plan_id, valid_until = excluded.valid_until;

insert into public.vehicles (id, owner_id, brand, model, year, current_km, fuel_type, body_type)
select id, owner_id, 'QA', 'Quota', 2026, 1, 'gasoline', 'sedan_hatchback'
from (values
  ('f0000000-0000-4000-8000-000000000002'::uuid, 'f0000000-0000-4000-8000-000000000001'::uuid),
  ('f0000000-0000-4000-8000-000000000006'::uuid, 'f0000000-0000-4000-8000-000000000003'::uuid),
  ('f0000000-0000-4000-8000-000000000007'::uuid, 'f0000000-0000-4000-8000-000000000004'::uuid),
  ('f0000000-0000-4000-8000-000000000008'::uuid, 'f0000000-0000-4000-8000-000000000005'::uuid)
) v(id, owner_id)
on conflict (id) do nothing;

insert into public.vehicle_documents(id, owner_id, vehicle_id, document_type, title)
select id, owner_id, vehicle_id, 'traffic_insurance', 'QA quota document'
from (
  select ('f1000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, 'f0000000-0000-4000-8000-000000000001'::uuid, 'f0000000-0000-4000-8000-000000000002'::uuid from generate_series(1, 6) i
  union all select ('f2000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, 'f0000000-0000-4000-8000-000000000003'::uuid, 'f0000000-0000-4000-8000-000000000006'::uuid from generate_series(1, 21) i
  union all select ('f3000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, 'f0000000-0000-4000-8000-000000000004'::uuid, 'f0000000-0000-4000-8000-000000000007'::uuid from generate_series(1, 6) i
  union all select ('f4000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, 'f0000000-0000-4000-8000-000000000005'::uuid, 'f0000000-0000-4000-8000-000000000008'::uuid from generate_series(1, 6) i
) d(id, owner_id, vehicle_id);

do $$
declare bucket_public boolean; bucket_limit bigint; bucket_mimes text[];
begin
  select public, file_size_limit, allowed_mime_types into bucket_public, bucket_limit, bucket_mimes
  from storage.buckets where id = 'vehicle-attachments';
  if bucket_public is distinct from false or bucket_limit <> 5242880
    or bucket_mimes <> array['application/pdf', 'image/jpeg', 'image/png'] then
    raise exception 'attachment bucket policy regressed';
  end if;
end $$;

set local role service_role;

do $$
declare
  free_owner constant uuid := 'f0000000-0000-4000-8000-000000000001'; free_vehicle constant uuid := 'f0000000-0000-4000-8000-000000000002';
  premium_owner constant uuid := 'f0000000-0000-4000-8000-000000000003'; premium_vehicle constant uuid := 'f0000000-0000-4000-8000-000000000006';
  missing_owner constant uuid := 'f0000000-0000-4000-8000-000000000004'; missing_vehicle constant uuid := 'f0000000-0000-4000-8000-000000000007';
  expired_owner constant uuid := 'f0000000-0000-4000-8000-000000000005'; expired_vehicle constant uuid := 'f0000000-0000-4000-8000-000000000008';
  free_parent uuid; premium_parent uuid; missing_parent uuid; expired_parent uuid; item record; first_reservation record; blocked boolean;
begin
  free_parent := 'f1000000-0000-4000-8000-000000000001';
  for i in 1..5 loop
    select * into item from public.reserve_attachment_upload_for_parent(free_owner, free_vehicle, 'vehicle_document', free_parent, 'document', 'free.pdf', 100, 'application/pdf', pg_catalog.gen_random_uuid());
    if i = 1 then first_reservation := item; end if;
  end loop;
  select * into item from public.reserve_attachment_upload_for_parent(free_owner, free_vehicle, 'vehicle_document', free_parent, 'document', 'free.pdf', 100, 'application/pdf', (select request_id from public.attachment_upload_reservations where id = first_reservation.reservation_id));
  if item.reservation_id <> first_reservation.reservation_id then raise exception 'attachment reservation retry was not idempotent'; end if;
  blocked := false;
  begin perform public.reserve_attachment_upload_for_parent(free_owner, free_vehicle, 'vehicle_document', free_parent, 'document', 'free.pdf', 100, 'application/pdf', pg_catalog.gen_random_uuid());
  exception when others then blocked := sqlerrm like '%ATTACHMENT_ENTITY_COUNT_EXCEEDED%'; end;
  if not blocked then raise exception 'free sixth attachment was accepted'; end if;

  premium_parent := 'f2000000-0000-4000-8000-000000000001';
  for i in 1..10 loop
    perform public.reserve_attachment_upload_for_parent(premium_owner, premium_vehicle, 'vehicle_document', premium_parent, 'document', 'premium.pdf', 100, 'application/pdf', pg_catalog.gen_random_uuid());
  end loop;
  blocked := false;
  begin perform public.reserve_attachment_upload_for_parent(premium_owner, premium_vehicle, 'vehicle_document', premium_parent, 'document', 'premium.pdf', 100, 'application/pdf', pg_catalog.gen_random_uuid());
  exception when others then blocked := sqlerrm like '%ATTACHMENT_ENTITY_COUNT_EXCEEDED%'; end;
  if not blocked then raise exception 'premium eleventh attachment was accepted'; end if;

  missing_parent := 'f3000000-0000-4000-8000-000000000001';
  for i in 1..5 loop
    perform public.reserve_attachment_upload_for_parent(missing_owner, missing_vehicle, 'vehicle_document', missing_parent, 'document', 'missing.pdf', 100, 'application/pdf', pg_catalog.gen_random_uuid());
  end loop;
  blocked := false;
  begin perform public.reserve_attachment_upload_for_parent(missing_owner, missing_vehicle, 'vehicle_document', missing_parent, 'document', 'missing.pdf', 100, 'application/pdf', pg_catalog.gen_random_uuid());
  exception when others then blocked := sqlerrm like '%ATTACHMENT_ENTITY_COUNT_EXCEEDED%'; end;
  if not blocked then raise exception 'missing entitlement did not fail closed to free'; end if;

  expired_parent := 'f4000000-0000-4000-8000-000000000001';
  for i in 1..5 loop
    perform public.reserve_attachment_upload_for_parent(expired_owner, expired_vehicle, 'vehicle_document', expired_parent, 'document', 'expired.pdf', 100, 'application/pdf', pg_catalog.gen_random_uuid());
  end loop;
  blocked := false;
  begin perform public.reserve_attachment_upload_for_parent(expired_owner, expired_vehicle, 'vehicle_document', expired_parent, 'document', 'expired.pdf', 100, 'application/pdf', pg_catalog.gen_random_uuid());
  exception when others then blocked := sqlerrm like '%ATTACHMENT_ENTITY_COUNT_EXCEEDED%'; end;
  if not blocked then raise exception 'expired entitlement did not fail closed to free'; end if;
end $$;

do $$
declare
  free_owner constant uuid := 'f0000000-0000-4000-8000-000000000001'; free_vehicle constant uuid := 'f0000000-0000-4000-8000-000000000002';
  premium_owner constant uuid := 'f0000000-0000-4000-8000-000000000003'; premium_vehicle constant uuid := 'f0000000-0000-4000-8000-000000000006';
  parent_id uuid; blocked boolean; reservation record;
begin
  delete from public.attachment_upload_reservations where owner_id in (free_owner, premium_owner);
  for i in 1..5 loop
    parent_id := ('f1000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    perform public.reserve_attachment_upload_for_parent(free_owner, free_vehicle, 'vehicle_document', parent_id, 'document', 'five-mb.pdf', 5242880, 'application/pdf', pg_catalog.gen_random_uuid());
  end loop;
  blocked := false;
  begin perform public.reserve_attachment_upload_for_parent(free_owner, free_vehicle, 'vehicle_document', parent_id, 'document', 'one-byte.png', 1, 'image/png', pg_catalog.gen_random_uuid());
  exception when others then blocked := sqlerrm like '%ATTACHMENT_BYTES_QUOTA_EXCEEDED%'; end;
  if not blocked then raise exception 'free storage above 25 MB was accepted'; end if;

  delete from public.attachment_upload_reservations where owner_id = premium_owner;
  for i in 1..20 loop
    parent_id := ('f2000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    perform public.reserve_attachment_upload_for_parent(premium_owner, premium_vehicle, 'vehicle_document', parent_id, 'document', 'five-mb.pdf', 5242880, 'application/pdf', pg_catalog.gen_random_uuid());
  end loop;
  blocked := false;
  begin perform public.reserve_attachment_upload_for_parent(premium_owner, premium_vehicle, 'vehicle_document', parent_id, 'document', 'one-byte.png', 1, 'image/png', pg_catalog.gen_random_uuid());
  exception when others then blocked := sqlerrm like '%ATTACHMENT_BYTES_QUOTA_EXCEEDED%'; end;
  if not blocked then raise exception 'premium storage above 100 MB was accepted'; end if;

  delete from public.attachment_upload_reservations where owner_id = free_owner;
  insert into storage.objects(bucket_id, name, owner_id, metadata)
  values ('vehicle-attachments', free_owner::text || '/' || free_vehicle::text || '/vehicle_photo/qa/photo.jpg', free_owner, '{"size":100,"mimetype":"image/jpeg"}'::jsonb);
  for i in 1..4 loop
    parent_id := ('f1000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    perform public.reserve_attachment_upload_for_parent(free_owner, free_vehicle, 'vehicle_document', parent_id, 'document', 'five-mb.pdf', 5242880, 'application/pdf', pg_catalog.gen_random_uuid());
  end loop;
  blocked := false;
  begin perform public.reserve_attachment_upload_for_parent(free_owner, free_vehicle, 'vehicle_document', parent_id, 'document', 'fifth-mb.pdf', 5242880, 'application/pdf', pg_catalog.gen_random_uuid());
  exception when others then blocked := sqlerrm like '%ATTACHMENT_BYTES_QUOTA_EXCEEDED%'; end;
  if not blocked then raise exception 'vehicle photo bytes were not counted toward storage'; end if;

  delete from public.attachment_upload_reservations where owner_id = free_owner;
  parent_id := 'f1000000-0000-4000-8000-000000000001';
  select * into reservation from public.reserve_attachment_upload_for_parent(free_owner, free_vehicle, 'vehicle_document', parent_id, 'document', 'size-check.jpg', 100, 'image/jpeg', pg_catalog.gen_random_uuid());
  insert into storage.objects(bucket_id, name, owner_id, metadata)
  values ('vehicle-attachments', reservation.object_path, free_owner, '{"size":101,"mimetype":"image/jpeg"}'::jsonb);
  if public.mark_attachment_uploaded(reservation.reservation_id, free_owner) then raise exception 'spoofed final byte size was accepted'; end if;
  update public.attachment_upload_reservations set status = 'failed' where id = reservation.reservation_id;
end $$;

do $$
declare blocked boolean := false; v_def text;
begin
  select pg_get_functiondef('public.reserve_attachment_upload_for_parent(uuid,uuid,text,uuid,text,text,bigint,text,uuid)'::regprocedure) into v_def;
  if position('pg_advisory_xact_lock' in v_def) = 0 then raise exception 'attachment quota concurrency lock missing'; end if;
  if has_function_privilege('anon', 'public.reserve_attachment_upload_for_parent(uuid,uuid,text,uuid,text,text,bigint,text,uuid)'::regprocedure, 'execute')
    or has_function_privilege('authenticated', 'public.reserve_attachment_upload_for_parent(uuid,uuid,text,uuid,text,text,bigint,text,uuid)'::regprocedure, 'execute') then
    raise exception 'attachment quota RPC grant is unsafe';
  end if;
  begin
    perform public.reserve_attachment_upload_for_parent(
      'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000006',
      'vehicle_document', pg_catalog.gen_random_uuid(), 'document', 'foreign.pdf', 100, 'application/pdf', pg_catalog.gen_random_uuid()
    );
  exception when others then blocked := sqlerrm like '%ATTACHMENT_VEHICLE_FORBIDDEN%'; end;
  if not blocked then raise exception 'foreign vehicle reservation was accepted'; end if;
end $$;

reset role;
rollback;
