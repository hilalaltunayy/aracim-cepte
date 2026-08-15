/* eslint-disable import/first */
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native-purchases', () => ({
  default: {},
}));
vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

import type { BillingProvider } from '../services/BillingProvider';
import { createBillingStore } from './billingStore';
import type {
  BillingOffering,
  BillingOperationResult,
  BillingSubscriptionState,
} from '../domain/billing';

const free: BillingSubscriptionState = { status: 'free', entitlementActive: false };
const premium: BillingSubscriptionState = { status: 'premium', entitlementActive: true };

function provider(overrides: Partial<BillingProvider> = {}): BillingProvider {
  return {
    getAvailability: () => ({ enabled: true, reason: 'ready' }),
    identify: vi.fn(async () => free),
    clearIdentity: vi.fn(async () => undefined),
    getSubscription: vi.fn(async () => free),
    getOffering: vi.fn(async (): Promise<BillingOffering | null> => ({
      id: 'default',
      packages: [
        {
          id: 'monthly',
          packageType: 'monthly',
          productId: 'premium_monthly',
          title: 'Aylık',
          priceString: '₺49,99',
        },
        {
          id: 'annual',
          packageType: 'annual',
          productId: 'premium_annual',
          title: 'Yıllık',
          priceString: '₺499,99',
        },
      ],
    })),
    purchasePackage: vi.fn(async (): Promise<BillingOperationResult> => ({
      kind: 'success',
      subscription: premium,
    })),
    restorePurchases: vi.fn(async (): Promise<BillingOperationResult> => ({
      kind: 'no_purchase',
      subscription: free,
    })),
    subscribe: vi.fn(() => () => undefined),
    ...overrides,
  };
}

describe('billing state isolation', () => {
  it('does not let a slower previous account leak Premium into a switched account', async () => {
    let resolveFirst!: (value: BillingSubscriptionState) => void;
    const first = new Promise<BillingSubscriptionState>((resolve) => {
      resolveFirst = resolve;
    });
    const mock = provider({
      identify: vi
        .fn()
        .mockImplementationOnce(() => first)
        .mockResolvedValueOnce(free),
    });
    const store = createBillingStore(mock);
    const userA = store.getState().syncUser('user-a');
    await store.getState().syncUser('user-b');
    resolveFirst(premium);
    await userA;
    expect(store.getState().userId).toBe('user-b');
    expect(store.getState().subscription.status).toBe('free');
  });

  it('clears local subscription and offering state before provider logout completes', async () => {
    const mock = provider({ identify: vi.fn(async () => premium) });
    const store = createBillingStore(mock);
    await store.getState().syncUser('user-a');
    await store.getState().loadOffering();
    await store.getState().clearUser();
    expect(store.getState()).toMatchObject({
      userId: null,
      offering: null,
      selectedPackageId: null,
      ready: false,
    });
    expect(mock.clearIdentity).toHaveBeenCalledOnce();
  });

  it('prefers the annual remote package and verifies purchase state', async () => {
    const mock = provider();
    const store = createBillingStore(mock);
    await store.getState().syncUser('user-a');
    await store.getState().loadOffering();
    expect(store.getState().selectedPackageId).toBe('annual');
    expect((await store.getState().purchaseSelected()).kind).toBe('success');
    expect(store.getState().subscription.status).toBe('premium');
  });

  it('handles restore with no purchase without granting Premium', async () => {
    const store = createBillingStore(provider());
    await store.getState().syncUser('user-a');
    expect((await store.getState().restore()).kind).toBe('no_purchase');
    expect(store.getState().subscription.status).toBe('free');
  });
});
