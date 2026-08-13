begin;

do $$
declare v_rls boolean; v_definer boolean; v_config text[];
begin
  select relrowsecurity into v_rls from pg_class where oid = 'public.user_entitlements'::regclass;
  if not v_rls then raise exception 'user_entitlements RLS is disabled'; end if;
  if has_table_privilege('anon', 'public.user_entitlements', 'SELECT')
    or has_table_privilege('authenticated', 'public.user_entitlements', 'INSERT')
    or has_table_privilege('authenticated', 'public.user_entitlements', 'UPDATE')
    or has_table_privilege('authenticated', 'public.user_entitlements', 'DELETE') then
    raise exception 'client entitlement grants are unsafe';
  end if;
  select prosecdef, proconfig into v_definer, v_config
  from pg_proc where oid = 'private.effective_plan_for_user(uuid)'::regprocedure;
  if v_definer or not ('search_path=""' = any(v_config)) then
    raise exception 'effective plan helper security context is unsafe'; end if;
  if has_function_privilege('anon', 'private.effective_plan_for_user(uuid)', 'EXECUTE')
    or has_function_privilege('authenticated', 'private.effective_plan_for_user(uuid)', 'EXECUTE') then
    raise exception 'private plan helper is client callable'; end if;
end $$;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('a2800000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'entitlement-a@qa.invalid', now(), now(), false, false),
  ('b2800000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'entitlement-b@qa.invalid', now(), now(), false, false)
on conflict (id) do nothing;
insert into public.user_entitlements (user_id, plan_id, source, valid_until)
values ('a2800000-0000-4000-8000-000000000001', 'premium', 'support', now() + interval '1 day'),
       ('b2800000-0000-4000-8000-000000000002', 'premium', 'support', now() - interval '1 day');
do $$
begin
  if private.effective_plan_for_user('a2800000-0000-4000-8000-000000000001') <> 'premium' then raise exception 'active premium not resolved'; end if;
  if private.effective_plan_for_user('b2800000-0000-4000-8000-000000000002') <> 'free'
    or private.effective_plan_for_user('c2800000-0000-4000-8000-000000000003') <> 'free' then raise exception 'fallback unsafe'; end if;
end $$;
select set_config('request.jwt.claim.sub', 'a2800000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"a2800000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare v_count integer; v_blocked boolean := false;
begin
  select count(*) into v_count from public.user_entitlements;
  if v_count <> 1 then raise exception 'cross-user entitlement read leaked'; end if;
  begin insert into public.user_entitlements (user_id, plan_id, source)
    values ('a2800000-0000-4000-8000-000000000001', 'premium', 'billing');
  exception when insufficient_privilege then v_blocked := true; end;
  if not v_blocked then raise exception 'client self-upgrade succeeded'; end if;
end $$;
rollback;
