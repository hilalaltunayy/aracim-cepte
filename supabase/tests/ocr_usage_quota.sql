begin;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('c3000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'ocr-free@qa.invalid', now(), now(), false, false),
  ('d3000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'ocr-premium@qa.invalid', now(), now(), false, false);
insert into public.user_entitlements(user_id, plan_id, source) values
  ('d3000000-0000-4000-8000-000000000002','premium','support');

select set_config('request.jwt.claim.sub','c3000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"c3000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select * from public.reserve_ocr_usage('c3010000-0000-4000-8000-000000000001','document');
select * from public.commit_ocr_usage('c3010000-0000-4000-8000-000000000001');
select * from public.reserve_ocr_usage('c3010000-0000-4000-8000-000000000001','document');
select * from public.commit_ocr_usage('c3010000-0000-4000-8000-000000000001');
do $$
declare blocked boolean := false; n integer;
begin
  perform public.reserve_ocr_usage('c3010000-0000-4000-8000-000000000002','fuel_receipt');
  perform public.commit_ocr_usage('c3010000-0000-4000-8000-000000000002');
  perform public.reserve_ocr_usage('c3010000-0000-4000-8000-000000000003','maintenance_receipt');
  perform public.commit_ocr_usage('c3010000-0000-4000-8000-000000000003');
  begin perform public.reserve_ocr_usage(pg_catalog.gen_random_uuid(),'maintenance_receipt');
  exception when others then blocked := sqlerrm like '%OCR_MONTHLY_QUOTA_EXCEEDED%'; end;
  if not blocked then raise exception 'Free OCR quota bypassed'; end if;
  if has_table_privilege('authenticated','public.ocr_usage_reservations','INSERT')
    or has_table_privilege('authenticated','public.ocr_usage_reservations','UPDATE')
    or has_table_privilege('authenticated','public.ocr_usage_reservations','DELETE') then
    raise exception 'client can mutate OCR usage'; end if;
  if has_table_privilege('authenticated','public.user_entitlements','INSERT')
    or has_table_privilege('authenticated','public.user_entitlements','UPDATE')
    or has_table_privilege('authenticated','public.user_entitlements','DELETE') then
    raise exception 'client can mutate entitlements'; end if;
  if has_function_privilege('anon', 'public.reserve_ocr_usage(uuid,text)'::regprocedure, 'EXECUTE')
    or has_function_privilege('anon', 'public.commit_ocr_usage(uuid)'::regprocedure, 'EXECUTE')
    or has_function_privilege('anon', 'public.release_ocr_usage(uuid)'::regprocedure, 'EXECUTE')
    or has_function_privilege('anon', 'public.get_my_ocr_usage()'::regprocedure, 'EXECUTE') then
    raise exception 'anon can execute OCR quota RPC'; end if;
  select count(*) into n from public.ocr_usage_reservations where user_id='d3000000-0000-4000-8000-000000000002';
  if n <> 0 then raise exception 'foreign OCR usage leaked'; end if;
end $$;

select set_config('request.jwt.claim.sub','d3000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"d3000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select * from public.reserve_ocr_usage('d3010000-0000-4000-8000-000000000001','document');

select set_config('request.jwt.claim.sub','c3000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"c3000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$
declare blocked boolean := false;
begin
  begin
    perform public.commit_ocr_usage('d3010000-0000-4000-8000-000000000001');
  exception when others then
    blocked := sqlerrm like '%OCR_RESERVATION_NOT_FOUND%';
  end;
  if not blocked then raise exception 'foreign OCR reservation commit was accepted'; end if;
  if public.release_ocr_usage('d3010000-0000-4000-8000-000000000001') then
    raise exception 'foreign OCR reservation release was accepted';
  end if;
end $$;
reset role;

rollback;
