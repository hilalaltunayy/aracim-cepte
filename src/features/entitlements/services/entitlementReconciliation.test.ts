/* eslint-disable import/first */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/data/supabase/client', () => ({ getSupabaseClient: vi.fn() }));

import { reconcileEntitlement } from './entitlementReconciliation';

describe('client entitlement reconciliation', () => {
  it('reports a successful server reconciliation', async () => {
    const outcome = await reconcileEntitlement(async () => ({
      error: null,
      data: { code: 'BILLING_SYNC_APPLIED', plan: 'premium' },
    }));
    expect(outcome).toBe('applied');
  });

  it('sends no identity and no plan — the server derives both', async () => {
    const invoke = vi.fn(async () => ({ error: null, data: { code: 'BILLING_SYNC_APPLIED' } }));
    await reconcileEntitlement(invoke);
    // The whole call surface is "please re-verify me"; nothing is asserted by the client.
    expect(invoke).toHaveBeenCalledWith();
  });

  it('recognises a fail-closed backend from the failed response body', async () => {
    const outcome = await reconcileEntitlement(async () => ({
      error: {
        name: 'FunctionsHttpError',
        context: { json: async () => ({ code: 'BILLING_SYNC_DISABLED' }) },
      },
      data: null,
    }));
    // `disabled` is distinct from `unavailable` so the caller does not keep retrying.
    expect(outcome).toBe('disabled');
  });

  it('treats an unreadable failure as transient rather than as a downgrade', async () => {
    expect(
      await reconcileEntitlement(async () => ({ error: { name: 'FunctionsFetchError' }, data: null })),
    ).toBe('unavailable');
  });

  it('never throws into the caller when the invocation itself explodes', async () => {
    expect(
      await reconcileEntitlement(async () => {
        throw new Error('offline');
      }),
    ).toBe('unavailable');
  });

  it('does not treat an unexpected success body as applied', async () => {
    expect(await reconcileEntitlement(async () => ({ error: null, data: { ok: true } }))).toBe(
      'unavailable',
    );
  });
});
