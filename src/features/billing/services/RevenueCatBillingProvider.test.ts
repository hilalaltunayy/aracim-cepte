/* eslint-disable import/first */
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native-purchases', () => ({
  default: {},
}));
vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

import { RevenueCatBillingProvider } from './RevenueCatBillingProvider';
import type { RevenueCatPublicConfig } from './billingConfig';

const info = (active = false) => ({
  entitlements: {
    all: active
      ? {
          premium: {
            isActive: true,
            productIdentifier: 'store-premium',
            expirationDate: '2026-09-15T00:00:00Z',
            willRenew: true,
          },
        }
      : {},
  },
});

function sdk() {
  return {
    PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: 'PURCHASE_CANCELLED_ERROR' },
    configure: vi.fn(),
    logIn: vi.fn(async () => ({ customerInfo: info(false), created: false })),
    logOut: vi.fn(async () => info(false)),
    getCustomerInfo: vi.fn(async () => info(false)),
    getOfferings: vi.fn(async () => ({
      current: {
        identifier: 'default',
        availablePackages: [
          {
            identifier: '$rc_monthly',
            packageType: 'MONTHLY',
            product: {
              identifier: 'premium_monthly',
              title: 'Aylık Premium',
              priceString: '₺49,99',
            },
          },
          {
            identifier: '$rc_annual',
            packageType: 'ANNUAL',
            product: {
              identifier: 'premium_annual',
              title: 'Yıllık Premium',
              priceString: '₺499,99',
            },
          },
        ],
      },
    })),
    purchasePackage: vi.fn(async () => ({ customerInfo: info(true) })),
    restorePurchases: vi.fn(async () => info(true)),
    addCustomerInfoUpdateListener: vi.fn(),
    removeCustomerInfoUpdateListener: vi.fn(),
  };
}

const config: RevenueCatPublicConfig = {
  availability: { enabled: true, reason: 'ready' },
  apiKey: 'public_test_key',
  platform: 'android',
  store: 'production',
};

describe('RevenueCat billing adapter', () => {
  it('configures with the stable authenticated UUID and switches accounts with logIn', async () => {
    const mock = sdk();
    const provider = new RevenueCatBillingProvider(config, mock as never);
    await provider.identify('10000000-0000-4000-8000-000000000001');
    await provider.identify('10000000-0000-4000-8000-000000000002');
    expect(mock.configure).toHaveBeenCalledWith({
      apiKey: 'public_test_key',
      appUserID: '10000000-0000-4000-8000-000000000001',
    });
    expect(mock.logIn).toHaveBeenCalledWith('10000000-0000-4000-8000-000000000002');
  });

  it('does not restore a stale provider identity after a concurrent account switch', async () => {
    let resolveFirst!: (value: ReturnType<typeof info>) => void;
    const first = new Promise<ReturnType<typeof info>>((resolve) => {
      resolveFirst = resolve;
    });
    const mock = sdk();
    mock.getCustomerInfo.mockImplementationOnce(() => first);
    const provider = new RevenueCatBillingProvider(config, mock as never);
    const userA = provider.identify('10000000-0000-4000-8000-000000000001');
    const userB = provider.identify('10000000-0000-4000-8000-000000000002');
    await userB;
    resolveFirst(info(true));
    expect((await userA).status).toBe('unavailable');
    expect((await provider.getSubscription()).status).toBe('free');
  });

  it('clears provider identity on logout and detaches the listener', async () => {
    const mock = sdk();
    const provider = new RevenueCatBillingProvider(config, mock as never);
    await provider.identify('10000000-0000-4000-8000-000000000001');
    await provider.clearIdentity();
    expect(mock.logOut).toHaveBeenCalledOnce();
    expect(mock.removeCustomerInfoUpdateListener).toHaveBeenCalledOnce();
  });

  it('loads the default Offering with the $rc_monthly and $rc_annual packages, store-formatted price preserved', async () => {
    const mock = sdk();
    const provider = new RevenueCatBillingProvider(config, mock as never);
    await provider.identify('10000000-0000-4000-8000-000000000001');
    expect(await provider.getOffering()).toEqual({
      id: 'default',
      packages: [
        {
          id: '$rc_monthly',
          packageType: 'monthly',
          productId: 'premium_monthly',
          title: 'Aylık Premium',
          priceString: '₺49,99',
        },
        {
          id: '$rc_annual',
          packageType: 'annual',
          productId: 'premium_annual',
          title: 'Yıllık Premium',
          priceString: '₺499,99',
        },
      ],
    });
  });

  it('recognises the premium entitlement from CustomerInfo regardless of store', async () => {
    const mock = sdk();
    mock.getCustomerInfo.mockResolvedValue(info(true));
    const provider = new RevenueCatBillingProvider(
      { ...config, store: 'test' },
      mock as never,
    );
    const state = await provider.identify('10000000-0000-4000-8000-000000000001');
    expect(state).toMatchObject({ status: 'premium', entitlementActive: true });
  });

  it('unlocks a mocked purchase only after CustomerInfo has active Premium', async () => {
    const mock = sdk();
    const provider = new RevenueCatBillingProvider(config, mock as never);
    await provider.identify('10000000-0000-4000-8000-000000000001');
    await provider.getOffering();
    expect((await provider.purchasePackage('$rc_monthly')).kind).toBe('success');
    mock.purchasePackage.mockResolvedValueOnce({ customerInfo: info(false) });
    expect((await provider.purchasePackage('$rc_monthly')).kind).toBe('pending');
  });

  it('treats user cancellation as a calm non-error result', async () => {
    const mock = sdk();
    mock.purchasePackage.mockRejectedValueOnce({
      code: 'PURCHASE_CANCELLED_ERROR',
      userCancelled: true,
    });
    const provider = new RevenueCatBillingProvider(config, mock as never);
    await provider.identify('10000000-0000-4000-8000-000000000001');
    await provider.getOffering();
    expect((await provider.purchasePackage('$rc_monthly')).kind).toBe('cancelled');
  });

  it('restores active Premium and fails closed when billing is disabled', async () => {
    const mock = sdk();
    const provider = new RevenueCatBillingProvider(config, mock as never);
    await provider.identify('10000000-0000-4000-8000-000000000001');
    expect((await provider.restorePurchases()).kind).toBe('success');

    const disabled = new RevenueCatBillingProvider(
      {
        availability: { enabled: false, reason: 'disabled' },
        apiKey: null,
        platform: 'android',
        store: 'production',
      } satisfies RevenueCatPublicConfig,
      mock as never,
    );
    expect((await disabled.identify('10000000-0000-4000-8000-000000000001')).status).toBe(
      'unavailable',
    );
    expect(mock.configure).toHaveBeenCalledTimes(1);
  });
});
