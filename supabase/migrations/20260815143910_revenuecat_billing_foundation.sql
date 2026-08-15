-- TASK-036: trusted RevenueCat webhook state. Mobile clients remain read-only and fail Free.

alter table public.user_entitlements
  add column provider text null,
  add column provider_status text null,
  add column provider_product_id text null,
  add column provider_expires_at timestamptz null,
  add column provider_will_renew boolean null,
  add column provider_event_at timestamptz null;

alter table public.user_entitlements
  add constraint user_entitlements_provider_check
    check (provider is null or provider = 'revenuecat'),
  add constraint user_entitlements_provider_status_check
    check (provider_status is null or provider_status in (
      'active', 'cancelled', 'billing_issue', 'expired', 'free'
    ));

create table public.billing_webhook_events (
  event_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  provider_status text not null check (provider_status in (
    'active', 'cancelled', 'billing_issue', 'expired', 'free'
  )),
  product_id text null,
  environment text not null check (environment in ('SANDBOX', 'PRODUCTION', 'UNKNOWN')),
  event_at timestamptz not null,
  processed_at timestamptz not null default now()
);

create index billing_webhook_events_user_event_at_idx
  on public.billing_webhook_events (user_id, event_at desc);

alter table public.billing_webhook_events enable row level security;
revoke all on table public.billing_webhook_events from public, anon, authenticated;
grant select, insert, update, delete on table public.billing_webhook_events to service_role;

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
as $$
declare
  v_inserted integer;
  v_existing public.user_entitlements%rowtype;
  v_premium boolean;
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
$$;

revoke all on function public.process_revenuecat_subscription_event(
  text, uuid, text, text, text, timestamptz, boolean, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.process_revenuecat_subscription_event(
  text, uuid, text, text, text, timestamptz, boolean, timestamptz, text
) to service_role;

comment on table public.billing_webhook_events is
  'Minimal RevenueCat event-id ledger for trusted idempotency; raw webhook payloads are not stored.';
comment on function public.process_revenuecat_subscription_event(
  text, uuid, text, text, text, timestamptz, boolean, timestamptz, text
) is 'Service-role-only RevenueCat subscription sync. Clients cannot self-upgrade.';
