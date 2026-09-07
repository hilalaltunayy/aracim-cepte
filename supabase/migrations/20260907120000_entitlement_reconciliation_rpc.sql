-- TASK-045: trusted, on-demand RevenueCat reconciliation.
--
-- The webhook (20260815143910) stays the primary mirror writer. It is asynchronous, so an
-- already-entitled user can be rejected by server-side Premium enforcement for as long as the
-- event takes to arrive. This adds a second, *pull* path used by an Edge Function that has just
-- asked RevenueCat directly about the caller: the client still cannot assert anything, because
-- execute stays service-role-only and the function derives the user from the caller's JWT.

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
as $$
declare
  v_existing public.user_entitlements%rowtype;
  v_premium boolean;
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

  v_premium := p_status in ('active', 'cancelled', 'billing_issue')
    and ((p_status = 'active' and p_expires_at is null) or p_expires_at > pg_catalog.now());

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
    case when v_premium then p_expires_at else null end,
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
$$;

revoke all on function public.reconcile_revenuecat_subscriber_state(
  uuid, text, text, timestamptz, boolean, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.reconcile_revenuecat_subscriber_state(
  uuid, text, text, timestamptz, boolean, timestamptz, text
) to service_role;

comment on function public.reconcile_revenuecat_subscriber_state(
  uuid, text, text, timestamptz, boolean, timestamptz, text
) is 'Service-role-only pull reconciliation of a RevenueCat subscriber snapshot. Clients cannot self-upgrade.';
