begin;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('d3600000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'billing-a@qa.invalid', now(), now(), false, false),
  ('d3600000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'billing-support@qa.invalid', now(), now(), false, false);

insert into public.vehicles(id, owner_id, brand, model, year, current_km, fuel_type, body_type)
values ('d3610000-0000-4000-8000-000000000001', 'd3600000-0000-4000-8000-000000000001', 'Test', 'Vehicle', 2025, 1000, 'gasoline', 'sedan_hatchback');

do $$
declare v_definer boolean; v_config text[];
begin
  select prosecdef, proconfig into v_definer, v_config
  from pg_proc
  where oid = 'public.process_revenuecat_subscription_event(text,uuid,text,text,text,timestamptz,boolean,timestamptz,text)'::regprocedure;
  if not v_definer or not ('search_path=""' = any(v_config)) then
    raise exception 'RevenueCat sync function security context is unsafe';
  end if;
  if pg_get_functiondef('public.process_revenuecat_subscription_event(text,uuid,text,text,text,timestamptz,boolean,timestamptz,text)'::regprocedure)
    not like '%pg_advisory_xact_lock%' then
    raise exception 'RevenueCat sync function does not serialize concurrent user events';
  end if;
  if has_function_privilege('anon', 'public.process_revenuecat_subscription_event(text,uuid,text,text,text,timestamptz,boolean,timestamptz,text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.process_revenuecat_subscription_event(text,uuid,text,text,text,timestamptz,boolean,timestamptz,text)', 'EXECUTE') then
    raise exception 'RevenueCat sync function is client callable';
  end if;
  if not has_function_privilege('service_role', 'public.process_revenuecat_subscription_event(text,uuid,text,text,text,timestamptz,boolean,timestamptz,text)', 'EXECUTE') then
    raise exception 'RevenueCat sync function is unavailable to the trusted Edge role';
  end if;
  if has_table_privilege('authenticated', 'public.billing_webhook_events', 'SELECT')
    or has_table_privilege('authenticated', 'public.billing_webhook_events', 'INSERT')
    or has_table_privilege('authenticated', 'public.user_entitlements', 'UPDATE') then
    raise exception 'Client can read billing events or forge Premium';
  end if;
end $$;

do $$
declare result text; row_count_before integer;
begin
  result := public.process_revenuecat_subscription_event(
    'event-active', 'd3600000-0000-4000-8000-000000000001', 'INITIAL_PURCHASE', 'active',
    'premium_monthly', now() + interval '30 days', true, now(), 'SANDBOX'
  );
  if result <> 'applied' or (select plan_id from public.user_entitlements where user_id = 'd3600000-0000-4000-8000-000000000001') <> 'premium' then
    raise exception 'Active Premium was not applied';
  end if;

  select count(*) into row_count_before from public.billing_webhook_events;
  result := public.process_revenuecat_subscription_event(
    'event-active', 'd3600000-0000-4000-8000-000000000001', 'INITIAL_PURCHASE', 'active',
    'premium_monthly', now() + interval '30 days', true, now(), 'SANDBOX'
  );
  if result <> 'duplicate' or (select count(*) from public.billing_webhook_events) <> row_count_before then
    raise exception 'Duplicate webhook was not idempotent';
  end if;

  result := public.process_revenuecat_subscription_event(
    'event-cancel', 'd3600000-0000-4000-8000-000000000001', 'CANCELLATION', 'cancelled',
    'premium_monthly', now() + interval '20 days', false, now() + interval '1 minute', 'SANDBOX'
  );
  if result <> 'applied' or (select plan_id from public.user_entitlements where user_id = 'd3600000-0000-4000-8000-000000000001') <> 'premium' then
    raise exception 'Cancelled subscription did not remain active until expiration';
  end if;

  result := public.process_revenuecat_subscription_event(
    'event-stale', 'd3600000-0000-4000-8000-000000000001', 'RENEWAL', 'active',
    'premium_monthly', now() + interval '40 days', true, now() - interval '1 minute', 'SANDBOX'
  );
  if result <> 'stale' or (select provider_status from public.user_entitlements where user_id = 'd3600000-0000-4000-8000-000000000001') <> 'cancelled' then
    raise exception 'Stale webhook overwrote newer subscription state';
  end if;

  result := public.process_revenuecat_subscription_event(
    'event-expired', 'd3600000-0000-4000-8000-000000000001', 'EXPIRATION', 'expired',
    'premium_monthly', now() - interval '1 second', false, now() + interval '2 minutes', 'PRODUCTION'
  );
  if result <> 'applied' or (select plan_id from public.user_entitlements where user_id = 'd3600000-0000-4000-8000-000000000001') <> 'free' then
    raise exception 'Expired subscription did not fail Free';
  end if;
  if not exists (select 1 from public.vehicles where id = 'd3610000-0000-4000-8000-000000000001') then
    raise exception 'Downgrade deleted existing vehicle data';
  end if;
end $$;

insert into public.user_entitlements(user_id, plan_id, source)
values ('d3600000-0000-4000-8000-000000000002', 'premium', 'support');
do $$
declare result text;
begin
  result := public.process_revenuecat_subscription_event(
    'event-support-expired', 'd3600000-0000-4000-8000-000000000002', 'EXPIRATION', 'expired',
    'premium_monthly', now() - interval '1 day', false, now(), 'PRODUCTION'
  );
  if result <> 'support_override' or (select plan_id from public.user_entitlements where user_id = 'd3600000-0000-4000-8000-000000000002') <> 'premium' then
    raise exception 'Live support grant was overwritten by billing event';
  end if;
end $$;

select set_config('request.jwt.claim.sub', 'd3600000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"d3600000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare blocked boolean := false; visible_entitlements integer;
begin
  select count(*) into visible_entitlements from public.user_entitlements;
  if visible_entitlements <> 1 then raise exception 'Own entitlement read is not owner-scoped'; end if;
  begin
    update public.user_entitlements set plan_id = 'premium' where user_id = 'd3600000-0000-4000-8000-000000000001';
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'Authenticated client forged Premium'; end if;
  blocked := false;
  begin
    perform public.process_revenuecat_subscription_event(
      'event-forged', 'd3600000-0000-4000-8000-000000000001', 'INITIAL_PURCHASE', 'active',
      'forged', null, true, now(), 'PRODUCTION'
    );
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'Authenticated client invoked billing sync RPC'; end if;
end $$;
reset role;

rollback;
