begin;

do $$
declare v_rls boolean; v_definer boolean; v_config text[];
begin
  select relrowsecurity into v_rls from pg_class where oid = 'public.attachments'::regclass;
  if not v_rls then raise exception 'attachments RLS is disabled'; end if;
  if has_table_privilege('authenticated', 'public.attachments', 'INSERT')
    or has_table_privilege('authenticated', 'public.attachments', 'UPDATE')
    or has_table_privilege('authenticated', 'public.attachments', 'DELETE') then
    raise exception 'authenticated can bypass atomic attachment writes';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.reserve_attachment_upload_for_parent(uuid,uuid,text,uuid,text,text,bigint,text,uuid)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.reserve_attachment_upload_for_parent(uuid,uuid,text,uuid,text,text,bigint,text,uuid)',
    'EXECUTE'
  ) then raise exception 'parent reservation is client callable'; end if;
  select prosecdef, proconfig into v_definer, v_config from pg_proc
  where oid = 'public.save_expertise_report_with_attachments(uuid,uuid,date,text,text,text,boolean,jsonb)'::regprocedure;
  if not v_definer or not ('search_path=""' = any(v_config)) then
    raise exception 'expertise attachment RPC security context is unsafe';
  end if;
end $$;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('a2200000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'attachment-a@qa.invalid', now(), now(), false, false),
  ('b2200000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'attachment-b@qa.invalid', now(), now(), false, false);

insert into public.vehicles (id, owner_id, brand, model, current_km, fuel_type, body_type)
values
  ('a2210000-0000-4000-8000-000000000001', 'a2200000-0000-4000-8000-000000000001',
   'QA', 'Attachment A', 1000, 'gasoline', 'sedan'),
  ('b2210000-0000-4000-8000-000000000002', 'b2200000-0000-4000-8000-000000000002',
   'QA', 'Attachment B', 1000, 'gasoline', 'sedan');

insert into public.expertise_reports (
  id, vehicle_id, owner_id, report_number, attachment_path
) values (
  'b2220000-0000-4000-8000-000000000002',
  'b2210000-0000-4000-8000-000000000002',
  'b2200000-0000-4000-8000-000000000002',
  'B-REPORT', null
);

insert into public.attachments (
  id, owner_id, vehicle_id, parent_type, parent_id, source,
  original_filename, storage_path, mime_type, size_bytes
) values (
  'b2240000-0000-4000-8000-000000000002',
  'b2200000-0000-4000-8000-000000000002',
  'b2210000-0000-4000-8000-000000000002',
  'expertise_report', 'b2220000-0000-4000-8000-000000000002',
  'document', 'private.pdf',
  'b2200000-0000-4000-8000-000000000002/b2210000-0000-4000-8000-000000000002/expertise_report/b2220000-0000-4000-8000-000000000002/b2240000-0000-4000-8000-000000000002.pdf',
  'application/pdf', 100
);

insert into public.attachments (
  id, owner_id, vehicle_id, parent_type, parent_id, source,
  original_filename, storage_path, mime_type, size_bytes
) values (
  'a2240000-0000-4000-8000-000000000020',
  'a2200000-0000-4000-8000-000000000001',
  'a2210000-0000-4000-8000-000000000001',
  'expertise_report', 'a2220000-0000-4000-8000-000000000020',
  'document', 'belge.pdf',
  'a2200000-0000-4000-8000-000000000001/a2210000-0000-4000-8000-000000000001/expertise_report/a2220000-0000-4000-8000-000000000020/a2240000-0000-4000-8000-000000000020.pdf',
  'application/pdf', 100
);

do $$
declare
  v_reservation record;
  v_path text;
  v_attachment_id uuid;
  v_blocked boolean := false;
begin
  select * into v_reservation from public.reserve_attachment_upload_for_parent(
    'a2200000-0000-4000-8000-000000000001',
    'a2210000-0000-4000-8000-000000000001',
    'expertise_report',
    'a2220000-0000-4000-8000-000000000001',
    'camera', 'camera.jpg', 1024, 'image/jpeg',
    'a2230000-0000-4000-8000-000000000001'
  );
  v_path := v_reservation.object_path;
  v_attachment_id := v_reservation.attachment_id;
  if v_path !~ '^a2200000-0000-4000-8000-000000000001/a2210000-0000-4000-8000-000000000001/expertise_report/a2220000-0000-4000-8000-000000000001/[0-9a-f-]+[.]jpg$' then
    raise exception 'parent-scoped random object path is invalid';
  end if;
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values ('vehicle-attachments', v_path, 'a2200000-0000-4000-8000-000000000001',
          '{"size":1024,"mimetype":"image/jpeg"}'::jsonb);
  if not public.mark_attachment_uploaded(v_reservation.reservation_id, 'a2200000-0000-4000-8000-000000000001') then
    raise exception 'uploaded reservation was not marked';
  end if;

  -- Idempotent retry returns the same attachment and path.
  select * into v_reservation from public.reserve_attachment_upload_for_parent(
    'a2200000-0000-4000-8000-000000000001',
    'a2210000-0000-4000-8000-000000000001',
    'expertise_report', 'a2220000-0000-4000-8000-000000000001',
    'camera', 'camera.jpg', 1024, 'image/jpeg',
    'a2230000-0000-4000-8000-000000000001'
  );
  if v_reservation.object_path <> v_path or v_reservation.attachment_id <> v_attachment_id then
    raise exception 'idempotent parent reservation changed identity';
  end if;

  begin
    perform public.reserve_attachment_upload_for_parent(
      'a2200000-0000-4000-8000-000000000001',
      'b2210000-0000-4000-8000-000000000002',
      'expertise_report', 'b2220000-0000-4000-8000-000000000002',
      'document', 'foreign.pdf', 100, 'application/pdf',
      'a2230000-0000-4000-8000-000000000009'
    );
  exception when others then v_blocked := sqlerrm like '%ATTACHMENT_VEHICLE_FORBIDDEN%'; end;
  if not v_blocked then raise exception 'foreign parent reservation was accepted'; end if;
end $$;

select set_config(
  'qa.attachment_path',
  (select object_path from public.attachment_upload_reservations
   where request_id = 'a2230000-0000-4000-8000-000000000001'),
  true
);

select set_config(
  'qa.storage_policy_path',
  (
    select object_path from public.reserve_attachment_upload_for_parent(
      'a2200000-0000-4000-8000-000000000001',
      'a2210000-0000-4000-8000-000000000001',
      'expertise_report', 'a2220000-0000-4000-8000-000000000030',
      'gallery', 'galeri-fotografi.jpg', 100, 'image/jpeg',
      'a2230000-0000-4000-8000-000000000030'
    )
  ),
  true
);

select set_config('request.jwt.claim.sub', 'a2200000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a2200000-0000-4000-8000-000000000001","role":"authenticated"}', true
);
set local role authenticated;

do $$
declare v_blocked boolean := false;
begin
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values (
    'vehicle-attachments', current_setting('qa.storage_policy_path'),
    'a2200000-0000-4000-8000-000000000001',
    '{"size":100,"mimetype":"image/jpeg"}'::jsonb
  );
  begin
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'vehicle-attachments',
      'b2200000-0000-4000-8000-000000000002/b2210000-0000-4000-8000-000000000002/expertise_report/b2220000-0000-4000-8000-000000000002/a2240000-0000-4000-8000-000000000099.jpg',
      'a2200000-0000-4000-8000-000000000001',
      '{"size":100,"mimetype":"image/jpeg"}'::jsonb
    );
  exception when insufficient_privilege then v_blocked := true; end;
  if not v_blocked then raise exception 'foreign/unreserved Storage path insert was accepted'; end if;
end $$;

do $$
declare
  v_path text;
  v_saved public.expertise_reports%rowtype;
  v_count integer;
  v_blocked boolean := false;
begin
  v_path := current_setting('qa.attachment_path');
  select * into v_saved from public.save_expertise_report_with_attachments(
    'a2220000-0000-4000-8000-000000000001',
    'a2210000-0000-4000-8000-000000000001',
    '2026-08-11', 'QA', null, 'A-REPORT', false, pg_catalog.jsonb_build_array(v_path)
  );
  if v_saved.id <> 'a2220000-0000-4000-8000-000000000001' then
    raise exception 'expertise parent was not created';
  end if;
  select count(*) into v_count from public.attachments
  where parent_id = v_saved.id and source = 'camera' and storage_path = v_path;
  if v_count <> 1 then raise exception 'attachment metadata was not linked atomically'; end if;
  select count(*) into v_count from public.attachments
  where owner_id = 'b2200000-0000-4000-8000-000000000002';
  if v_count <> 0 then raise exception 'cross-user attachment metadata leaked'; end if;
  begin
    perform public.save_expertise_report_with_attachments(
      'b2220000-0000-4000-8000-000000000002',
      'b2210000-0000-4000-8000-000000000002',
      '2026-08-11', 'forbidden', null, null, true, '[]'::jsonb
    );
  exception when others then
    v_blocked := sqlerrm like '%ATTACHMENT_VEHICLE_FORBIDDEN%';
  end;
  if not v_blocked then raise exception 'cross-user expertise save was accepted'; end if;
  v_blocked := false;
  begin
    perform public.save_expertise_report_with_attachments(
      'a2220000-0000-4000-8000-000000000020',
      'a2210000-0000-4000-8000-000000000001',
      '2026-08-11', 'missing object', null, null, false,
      pg_catalog.jsonb_build_array(
        'a2200000-0000-4000-8000-000000000001/a2210000-0000-4000-8000-000000000001/expertise_report/a2220000-0000-4000-8000-000000000020/a2240000-0000-4000-8000-000000000020.pdf'
      )
    );
  exception when others then
    v_blocked := sqlerrm like '%ATTACHMENT_REFERENCE_INVALID%';
  end;
  if not v_blocked then raise exception 'missing Storage object was accepted as a valid attachment'; end if;
end $$;

reset role;

do $$
declare v_report uuid := 'a2220000-0000-4000-8000-000000000001'; v_blocked boolean := false;
begin
  -- Four additional mixed-source reservations plus the completed camera file fill the shared pool.
  perform public.reserve_attachment_upload_for_parent(
    'a2200000-0000-4000-8000-000000000001', 'a2210000-0000-4000-8000-000000000001',
    'expertise_report', v_report, 'gallery', 'gallery.jpg', 100, 'image/jpeg',
    'a2230000-0000-4000-8000-000000000002');
  perform public.reserve_attachment_upload_for_parent(
    'a2200000-0000-4000-8000-000000000001', 'a2210000-0000-4000-8000-000000000001',
    'expertise_report', v_report, 'document', 'one.pdf', 100, 'application/pdf',
    'a2230000-0000-4000-8000-000000000003');
  perform public.reserve_attachment_upload_for_parent(
    'a2200000-0000-4000-8000-000000000001', 'a2210000-0000-4000-8000-000000000001',
    'expertise_report', v_report, 'camera', 'second.jpg', 100, 'image/jpeg',
    'a2230000-0000-4000-8000-000000000004');
  perform public.reserve_attachment_upload_for_parent(
    'a2200000-0000-4000-8000-000000000001', 'a2210000-0000-4000-8000-000000000001',
    'expertise_report', v_report, 'document', 'two.pdf', 100, 'application/pdf',
    'a2230000-0000-4000-8000-000000000005');
  begin
    perform public.reserve_attachment_upload_for_parent(
      'a2200000-0000-4000-8000-000000000001', 'a2210000-0000-4000-8000-000000000001',
      'expertise_report', v_report, 'gallery', 'blocked.jpg', 100, 'image/jpeg',
      'a2230000-0000-4000-8000-000000000006');
  exception when others then v_blocked := sqlerrm like '%ATTACHMENT_ENTITY_COUNT_EXCEEDED%'; end;
  if not v_blocked then raise exception 'mixed-source entity count limit was bypassed'; end if;
end $$;

do $$
declare
  v_report uuid := 'a2220000-0000-4000-8000-000000000010';
  v_blocked boolean := false;
begin
  perform public.reserve_attachment_upload_for_parent(
    'a2200000-0000-4000-8000-000000000001', 'a2210000-0000-4000-8000-000000000001',
    'expertise_report', v_report, 'camera', 'one.jpg', 5242880, 'image/jpeg',
    'a2230000-0000-4000-8000-000000000011');
  perform public.reserve_attachment_upload_for_parent(
    'a2200000-0000-4000-8000-000000000001', 'a2210000-0000-4000-8000-000000000001',
    'expertise_report', v_report, 'gallery', 'two.jpg', 5242880, 'image/jpeg',
    'a2230000-0000-4000-8000-000000000012');
  perform public.reserve_attachment_upload_for_parent(
    'a2200000-0000-4000-8000-000000000001', 'a2210000-0000-4000-8000-000000000001',
    'expertise_report', v_report, 'document', 'three.pdf', 5242880, 'application/pdf',
    'a2230000-0000-4000-8000-000000000013');
  begin
    perform public.reserve_attachment_upload_for_parent(
      'a2200000-0000-4000-8000-000000000001', 'a2210000-0000-4000-8000-000000000001',
      'expertise_report', v_report, 'document', 'blocked.pdf', 1, 'application/pdf',
      'a2230000-0000-4000-8000-000000000014');
  exception when others then
    v_blocked := sqlerrm like '%ATTACHMENT_ENTITY_BYTES_EXCEEDED%';
  end;
  if not v_blocked then raise exception 'mixed-source entity byte limit was bypassed'; end if;
end $$;

select set_config('request.jwt.claim.sub', 'a2200000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a2200000-0000-4000-8000-000000000001","role":"authenticated"}', true
);
set local role authenticated;

do $$
declare v_count integer;
begin
  if not public.delete_expertise_report_consistent('a2220000-0000-4000-8000-000000000001') then
    raise exception 'own expertise delete failed';
  end if;
  select count(*) into v_count from public.attachments
  where parent_id = 'a2220000-0000-4000-8000-000000000001';
  if v_count <> 0 then raise exception 'expertise delete left attachment metadata'; end if;
end $$;

reset role;

do $$
declare v_count integer;
begin
  select count(*) into v_count from public.attachment_cleanup_queue
  where owner_id = 'a2200000-0000-4000-8000-000000000001';
  if v_count < 1 then raise exception 'expertise delete did not queue object cleanup'; end if;
end $$;
rollback;
