const PREMIUM_ENTITLEMENT_ID = 'premium';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface RevenueCatWebhookRecord {
  eventId: string;
  userId: string;
  eventType: string;
  status: 'active' | 'cancelled' | 'billing_issue' | 'expired' | 'free';
  productId: string | null;
  expiresAt: string | null;
  willRenew: boolean | null;
  eventAt: string;
  environment: 'SANDBOX' | 'PRODUCTION' | 'UNKNOWN';
}

export interface RevenueCatWebhookDependencies {
  enabled: boolean;
  expectedAuthorization: string | null;
  processEvent: (event: RevenueCatWebhookRecord) => Promise<string>;
}

export interface RevenueCatWebhookResult {
  status: number;
  body: { code: string; result?: string };
}

function sameSecret(left: string | null, right: string | null) {
  if (!left || !right || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1)
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const string = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);
const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

function dateFromMillis(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('invalid timestamp');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('invalid timestamp');
  return date.toISOString();
}

function resolveUserId(event: Record<string, unknown>) {
  const candidates = [
    string(event.app_user_id),
    ...strings(event.aliases),
    string(event.original_app_user_id),
  ];
  return (
    candidates.find((candidate): candidate is string =>
      Boolean(candidate && UUID_PATTERN.test(candidate)),
    ) ?? null
  );
}

function mapStatus(type: string): RevenueCatWebhookRecord['status'] | null {
  if (
    [
      'INITIAL_PURCHASE',
      'RENEWAL',
      'PRODUCT_CHANGE',
      'UNCANCELLATION',
      'NON_RENEWING_PURCHASE',
    ].includes(type)
  )
    return 'active';
  if (type === 'CANCELLATION') return 'cancelled';
  if (type === 'BILLING_ISSUE') return 'billing_issue';
  if (['EXPIRATION', 'REFUND'].includes(type)) return 'expired';
  return null;
}

function parseWebhook(payload: unknown): RevenueCatWebhookRecord | 'ignored' {
  const event = record(record(payload)?.event);
  if (!event) throw new Error('invalid event');
  const eventId = string(event.id);
  const eventType = string(event.type)?.toUpperCase() ?? null;
  const status = eventType ? mapStatus(eventType) : null;
  if (!eventId || !eventType) throw new Error('invalid event');
  if (!status) return 'ignored';
  const userId = resolveUserId(event);
  if (!userId) throw new Error('invalid event');
  if (!strings(event.entitlement_ids).includes(PREMIUM_ENTITLEMENT_ID)) return 'ignored';
  const eventAt = dateFromMillis(event.event_timestamp_ms);
  if (!eventAt) throw new Error('invalid event');
  const environmentValue = string(event.environment)?.toUpperCase();
  const environment =
    environmentValue === 'SANDBOX' || environmentValue === 'PRODUCTION'
      ? environmentValue
      : 'UNKNOWN';
  const expiresAt = dateFromMillis(event.expiration_at_ms);
  const willRenew =
    status === 'active' ? true : status === 'cancelled' || status === 'expired' ? false : null;
  return {
    eventId,
    userId,
    eventType,
    status,
    productId: string(event.product_id),
    expiresAt,
    willRenew,
    eventAt,
    environment,
  };
}

export async function handleRevenueCatWebhook(
  authorization: string | null,
  payload: unknown,
  dependencies: RevenueCatWebhookDependencies,
): Promise<RevenueCatWebhookResult> {
  if (!dependencies.enabled || !dependencies.expectedAuthorization)
    return { status: 503, body: { code: 'BILLING_SYNC_DISABLED' } };
  if (!sameSecret(authorization, dependencies.expectedAuthorization))
    return { status: 401, body: { code: 'WEBHOOK_AUTH_INVALID' } };
  let parsed: RevenueCatWebhookRecord | 'ignored';
  try {
    parsed = parseWebhook(payload);
  } catch {
    return { status: 400, body: { code: 'WEBHOOK_INVALID' } };
  }
  if (parsed === 'ignored')
    return { status: 200, body: { code: 'WEBHOOK_IGNORED', result: 'ignored' } };
  try {
    const result = await dependencies.processEvent(parsed);
    return { status: 200, body: { code: 'WEBHOOK_ACCEPTED', result } };
  } catch {
    return { status: 503, body: { code: 'BILLING_SYNC_UNAVAILABLE' } };
  }
}
