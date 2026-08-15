import { describe, expect, it } from 'vitest';
import {
  normalizePackageType,
  normalizeRevenueCatCustomerInfo,
  REVENUECAT_PREMIUM_ENTITLEMENT_ID,
} from './billing';

const entitlement = (active = true) => ({
  isActive: active,
  productIdentifier: 'premium_monthly',
  expirationDate: '2026-09-15T00:00:00.000Z',
  willRenew: true,
});

describe('billing domain', () => {
  it('maps the single active RevenueCat premium entitlement to normalized Premium', () => {
    expect(
      normalizeRevenueCatCustomerInfo({
        entitlements: { all: { [REVENUECAT_PREMIUM_ENTITLEMENT_ID]: entitlement() } },
      }),
    ).toMatchObject({
      status: 'premium',
      entitlementActive: true,
      productId: 'premium_monthly',
      willRenew: true,
    });
  });

  it('maps missing or inactive entitlement to Free', () => {
    expect(normalizeRevenueCatCustomerInfo({ entitlements: { all: {} } }).status).toBe('free');
    expect(
      normalizeRevenueCatCustomerInfo({
        entitlements: { all: { premium: entitlement(false) } },
      }).status,
    ).toBe('free');
  });

  it('normalizes only store package metadata without hard-coded prices', () => {
    expect(normalizePackageType('MONTHLY')).toBe('monthly');
    expect(normalizePackageType('ANNUAL')).toBe('annual');
    expect(normalizePackageType('CUSTOM')).toBe('other');
  });
});
