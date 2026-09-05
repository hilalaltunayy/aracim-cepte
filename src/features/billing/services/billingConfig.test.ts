/* eslint-disable import/first */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const platform = { OS: 'android' as 'android' | 'ios' | 'web' };
vi.mock('react-native', () => ({
  get Platform() {
    return platform;
  },
}));

import { getRevenueCatPublicConfig } from './billingConfig';
import { REVENUECAT_PREMIUM_ENTITLEMENT_ID } from '../domain/billing';

const PROD_ANDROID_KEY = 'goog_prodAndroidKey';
const TEST_STORE_KEY = 'test_qaStoreKey';

interface EnvValues {
  purchasesEnabled?: string;
  androidKey?: string;
  iosKey?: string;
  testStoreEnabled?: string;
  testStoreKey?: string;
}

function put(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function setEnv(values: EnvValues) {
  put('EXPO_PUBLIC_REVENUECAT_PURCHASES_ENABLED', values.purchasesEnabled);
  put('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY', values.androidKey);
  put('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY', values.iosKey);
  put('EXPO_PUBLIC_REVENUECAT_TEST_STORE_ENABLED', values.testStoreEnabled);
  put('EXPO_PUBLIC_REVENUECAT_TEST_STORE_API_KEY', values.testStoreKey);
}

describe('RevenueCat public config — Test Store QA opt-in', () => {
  beforeEach(() => {
    platform.OS = 'android';
  });
  afterEach(() => {
    setEnv({});
    vi.restoreAllMocks();
  });

  it('a QA build that opts in uses the Test Store key', () => {
    setEnv({
      purchasesEnabled: 'true',
      androidKey: PROD_ANDROID_KEY,
      testStoreEnabled: 'true',
      testStoreKey: TEST_STORE_KEY,
    });

    const config = getRevenueCatPublicConfig();

    expect(config.store).toBe('test');
    expect(config.apiKey).toBe(TEST_STORE_KEY);
    expect(config.availability).toEqual({ enabled: true, reason: 'ready' });
  });

  it('a production build uses the Android key and never the Test Store key', () => {
    setEnv({
      purchasesEnabled: 'true',
      androidKey: PROD_ANDROID_KEY,
    });

    const config = getRevenueCatPublicConfig();

    expect(config.store).toBe('production');
    expect(config.apiKey).toBe(PROD_ANDROID_KEY);
    expect(config.availability).toEqual({ enabled: true, reason: 'ready' });
  });

  it('a production build IGNORES a leaked Test Store key when the opt-in flag is absent', () => {
    setEnv({
      purchasesEnabled: 'true',
      androidKey: PROD_ANDROID_KEY,
      // Present but must have no effect without the explicit opt-in flag.
      testStoreKey: TEST_STORE_KEY,
    });

    const config = getRevenueCatPublicConfig();

    expect(config.store).toBe('production');
    expect(config.apiKey).toBe(PROD_ANDROID_KEY);
    expect(config.apiKey).not.toBe(TEST_STORE_KEY);
  });

  it('only the literal string "true" opts in — any other value stays on production', () => {
    setEnv({
      purchasesEnabled: 'true',
      androidKey: PROD_ANDROID_KEY,
      testStoreEnabled: '1',
      testStoreKey: TEST_STORE_KEY,
    });

    const config = getRevenueCatPublicConfig();

    expect(config.store).toBe('production');
    expect(config.apiKey).toBe(PROD_ANDROID_KEY);
  });

  it('a QA build that opted in but is missing the Test Store key fails closed', () => {
    setEnv({
      purchasesEnabled: 'true',
      // Production key present — must NOT be used as a fallback for a Test build.
      androidKey: PROD_ANDROID_KEY,
      testStoreEnabled: 'true',
    });

    const config = getRevenueCatPublicConfig();

    expect(config.store).toBe('test');
    expect(config.apiKey).toBeNull();
    expect(config.availability).toEqual({ enabled: false, reason: 'missing_key' });
  });

  it('purchases disabled fails closed regardless of store or keys', () => {
    setEnv({
      androidKey: PROD_ANDROID_KEY,
      testStoreEnabled: 'true',
      testStoreKey: TEST_STORE_KEY,
    });

    expect(getRevenueCatPublicConfig().availability).toEqual({
      enabled: false,
      reason: 'disabled',
    });
  });

  it('reports unsupported_platform on web with no key', () => {
    platform.OS = 'web';
    setEnv({ purchasesEnabled: 'true' });

    const config = getRevenueCatPublicConfig();
    expect(config.platform).toBeNull();
    expect(config.availability).toEqual({ enabled: false, reason: 'unsupported_platform' });
    expect(config.apiKey).toBeNull();
  });

  it('keeps the premium entitlement identifier unchanged and store-agnostic', () => {
    expect(REVENUECAT_PREMIUM_ENTITLEMENT_ID).toBe('premium');
  });

  it('never logs any key value', () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );
    setEnv({
      purchasesEnabled: 'true',
      androidKey: PROD_ANDROID_KEY,
      testStoreEnabled: 'true',
      testStoreKey: TEST_STORE_KEY,
    });

    getRevenueCatPublicConfig();

    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
    }
  });
});
