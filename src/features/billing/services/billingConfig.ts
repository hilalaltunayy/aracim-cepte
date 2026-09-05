import { Platform } from 'react-native';
import type { BillingAvailability } from './BillingProvider';
import type { BillingPlatform } from '../domain/billing';

/** Which RevenueCat store the resolved key targets. Never carries the key itself. */
export type RevenueCatStore = 'production' | 'test';

export interface RevenueCatPublicConfig {
  availability: BillingAvailability;
  apiKey: string | null;
  platform: BillingPlatform | null;
  /** `test` only when a dedicated QA build opted in; `production` otherwise. */
  store: RevenueCatStore;
}

// Static reads only: Expo inlines EXPO_PUBLIC_* at build time by static
// analysis, so `process.env[dynamicKey]` would never be replaced.
function trimmed(value: string | undefined): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Resolves the RevenueCat public SDK key for this build.
 *
 * RevenueCat Test Store is strictly OPT-IN: it activates only when the build's
 * environment sets `EXPO_PUBLIC_REVENUECAT_TEST_STORE_ENABLED` to the literal
 * string `'true'`. Production EAS build profiles must never set that flag, so a
 * release build can never pick up the Test Store key even if one leaked into
 * its environment — when the flag is absent the Test Store key is not read at
 * all, and the production Android/iOS key is used exactly as before.
 *
 * Test Store needs no code change beyond the key: react-native-purchases 10.x
 * (>= 9.5.4 required) detects it from the key passed to `configure()`. The
 * `premium` entitlement id and the `default` / `$rc_monthly` / `$rc_annual`
 * offering contract are unchanged and store-agnostic.
 */
export function getRevenueCatPublicConfig(): RevenueCatPublicConfig {
  const enabled = process.env.EXPO_PUBLIC_REVENUECAT_PURCHASES_ENABLED === 'true';
  const platform: BillingPlatform | null =
    Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : null;

  const testStoreOptIn = process.env.EXPO_PUBLIC_REVENUECAT_TEST_STORE_ENABLED === 'true';
  const store: RevenueCatStore = testStoreOptIn ? 'test' : 'production';

  const productionKey =
    platform === 'android'
      ? trimmed(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY)
      : platform === 'ios'
        ? trimmed(process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY)
        : undefined;
  // Only consulted when opted in; a production build never touches this branch.
  const testStoreKey = testStoreOptIn
    ? trimmed(process.env.EXPO_PUBLIC_REVENUECAT_TEST_STORE_API_KEY)
    : undefined;
  const apiKey = (testStoreOptIn ? testStoreKey : productionKey) ?? null;

  const base = { platform, store };
  if (!platform) {
    return { ...base, availability: { enabled: false, reason: 'unsupported_platform' }, apiKey: null };
  }
  if (!enabled) {
    return { ...base, availability: { enabled: false, reason: 'disabled' }, apiKey: null };
  }
  if (!apiKey) {
    // A QA build that opted into Test Store but is missing the Test Store key
    // fails closed here rather than silently falling back to the production key.
    return { ...base, availability: { enabled: false, reason: 'missing_key' }, apiKey: null };
  }
  return { ...base, availability: { enabled: true, reason: 'ready' }, apiKey };
}
