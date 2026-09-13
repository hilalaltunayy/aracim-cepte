import assert from 'node:assert/strict';
import test from 'node:test';
import { handleEntitlementSync, readSubscriberSnapshot } from './entitlementSyncHandler.ts';

const userId = '10000000-0000-4000-8000-000000000001';
const now = new Date('2026-09-07T12:00:00Z');

const subscriber = (entitlements = {}, subscriptions = {}) => ({
  subscriber: { entitlements, subscriptions },
});
const activePremium = subscriber(
  {
    premium: {
      expires_date: '2026-10-07T12:00:00Z',
      product_identifier: 'premium_monthly',
      environment: 'SANDBOX',
    },
  },
  { premium_monthly: {} },
);

const deps = (overrides = {}) => ({
  enabled: true,
  fetchSubscriber: async () => activePremium,
  applySnapshot: async () => 'premium',
  now: () => now,
  ...overrides,
});

test('rejects an unauthenticated caller before touching the provider', async () => {
  let called = false;
  const result = await handleEntitlementSync(
    null,
    deps({
      fetchSubscriber: async () => {
        called = true;
        return activePremium;
      },
    }),
  );
  assert.equal(result.status, 401);
  assert.equal(result.body.code, 'AUTH_REQUIRED');
  assert.equal(called, false);
});

test('fails closed when the RevenueCat secret is not configured', async () => {
  const result = await handleEntitlementSync(userId, deps({ enabled: false }));
  assert.equal(result.status, 503);
  assert.equal(result.body.code, 'BILLING_SYNC_DISABLED');
});

test('applies an active premium entitlement for the caller only', async () => {
  const seen = [];
  const result = await handleEntitlementSync(
    userId,
    deps({
      fetchSubscriber: async (appUserId) => {
        seen.push(appUserId);
        return activePremium;
      },
      applySnapshot: async (id, snapshot, observedAt) => {
        seen.push(id, snapshot.status, snapshot.productId, observedAt);
        return 'premium';
      },
    }),
  );
  assert.equal(result.status, 200);
  assert.equal(result.body.code, 'BILLING_SYNC_APPLIED');
  assert.equal(result.body.plan, 'premium');
  // Both the lookup and the write are bound to the JWT-derived id.
  assert.deepEqual(seen, [
    userId,
    userId,
    'active',
    'premium_monthly',
    now.toISOString(),
  ]);
});

test('treats an unknown subscriber as authoritative Free rather than an error', async () => {
  let applied = null;
  const result = await handleEntitlementSync(
    userId,
    deps({
      fetchSubscriber: async () => null,
      applySnapshot: async (_id, snapshot) => {
        applied = snapshot;
        return 'free';
      },
    }),
  );
  assert.equal(result.status, 200);
  assert.equal(result.body.plan, 'free');
  assert.equal(applied.status, 'free');
  assert.equal(applied.expiresAt, null);
});

test('reports an unreachable provider without changing the mirror', async () => {
  let applied = false;
  const result = await handleEntitlementSync(
    userId,
    deps({
      fetchSubscriber: async () => {
        throw new Error('network');
      },
      applySnapshot: async () => {
        applied = true;
        return 'premium';
      },
    }),
  );
  assert.equal(result.status, 503);
  assert.equal(result.body.code, 'BILLING_SYNC_UNAVAILABLE');
  assert.equal(applied, false);
});

test('reports a failed write as unavailable, never as success', async () => {
  const result = await handleEntitlementSync(
    userId,
    deps({
      applySnapshot: async () => {
        throw new Error('rpc failed');
      },
    }),
  );
  assert.equal(result.status, 503);
  assert.equal(result.body.code, 'BILLING_SYNC_UNAVAILABLE');
});

test('keeps a support override reported as premium', async () => {
  const result = await handleEntitlementSync(
    userId,
    deps({ applySnapshot: async () => 'support_override' }),
  );
  assert.equal(result.body.plan, 'premium');
  assert.equal(result.body.result, 'support_override');
});

test('maps a lapsed entitlement to expired', () => {
  const snapshot = readSubscriberSnapshot(
    subscriber({
      premium: { expires_date: '2026-09-01T00:00:00Z', product_identifier: 'premium_monthly' },
    }),
    now,
  );
  assert.equal(snapshot.status, 'expired');
  assert.equal(snapshot.willRenew, false);
});

test('keeps an unsubscribed but unexpired period as cancelled premium', () => {
  const snapshot = readSubscriberSnapshot(
    subscriber(
      {
        premium: { expires_date: '2026-10-07T12:00:00Z', product_identifier: 'premium_monthly' },
      },
      { premium_monthly: { unsubscribe_detected_at: '2026-09-05T00:00:00Z' } },
    ),
    now,
  );
  assert.equal(snapshot.status, 'cancelled');
  assert.equal(snapshot.willRenew, false);
});

test('flags a billing issue distinctly from a clean cancellation', () => {
  const snapshot = readSubscriberSnapshot(
    subscriber(
      {
        premium: { expires_date: '2026-10-07T12:00:00Z', product_identifier: 'premium_monthly' },
      },
      { premium_monthly: { billing_issues_detected_at: '2026-09-06T00:00:00Z' } },
    ),
    now,
  );
  assert.equal(snapshot.status, 'billing_issue');
});

test('treats a lifetime entitlement with no expiry as active', () => {
  const snapshot = readSubscriberSnapshot(
    subscriber({ premium: { expires_date: null, product_identifier: 'premium_lifetime' } }),
    now,
  );
  assert.equal(snapshot.status, 'active');
  assert.equal(snapshot.expiresAt, null);
});

test('ignores entitlements other than premium', () => {
  const snapshot = readSubscriberSnapshot(
    subscriber({ pro_plus: { expires_date: '2030-01-01T00:00:00Z' } }),
    now,
  );
  assert.equal(snapshot.status, 'free');
});

// --- TASK-012: renewal boundary -------------------------------------------------
// `expires_date` is the end of the current billing period, not the end of the
// entitlement. A renewal can land after it, and demoting on that instant is what
// left a paying account unable to add a second vehicle.

test('keeps an auto-renewing subscription active while a renewal is still landing', () => {
  const snapshot = readSubscriberSnapshot(
    subscriber({
      premium: { expires_date: '2026-09-07T11:55:00Z', product_identifier: 'premium_monthly' },
    }),
    now,
  );
  assert.equal(snapshot.status, 'active');
  assert.equal(snapshot.willRenew, true);
});

test('still expires an auto-renewing subscription once the grace is exhausted', () => {
  const snapshot = readSubscriberSnapshot(
    subscriber({
      premium: { expires_date: '2026-09-07T10:30:00Z', product_identifier: 'premium_monthly' },
    }),
    now,
  );
  assert.equal(snapshot.status, 'expired');
  assert.equal(snapshot.willRenew, false);
});

test('gives no renewal grace to a subscription nothing will renew', () => {
  const unsubscribed = readSubscriberSnapshot(
    subscriber(
      { premium: { expires_date: '2026-09-07T11:55:00Z', product_identifier: 'premium_monthly' } },
      { premium_monthly: { unsubscribe_detected_at: '2026-09-05T00:00:00Z' } },
    ),
    now,
  );
  assert.equal(unsubscribed.status, 'expired');

  const billingIssue = readSubscriberSnapshot(
    subscriber(
      { premium: { expires_date: '2026-09-07T11:55:00Z', product_identifier: 'premium_monthly' } },
      { premium_monthly: { billing_issues_detected_at: '2026-09-06T00:00:00Z' } },
    ),
    now,
  );
  assert.equal(billingIssue.status, 'expired');
});

test('a renewal landing inside the grace reconciles the mirror back to premium', async () => {
  const applied = [];
  const result = await handleEntitlementSync(userId, {
    enabled: true,
    fetchSubscriber: async () =>
      subscriber({
        premium: { expires_date: '2026-09-07T11:58:00Z', product_identifier: 'premium_monthly' },
      }),
    applySnapshot: async (id, snapshot) => {
      applied.push({ id, status: snapshot.status, willRenew: snapshot.willRenew });
      return 'premium';
    },
    now: () => now,
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.plan, 'premium');
  assert.deepEqual(applied, [{ id: userId, status: 'active', willRenew: true }]);
});
