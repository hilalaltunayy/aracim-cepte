-- TASK-045: on-demand RevenueCat reconciliation stays service-role-only and never
-- lets a client self-grant Premium, while still closing the webhook latency gap.
begin;

insert into auth.users (id, aud, role, email, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('d4500000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'reconcile-a@qa.invalid', now(), now(), false, false),
  ('d4500000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'reconcile-support@qa.invalid', now(), now(), false, false);

do $$
declare
  v_definer boolean;
  v_config text[];
  v_signature text := 'public.reconcile_revenuecat_subscriber_state(uuid,text,text,timestamptz,boolean,timestamptz,text)';
begin
  select prosecdef, proconfig into v_definer, v_config from pg_proc where oid = v_signature::regprocedure;
  if not v_definer or not ('search_path=""' = any(v_config)) then
    raise exception 'Reconciliation function security context is unsafe';
  end if;
  if pg_get_functiondef(v_signature::regprocedure) not like '%pg_advisory_xact_lock%' then
    raise exception 'Reconciliation function does not serialize against webhook events';
  end if;
  -- The whole security argument: a client can never call this directly.
  if has_function_privilege('anon', v_signature, 'EXECUTE')
    or has_function_privilege('authenticated', v_signature, 'EXECUTE') then
    raise exception 'Reconciliation function is client callable';
  end if;
  if not has_function_privilege('service_role', v_signature, 'EXECUTE') then
    raise exception 'Reconciliation function is unavailable to the trusted Edge role';
  end if;
end $$;

do $$
declare result text;
begin
  -- A store snapshot with an active entitlement mirrors Premium without a webhook.
  result := public.reconcile_revenuecat_subscriber_state(
    'd4500000-0000-4000-8000-000000000001', 'active', 'premium_monthly',
    now() + interval '30 days', true, now(), 'SANDBOX'
  );
  if result <> 'premium'
    or (select plan_id from public.user_entitlements where user_id = 'd4500000-0000-4000-8000-000000000001') <> 'premium'
    or private.effective_plan_for_user('d4500000-0000-4000-8000-000000000001') <> 'premium' then
    raise exception 'Reconciliation did not grant server-side Premium';
  end if;

  -- A newer webhook event must win over an older pull snapshot.
  perform public.process_revenuecat_subscription_event(
    'reconcile-expire', 'd4500000-0000-4000-8000-000000000001', 'EXPIRATION', 'expired',
    'premium_monthly', now() - interval '1 day', false, now() + interval '1 minute', 'SANDBOX'
  );
  result := public.reconcile_revenuecat_subscriber_state(
    'd4500000-0000-4000-8000-000000000001', 'active', 'premium_monthly',
    now() + interval '30 days', true, now(), 'SANDBOX'
  );
  if result <> 'stale'
    or private.effective_plan_for_user('d4500000-0000-4000-8000-000000000001') <> 'free' then
    raise exception 'Stale reconciliation overwrote a newer store event';
  end if;

  -- A lapsed store entitlement downgrades the mirror, and never deletes user data.
  result := public.reconcile_revenuecat_subscriber_state(
    'd4500000-0000-4000-8000-000000000001', 'expired', 'premium_monthly',
    now() - interval '1 day', false, now() + interval '2 minutes', 'SANDBOX'
  );
  if result <> 'free'
    or (select valid_until from public.user_entitlements where user_id = 'd4500000-0000-4000-8000-000000000001') is not null then
    raise exception 'Expired store state did not downgrade the mirror';
  end if;
end $$;

do $$
declare result text;
begin
  -- A live support grant outranks the store, exactly as in the webhook path.
  insert into public.user_entitlements (user_id, plan_id, source, valid_until)
  values ('d4500000-0000-4000-8000-000000000002', 'premium', 'support', now() + interval '90 days');

  result := public.reconcile_revenuecat_subscriber_state(
    'd4500000-0000-4000-8000-000000000002', 'free', null, null, null, now(), 'PRODUCTION'
  );
  if result <> 'support_override'
    or private.effective_plan_for_user('d4500000-0000-4000-8000-000000000002') <> 'premium' then
    raise exception 'Support grant was overwritten by a store snapshot';
  end if;
end $$;

do $$
declare result text;
begin
  result := public.reconcile_revenuecat_subscriber_state(
    '00000000-0000-4000-8000-00000000dead', 'active', 'premium_monthly',
    now() + interval '30 days', true, now(), 'SANDBOX'
  );
  if result <> 'unknown_user' then
    raise exception 'Reconciliation accepted an unknown user id';
  end if;
end $$;

do $$
begin
  begin
    perform public.reconcile_revenuecat_subscriber_state(
      'd4500000-0000-4000-8000-000000000001', 'super_premium', null, null, null, now(), 'SANDBOX'
    );
    raise exception 'Reconciliation accepted an invalid status';
  exception when others then
    if sqlerrm = 'Reconciliation accepted an invalid status' then raise; end if;
  end;
end $$;

rollback;
