import { describe, expect, it } from 'vitest';
import {
  isEntitlementResolved,
  resolveEntitlementSnapshot,
  UNKNOWN_ENTITLEMENT_SNAPSHOT,
} from './entitlementResolution';

describe('canonical entitlement resolution', () => {
  it('never reports an unresolved entitlement as Free', () => {
    // The whole point: cold start must not render an entitled user as Free.
    expect(resolveEntitlementSnapshot('unknown', 'unknown').status).toBe('unknown');
    expect(resolveEntitlementSnapshot('unknown', 'free').status).toBe('unknown');
    expect(resolveEntitlementSnapshot('free', 'unknown').status).toBe('unknown');
    expect(UNKNOWN_ENTITLEMENT_SNAPSHOT.status).toBe('unknown');
  });

  it('fails closed on limits while the status is unknown', () => {
    const snapshot = resolveEntitlementSnapshot('unknown', 'unknown');
    expect(snapshot.entitlements.planId).toBe('free');
    expect(snapshot.entitlements.advancedReports).toBe(false);
    expect(snapshot.serverConfirmed).toBe(false);
  });

  it('unlocks the UI from the store without waiting for the webhook mirror', () => {
    const snapshot = resolveEntitlementSnapshot('free', 'premium');
    expect(snapshot.status).toBe('premium');
    expect(snapshot.entitlements.advancedReports).toBe(true);
    expect(snapshot.entitlements.customReminderTime).toBe(true);
    expect(snapshot.entitlements.ocrMonthlyQuota).toBe(30);
    // Server-enforced writes still need one reconciliation round-trip.
    expect(snapshot.serverConfirmed).toBe(false);
    expect(snapshot.awaitingServerSync).toBe(true);
  });

  it('does not claim a sync gap while the mirror has not answered at all', () => {
    const snapshot = resolveEntitlementSnapshot('unknown', 'premium');
    expect(snapshot.status).toBe('premium');
    expect(snapshot.awaitingServerSync).toBe(false);
  });

  it('lets the trusted mirror confirm Premium the store cannot see', () => {
    // A support grant lives only in the mirror.
    const snapshot = resolveEntitlementSnapshot('premium', 'free');
    expect(snapshot.status).toBe('premium');
    expect(snapshot.serverConfirmed).toBe(true);
    expect(snapshot.awaitingServerSync).toBe(false);
  });

  it('asserts Free only once both sources have answered', () => {
    const snapshot = resolveEntitlementSnapshot('free', 'free');
    expect(snapshot.status).toBe('free');
    expect(snapshot.serverConfirmed).toBe(true);
    expect(snapshot.entitlements.maxVehicles).toBe(1);
  });

  it('resolves Free when billing is unavailable in this build instead of hanging', () => {
    expect(resolveEntitlementSnapshot('free', 'unavailable').status).toBe('free');
  });

  it('separates a mirror that has not been read from one that failed to read', () => {
    // Not attempted yet: keep loading rather than deciding.
    expect(resolveEntitlementSnapshot('unknown', 'free').status).toBe('unknown');
    // Attempted and failed, with the store already definitive: fail closed and
    // resolve, so an unreachable mirror cannot hang every Premium screen.
    const failed = resolveEntitlementSnapshot('unavailable', 'free');
    expect(failed.status).toBe('free');
    expect(failed.serverConfirmed).toBe(false);
  });

  it('still unlocks Premium from the store when the mirror read failed', () => {
    const snapshot = resolveEntitlementSnapshot('unavailable', 'premium');
    expect(snapshot.status).toBe('premium');
    expect(snapshot.serverConfirmed).toBe(false);
    // Nothing to reconcile against: the mirror never answered, so no sync gap is claimed.
    expect(snapshot.awaitingServerSync).toBe(false);
  });

  it('keeps waiting while the store has not answered, even if the mirror failed', () => {
    expect(resolveEntitlementSnapshot('unavailable', 'unknown').status).toBe('unknown');
  });

  it('exposes whether a capability answer is definitive', () => {
    expect(isEntitlementResolved('unknown')).toBe(false);
    expect(isEntitlementResolved('free')).toBe(true);
    expect(isEntitlementResolved('premium')).toBe(true);
  });
});
