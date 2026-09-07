const PREMIUM_ENTITLEMENT_ID = 'premium';

export type SubscriberStatus = 'active' | 'cancelled' | 'billing_issue' | 'expired' | 'free';

export interface SubscriberSnapshot {
  status: SubscriberStatus;
  productId: string | null;
  expiresAt: string | null;
  willRenew: boolean | null;
  environment: 'SANDBOX' | 'PRODUCTION' | 'UNKNOWN';
}

export interface EntitlementSyncDependencies {
  enabled: boolean;
  /** Asks RevenueCat about this app user. `null` means "no such subscriber". */
  fetchSubscriber: (appUserId: string) => Promise<unknown>;
  /** Writes the snapshot through the service-role RPC. Returns the RPC verdict. */
  applySnapshot: (userId: string, snapshot: SubscriberSnapshot, observedAt: string)
    => Promise<string>;
  now?: () => Date;
}

export interface EntitlementSyncResult {
  status: number;
  body: { code: string; plan?: 'free' | 'premium'; result?: string };
}

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);

function isoDate(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Maps one RevenueCat subscriber payload onto the mirror's status vocabulary.
 *
 * Only the `premium` entitlement matters. An absent or lapsed entitlement is a
 * real, authoritative "free" — that is the point of asking the store directly
 * instead of waiting for an event that may never arrive.
 */
export function readSubscriberSnapshot(payload: unknown, now: Date): SubscriberSnapshot {
  const subscriber = record(record(payload)?.subscriber);
  const entitlement = record(record(subscriber?.entitlements)?.[PREMIUM_ENTITLEMENT_ID]);
  const environmentValue = text(entitlement?.environment)?.toUpperCase();
  const environment =
    environmentValue === 'SANDBOX' || environmentValue === 'PRODUCTION'
      ? environmentValue
      : 'UNKNOWN';
  if (!entitlement) {
    return { status: 'free', productId: null, expiresAt: null, willRenew: null, environment };
  }
  const productId = text(entitlement.product_identifier);
  const expiresAt = isoDate(entitlement.expires_date);
  const active = expiresAt === null || new Date(expiresAt).getTime() > now.getTime();
  if (!active) {
    return { status: 'expired', productId, expiresAt, willRenew: false, environment };
  }
  // A subscription that is still inside its paid period but already unsubscribed
  // keeps Premium until it lapses; the mirror models that as `cancelled`.
  const subscription = record(record(subscriber?.subscriptions)?.[productId ?? '']);
  const unsubscribedAt = isoDate(subscription?.unsubscribe_detected_at);
  const billingIssueAt = isoDate(subscription?.billing_issues_detected_at);
  if (billingIssueAt) {
    return { status: 'billing_issue', productId, expiresAt, willRenew: false, environment };
  }
  return {
    status: unsubscribedAt ? 'cancelled' : 'active',
    productId,
    expiresAt,
    willRenew: !unsubscribedAt,
    environment,
  };
}

/**
 * Reconciles one authenticated user against the store.
 *
 * `userId` is always derived from the caller's verified JWT by the entrypoint —
 * this handler never accepts a user id from the request body, so a client can
 * neither reconcile someone else nor assert its own plan.
 */
export async function handleEntitlementSync(
  userId: string | null,
  dependencies: EntitlementSyncDependencies,
): Promise<EntitlementSyncResult> {
  if (!userId) return { status: 401, body: { code: 'AUTH_REQUIRED' } };
  if (!dependencies.enabled) return { status: 503, body: { code: 'BILLING_SYNC_DISABLED' } };

  const now = (dependencies.now ?? (() => new Date()))();
  let payload: unknown;
  try {
    payload = await dependencies.fetchSubscriber(userId);
  } catch {
    return { status: 503, body: { code: 'BILLING_SYNC_UNAVAILABLE' } };
  }
  if (payload === null || payload === undefined) {
    // RevenueCat has never seen this app user: authoritative Free, not an error.
    payload = { subscriber: { entitlements: {}, subscriptions: {} } };
  }

  const snapshot = readSubscriberSnapshot(payload, now);
  try {
    const result = await dependencies.applySnapshot(userId, snapshot, now.toISOString());
    const plan =
      result === 'premium' || result === 'support_override'
        ? 'premium'
        : result === 'free'
          ? 'free'
          : undefined;
    return { status: 200, body: { code: 'BILLING_SYNC_APPLIED', result, ...(plan ? { plan } : {}) } };
  } catch {
    return { status: 503, body: { code: 'BILLING_SYNC_UNAVAILABLE' } };
  }
}
