import assert from 'node:assert/strict';
import test from 'node:test';
import { handleRevenueCatWebhook } from './revenuecatWebhookHandler.ts';

const userId = '10000000-0000-4000-8000-000000000001';
const secret = 'Bearer synthetic-webhook-secret';
const payload = (overrides = {}) => ({
  event: {
    id: 'event-1',
    type: 'INITIAL_PURCHASE',
    app_user_id: userId,
    original_app_user_id: '$RCAnonymousID:synthetic',
    aliases: [],
    entitlement_ids: ['premium'],
    product_id: 'premium_monthly',
    expiration_at_ms: Date.parse('2026-09-15T00:00:00Z'),
    event_timestamp_ms: Date.parse('2026-08-15T00:00:00Z'),
    environment: 'SANDBOX',
    ...overrides,
  },
});
const deps = (processEvent = async () => 'applied') => ({
  enabled: true,
  expectedAuthorization: secret,
  processEvent,
});

test('fails closed when webhook sync is disabled', async () => {
  const result = await handleRevenueCatWebhook(secret, payload(), {
    ...deps(),
    enabled: false,
  });
  assert.equal(result.status, 503);
});

test('rejects an invalid webhook authorization header', async () => {
  const result = await handleRevenueCatWebhook('Bearer wrong', payload(), deps());
  assert.deepEqual(result, { status: 401, body: { code: 'WEBHOOK_AUTH_INVALID' } });
});

test('rejects malformed payload without returning provider internals', async () => {
  const result = await handleRevenueCatWebhook(secret, { event: { id: 'x' } }, deps());
  assert.deepEqual(result, { status: 400, body: { code: 'WEBHOOK_INVALID' } });
});

test('resolves the Supabase UUID from aliases when RevenueCat sends an anonymous primary id', async () => {
  let captured;
  await handleRevenueCatWebhook(
    secret,
    payload({ app_user_id: '$RCAnonymousID:synthetic', aliases: [userId] }),
    deps(async (event) => {
      captured = event;
      return 'applied';
    }),
  );
  assert.equal(captured.userId, userId);
});

test('ignores events unrelated to the premium entitlement', async () => {
  let calls = 0;
  const result = await handleRevenueCatWebhook(
    secret,
    payload({ entitlement_ids: ['other'] }),
    deps(async () => {
      calls += 1;
      return 'applied';
    }),
  );
  assert.equal(calls, 0);
  assert.equal(result.body.code, 'WEBHOOK_IGNORED');
});

test('acknowledges unsupported webhook types without retrying them as malformed', async () => {
  let called = false;
  const result = await handleRevenueCatWebhook(
    secret,
    payload({ type: 'TRANSFER', app_user_id: null }),
    deps(async () => {
      called = true;
      return 'applied';
    }),
  );
  assert.equal(result.status, 200);
  assert.equal(result.body.code, 'WEBHOOK_IGNORED');
  assert.equal(called, false);
});

for (const [type, status, willRenew] of [
  ['INITIAL_PURCHASE', 'active', true],
  ['CANCELLATION', 'cancelled', false],
  ['EXPIRATION', 'expired', false],
  ['BILLING_ISSUE', 'billing_issue', null],
]) {
  test(`maps ${type} to ${status}`, async () => {
    let captured;
    const result = await handleRevenueCatWebhook(
      secret,
      payload({ type }),
      deps(async (event) => {
        captured = event;
        return type === 'EXPIRATION' ? 'duplicate' : 'applied';
      }),
    );
    assert.equal(captured.status, status);
    assert.equal(captured.willRenew, willRenew);
    assert.equal(result.status, 200);
  });
}

test('sanitizes database failures', async () => {
  const result = await handleRevenueCatWebhook(
    secret,
    payload(),
    deps(async () => {
      throw new Error('private database details');
    }),
  );
  assert.deepEqual(result, { status: 503, body: { code: 'BILLING_SYNC_UNAVAILABLE' } });
});
