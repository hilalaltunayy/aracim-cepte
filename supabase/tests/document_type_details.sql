begin;

do $$
declare v_rls boolean; v_definer boolean; v_config text[];
begin
  select relrowsecurity into v_rls
  from pg_class where oid = 'public.vehicle_documents'::regclass;
  if not v_rls then raise exception 'vehicle_documents RLS is disabled'; end if;
  if has_function_privilege(
    'anon',
    'public.save_vehicle_document_with_attachments(uuid,uuid,public.document_type,text,text,text,date,date,date,text,boolean,jsonb)',
    'EXECUTE'
  ) then raise exception 'anon can execute document save RPC'; end if;
  if not has_function_privilege(
    'authenticated',
    'public.save_vehicle_document_with_attachments(uuid,uuid,public.document_type,text,text,text,date,date,date,text,boolean,jsonb)',
    'EXECUTE'
  ) then raise exception 'authenticated cannot execute document save RPC'; end if;
  if has_function_privilege(
    'authenticated',
    'public.reserve_attachment_upload_for_parent(uuid,uuid,text,uuid,text,text,bigint,text,uuid)',
    'EXECUTE'
  ) then raise exception 'attachment reservation is client callable'; end if;
  select prosecdef, proconfig into v_definer, v_config from pg_proc
  where oid = 'public.save_vehicle_document_with_attachments(uuid,uuid,public.document_type,text,text,text,date,date,date,text,boolean,jsonb)'::regprocedure;
  if not v_definer or not ('search_path=""' = any(v_config)) then
    raise exception 'document save RPC security context is unsafe';
  end if;
end $$;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('a2300000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'document-a@qa.invalid', now(), now(), false, false),
  ('b2300000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'document-b@qa.invalid', now(), now(), false, false);

insert into public.vehicles (id, owner_id, brand, model, current_km, fuel_type, body_type)
values
  ('a2310000-0000-4000-8000-000000000001', 'a2300000-0000-4000-8000-000000000001',
   'QA', 'Document A', 1000, 'gasoline', 'sedan'),
  ('b2310000-0000-4000-8000-000000000002', 'b2300000-0000-4000-8000-000000000002',
   'QA', 'Document B', 1000, 'gasoline', 'sedan');

insert into public.vehicle_documents (
  id, vehicle_id, owner_id, document_type, title, issue_date
) values
  (
    'a2320000-0000-4000-8000-000000000003',
    'a2310000-0000-4000-8000-000000000001',
    'a2300000-0000-4000-8000-000000000001',
    'registration', 'Legacy registration', '2025-01-01'
  ),
  (
    'b2320000-0000-4000-8000-000000000002',
    'b2310000-0000-4000-8000-000000000002',
    'b2300000-0000-4000-8000-000000000002',
    'traffic_insurance', 'Private B policy', '2026-01-01'
  );

do $$
declare v_reservation record;
begin
  select * into v_reservation from public.reserve_attachment_upload_for_parent(
    'a2300000-0000-4000-8000-000000000001',
    'a2310000-0000-4000-8000-000000000001',
    'vehicle_document',
    'a2320000-0000-4000-8000-000000000001',
    'document', 'policy.pdf', 1024, 'application/pdf',
    'a2330000-0000-4000-8000-000000000001'
  );
  if v_reservation.object_path !~ '/vehicle_document/' then
    raise exception 'vehicle document path is not parent scoped';
  end if;
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values (
    'vehicle-attachments', v_reservation.object_path,
    'a2300000-0000-4000-8000-000000000001',
    '{"size":1024,"mimetype":"application/pdf"}'::jsonb
  );
  if not public.mark_attachment_uploaded(
    v_reservation.reservation_id,
    'a2300000-0000-4000-8000-000000000001'
  ) then raise exception 'vehicle document upload was not marked'; end if;
  perform set_config('qa.document_attachment_path', v_reservation.object_path, true);
end $$;

select set_config('request.jwt.claim.sub', 'a2300000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a2300000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  v_saved public.vehicle_documents%rowtype;
  v_count integer;
  v_invalid boolean := false;
  v_forbidden boolean := false;
  v_path text := current_setting('qa.document_attachment_path');
begin
  select count(*) into v_count from public.vehicle_documents
  where id = 'b2320000-0000-4000-8000-000000000002';
  if v_count <> 0 then raise exception 'cross-owner document read leaked'; end if;

  select * into v_saved from public.save_vehicle_document_with_attachments(
    'a2320000-0000-4000-8000-000000000001',
    'a2310000-0000-4000-8000-000000000001',
    'traffic_insurance', 'Trafik sigortası', 'POL-123', 'QA Sigorta',
    '2026-01-01', null, '2027-01-01', null, false,
    pg_catalog.jsonb_build_array(v_path)
  );
  if v_saved.issuer_name <> 'QA Sigorta'
    or v_saved.start_date <> '2026-01-01'
    or v_saved.expiry_date <> '2027-01-01'
    or v_saved.issue_date <> '2026-01-01' then
    raise exception 'normalized insurance metadata was not saved';
  end if;
  select count(*) into v_count from public.attachments
  where parent_type = 'vehicle_document' and parent_id = v_saved.id and storage_path = v_path;
  if v_count <> 1 then raise exception 'document attachment metadata was not linked atomically'; end if;

  begin
    perform public.save_vehicle_document_with_attachments(
      'a2320000-0000-4000-8000-000000000004',
      'a2310000-0000-4000-8000-000000000001',
      'inspection', 'Muayene', null, null, null,
      '2028-01-01', '2027-01-01', null, false, '[]'::jsonb
    );
  exception when others then v_invalid := sqlerrm like '%DOCUMENT_DATE_ORDER_INVALID%'; end;
  if not v_invalid then raise exception 'invalid inspection date order was accepted'; end if;

  perform public.save_vehicle_document_with_attachments(
    'a2320000-0000-4000-8000-000000000005',
    'a2310000-0000-4000-8000-000000000001',
    'registration', 'Ruhsat', 'SERIAL', null, null,
    '2026-02-01', null, null, false, '[]'::jsonb
  );
  select event_date, issue_date into v_saved.event_date, v_saved.issue_date
  from public.vehicle_documents where id = 'a2320000-0000-4000-8000-000000000005';
  if v_saved.event_date <> '2026-02-01' or v_saved.issue_date <> '2026-02-01' then
    raise exception 'normalized event date was not kept backward compatible';
  end if;

  begin
    perform public.save_vehicle_document_with_attachments(
      'b2320000-0000-4000-8000-000000000002',
      'b2310000-0000-4000-8000-000000000002',
      'traffic_insurance', 'Foreign', null, null, null, null, null, null, true, '[]'::jsonb
    );
  exception when others then
    v_forbidden := sqlerrm like '%ATTACHMENT_VEHICLE_FORBIDDEN%';
  end;
  if not v_forbidden then raise exception 'cross-owner document write was accepted'; end if;

  update public.vehicle_documents set title = 'Tampered'
  where id = 'b2320000-0000-4000-8000-000000000002';
  if found then raise exception 'cross-owner document update succeeded'; end if;

  delete from public.vehicle_documents where id = 'a2320000-0000-4000-8000-000000000001';
  select count(*) into v_count from public.attachments
  where parent_type = 'vehicle_document' and parent_id = 'a2320000-0000-4000-8000-000000000001';
  if v_count <> 0 then raise exception 'document attachment metadata survived parent deletion'; end if;
  select count(*) into v_count from public.vehicle_documents
  where id = 'a2320000-0000-4000-8000-000000000003'
    and event_date = '2025-01-01';
  if v_count <> 1 then raise exception 'legacy issue date did not map to event date'; end if;
end $$;

reset role;

do $$
declare v_count integer; v_path text := current_setting('qa.document_attachment_path');
begin
  select count(*) into v_count from public.attachment_cleanup_queue
  where owner_id = 'a2300000-0000-4000-8000-000000000001' and object_path = v_path;
  if v_count <> 1 then raise exception 'document attachment cleanup was not queued'; end if;
end $$;

rollback;
