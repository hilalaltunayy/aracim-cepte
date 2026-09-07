import {
  FREE_ENTITLEMENTS,
  PLAN_ENTITLEMENTS,
  type PlanEntitlements,
} from './entitlements';

/**
 * What the trusted Supabase `user_entitlements` mirror currently says.
 *
 * `unknown` (not read yet) and `unavailable` (read attempted, failed) are kept
 * apart on purpose. Neither may collapse into `free` on its own — the mirror can
 * hold a support grant the store knows nothing about — but only `unknown` is
 * allowed to hold the UI in a loading state, so a permanently unreachable mirror
 * cannot hang an otherwise usable app.
 */
export type EntitlementMirrorStatus = 'unknown' | 'unavailable' | 'free' | 'premium';

/** What the store (RevenueCat) says. `unavailable` means billing is off in this build. */
export type StoreEntitlementStatus = 'unknown' | 'free' | 'premium' | 'unavailable';

export type EntitlementStatus = 'unknown' | 'free' | 'premium';

export interface EntitlementSnapshot {
  /** Resolved plan for the UI. `unknown` means "still resolving", never "Free". */
  status: EntitlementStatus;
  /** Plan limits to display. Fail-closed to Free while the status is unknown. */
  entitlements: Readonly<PlanEntitlements>;
  /** The Supabase mirror confirms Premium, so server-enforced operations will pass. */
  serverConfirmed: boolean;
  /**
   * The store says Premium but the mirror has not caught up. The UI unlocks now;
   * server-gated writes still need one reconciliation round-trip first.
   */
  awaitingServerSync: boolean;
}

/**
 * The single place that turns the two entitlement sources into one answer.
 *
 * Precedence:
 *  - the trusted mirror wins whenever it already says Premium (it also covers
 *    support grants the store cannot see);
 *  - an active store entitlement unlocks the UI immediately, without waiting for
 *    the RevenueCat webhook to reach the mirror;
 *  - Free is only asserted once *both* sources have actually answered;
 *  - anything else is `unknown`.
 */
export function resolveEntitlementSnapshot(
  mirror: EntitlementMirrorStatus,
  store: StoreEntitlementStatus,
): EntitlementSnapshot {
  if (mirror === 'premium') {
    return {
      status: 'premium',
      entitlements: PLAN_ENTITLEMENTS.premium,
      serverConfirmed: true,
      awaitingServerSync: false,
    };
  }
  if (store === 'premium') {
    return {
      status: 'premium',
      entitlements: PLAN_ENTITLEMENTS.premium,
      serverConfirmed: false,
      // A mirror that has not answered yet may still turn out to be Premium, so
      // only a mirror that positively says Free is a real sync gap to close.
      awaitingServerSync: mirror === 'free',
    };
  }
  if (
    (mirror === 'free' || mirror === 'unavailable') &&
    (store === 'free' || store === 'unavailable')
  ) {
    // Both sources have now answered and neither reports an entitlement. A mirror
    // that failed to load resolves here too, fail-closed and bounded, rather than
    // holding every Premium screen in a loading state indefinitely.
    return {
      status: 'free',
      entitlements: FREE_ENTITLEMENTS,
      serverConfirmed: mirror === 'free',
      awaitingServerSync: false,
    };
  }
  return {
    status: 'unknown',
    entitlements: FREE_ENTITLEMENTS,
    serverConfirmed: false,
    awaitingServerSync: false,
  };
}

export const UNKNOWN_ENTITLEMENT_SNAPSHOT: Readonly<EntitlementSnapshot> =
  resolveEntitlementSnapshot('unknown', 'unknown');

/**
 * Whether a Premium capability flag may be shown as a definitive answer.
 *
 * Screens use this to keep an already-entitled user out of the Free lock while
 * entitlement is still resolving on cold start.
 */
export function isEntitlementResolved(status: EntitlementStatus): boolean {
  return status !== 'unknown';
}
