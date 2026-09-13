-- TASK-012: an auto-renewing subscription stays entitled across the renewal boundary.
--
-- Root cause of the "Araç limitinize ulaştınız" P0: both mirror write paths stored
-- `valid_until = provider_expires_at`, the END OF THE CURRENT BILLING PERIOD, with no
-- allowance for the delay before the RENEWAL event that extends it.
-- `private.effective_plan_for_user` hard-expires on that instant, so every gap between a
-- period end and the next RENEWAL webhook silently demoted an actively-subscribed user to
-- Free server-side: `private.max_vehicles_for_user` returned 1 and
-- `public.create_vehicle_with_limit` raised VEHICLE_LIMIT_REACHED while RevenueCat and the
-- client both still reported Premium.
--
-- Measured on the failing account (9ec5ce2b…, 2026-09-12): the subscription was active
-- 09:55:39-10:31:55 UTC, yet the mirror lapsed in EVERY renewal interval (79-323 s per gap,
-- ~17.5 min of the ~36 min total). The failing create attempt at 10:01 UTC landed inside the
-- first 323 s lapse.
--
-- Fix: the entitlement window ends at the period end ONLY when nothing is going to renew it.
-- While the provider reports an active, auto-renewing subscription the window carries a
-- bounded grace that absorbs renewal latency. A cancelled, billing-issue, non-renewing or
-- expired subscription keeps its exact hard period end, so a genuine expiry still demotes
-- immediately and no client can self-grant anything.

create schema if not exists private;

-- Bounded: a lost RENEWAL event can extend Premium by at most this long, and any
-- EXPIRATION/CANCELLATION event or `sync-entitlement` pull revokes it sooner.
create or replace function private.revenuecat_renewal_grace()
returns interval
language sql
immutable
set search_path = ''
as $fn$ select interval '1 hour' $fn$;

-- The single source of truth for "when does this entitlement actually end".
create or replace function private.revenuecat_entitlement_window(
  p_status text,
  p_expires_at timestamptz,
  p_will_renew boolean
)
returns timestamptz
language sql
immutable
set search_path = ''
as $fn$
  select case
    -- No scheduled end at all (lifetime / non-expiring entitlement).
    when p_expires_at is null then null
    -- Still renewing: the period end is not the entitlement end.
    when p_status = 'active' and pg_catalog.coalesce(p_will_renew, false)
      then p_expires_at + private.revenuecat_renewal_grace()
    -- Nothing will extend it: the period end is final.
    else p_expires_at
  end;
$fn$;

revoke all on function private.revenuecat_renewal_grace()
  from public, anon, authenticated, service_role;
revoke all on function private.revenuecat_entitlement_window(text, timestamptz, boolean)
  from public, anon, authenticated, service_role;

comment on function private.revenuecat_entitlement_window(text, timestamptz, boolean) is
  'Entitlement end for a RevenueCat subscription. Auto-renewing subscriptions carry a bounded renewal grace; everything else ends exactly at the provider expiry.';

create or replace function public.process_revenuecat_subscription_event(
  p_event_id text,
  p_user_id uuid,
  p_event_type text,
  p_status text,
  p_product_id text,
  p_expires_at timestamptz,
  p_will_renew boolean,
  p_event_at timestamptz,
  p_environment text
)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_inserted integer;
  v_existing public.user_entitlements%rowtype;
  v_premium boolean;
  v_window timestamptz;
begin
  if p_event_id is null or pg_catalog.length(pg_catalog.btrim(p_event_id)) = 0
    or p_user_id is null
    or p_event_type is null or pg_catalog.length(pg_catalog.btrim(p_event_type)) = 0
    or p_event_at is null then
    raise exception 'invalid revenuecat event';
  end if;

  if p_status not in ('active', 'cancelled', 'billing_issue', 'expired', 'free') then
    raise exception 'invalid revenuecat status';
  end if;

  if p_environment not in ('SANDBOX', 'PRODUCTION', 'UNKNOWN') then
    raise exception 'invalid revenuecat environment';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    return 'unknown_user';
  end if;

  -- Serialize all subscription events for this user, including the first event before a row exists.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  insert into public.billing_webhook_events (
    event_id, user_id, event_type, provider_status, product_id, environment, event_at
  ) values (
    p_event_id, p_user_id, p_event_type, p_status, p_product_id, p_environment, p_event_at
  ) on conflict (event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return 'duplicate'; end if;

  select * into v_existing
  from public.user_entitlements e
  where e.user_id = p_user_id
  for update;

  if found and v_existing.provider_event_at is not null
    and v_existing.provider_event_at > p_event_at then
    return 'stale';
  end if;

  -- A live support grant remains authoritative over a store expiry/refund event.
  if found and v_existing.source = 'support' and v_existing.plan_id = 'premium'
    and (v_existing.valid_until is null or v_existing.valid_until > pg_catalog.now()) then
    return 'support_override';
  end if;

  -- Only change from the previous revision: an auto-renewing subscription does not
  -- lose its entitlement at the billing-period boundary.
  v_window := private.revenuecat_entitlement_window(p_status, p_expires_at, p_will_renew);
  v_premium := p_status in ('active', 'cancelled', 'billing_issue')
    and ((p_status = 'active' and p_expires_at is null) or v_window > pg_catalog.now());

  insert into public.user_entitlements (
    user_id,
    plan_id,
    source,
    valid_until,
    provider,
    provider_status,
    provider_product_id,
    provider_expires_at,
    provider_will_renew,
    provider_event_at
  ) values (
    p_user_id,
    case when v_premium then 'premium' else 'free' end,
    'billing',
    case when v_premium then v_window else null end,
    'revenuecat',
    p_status,
    p_product_id,
    p_expires_at,
    p_will_renew,
    p_event_at
  )
  on conflict (user_id) do update set
    plan_id = excluded.plan_id,
    source = excluded.source,
    valid_until = excluded.valid_until,
    provider = excluded.provider,
    provider_status = excluded.provider_status,
    provider_product_id = excluded.provider_product_id,
    provider_expires_at = excluded.provider_expires_at,
    provider_will_renew = excluded.provider_will_renew,
    provider_event_at = excluded.provider_event_at,
    updated_at = pg_catalog.now();

  return 'applied';
end;
$fn$;

create or replace function public.reconcile_revenuecat_subscriber_state(
  p_user_id uuid,
  p_status text,
  p_product_id text,
  p_expires_at timestamptz,
  p_will_renew boolean,
  p_observed_at timestamptz,
  p_environment text
)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_existing public.user_entitlements%rowtype;
  v_premium boolean;
  v_window timestamptz;
begin
  if p_user_id is null or p_observed_at is null then
    raise exception 'invalid revenuecat reconciliation';
  end if;

  if p_status not in ('active', 'cancelled', 'billing_issue', 'expired', 'free') then
    raise exception 'invalid revenuecat status';
  end if;

  if p_environment not in ('SANDBOX', 'PRODUCTION', 'UNKNOWN') then
    raise exception 'invalid revenuecat environment';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_user_id) then
    return 'unknown_user';
  end if;

  -- Share the webhook's per-user lock so a snapshot and an event cannot interleave.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  select * into v_existing
  from public.user_entitlements e
  where e.user_id = p_user_id
  for update;

  -- A webhook event that is newer than this snapshot already holds the truth.
  if found and v_existing.provider_event_at is not null
    and v_existing.provider_event_at >= p_observed_at then
    return 'stale';
  end if;

  -- A live support grant remains authoritative over store state, exactly as in the webhook path.
  if found and v_existing.source = 'support' and v_existing.plan_id = 'premium'
    and (v_existing.valid_until is null or v_existing.valid_until > pg_catalog.now()) then
    return 'support_override';
  end if;

  -- Same renewal-window rule as the webhook path, so a pull can never contradict a push.
  v_window := private.revenuecat_entitlement_window(p_status, p_expires_at, p_will_renew);
  v_premium := p_status in ('active', 'cancelled', 'billing_issue')
    and ((p_status = 'active' and p_expires_at is null) or v_window > pg_catalog.now());

  insert into public.user_entitlements (
    user_id,
    plan_id,
    source,
    valid_until,
    provider,
    provider_status,
    provider_product_id,
    provider_expires_at,
    provider_will_renew,
    provider_event_at
  ) values (
    p_user_id,
    case when v_premium then 'premium' else 'free' end,
    'billing',
    case when v_premium then v_window else null end,
    'revenuecat',
    p_status,
    p_product_id,
    p_expires_at,
    p_will_renew,
    p_observed_at
  )
  on conflict (user_id) do update set
    plan_id = excluded.plan_id,
    source = excluded.source,
    valid_until = excluded.valid_until,
    provider = excluded.provider,
    provider_status = excluded.provider_status,
    provider_product_id = excluded.provider_product_id,
    provider_expires_at = excluded.provider_expires_at,
    provider_will_renew = excluded.provider_will_renew,
    provider_event_at = excluded.provider_event_at,
    updated_at = pg_catalog.now();

  return case when v_premium then 'premium' else 'free' end;
end;
$fn$;
