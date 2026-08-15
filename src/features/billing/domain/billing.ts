export const REVENUECAT_PREMIUM_ENTITLEMENT_ID = 'premium' as const;

export type BillingSubscriptionStatus = 'free' | 'premium' | 'unknown' | 'unavailable';
export type BillingPlatform = 'android' | 'ios';
export type BillingPackageType = 'monthly' | 'annual' | 'other';

export interface BillingSubscriptionState {
  status: BillingSubscriptionStatus;
  entitlementActive: boolean;
  productId?: string;
  expirationDate?: string | null;
  willRenew?: boolean;
  platform?: BillingPlatform;
}

export interface BillingPackage {
  id: string;
  packageType: BillingPackageType;
  title: string;
  productId: string;
  priceString: string;
}

export interface BillingOffering {
  id: string;
  packages: BillingPackage[];
}

export type BillingOperationResult =
  | { kind: 'success'; subscription: BillingSubscriptionState }
  | { kind: 'cancelled'; subscription: BillingSubscriptionState }
  | { kind: 'pending'; subscription: BillingSubscriptionState }
  | { kind: 'no_purchase'; subscription: BillingSubscriptionState }
  | { kind: 'failed'; subscription: BillingSubscriptionState };

export const FREE_BILLING_SUBSCRIPTION: Readonly<BillingSubscriptionState> = {
  status: 'free',
  entitlementActive: false,
};

export const UNKNOWN_BILLING_SUBSCRIPTION: Readonly<BillingSubscriptionState> = {
  status: 'unknown',
  entitlementActive: false,
};

export const UNAVAILABLE_BILLING_SUBSCRIPTION: Readonly<BillingSubscriptionState> = {
  status: 'unavailable',
  entitlementActive: false,
};

export interface RevenueCatEntitlementLike {
  isActive: boolean;
  productIdentifier: string;
  expirationDate: string | null;
  willRenew: boolean;
}

export interface RevenueCatCustomerInfoLike {
  entitlements: {
    all: Record<string, RevenueCatEntitlementLike | undefined>;
  };
}

export function normalizeRevenueCatCustomerInfo(
  customerInfo: RevenueCatCustomerInfoLike | null | undefined,
  platform?: BillingPlatform,
): BillingSubscriptionState {
  const entitlement = customerInfo?.entitlements.all[REVENUECAT_PREMIUM_ENTITLEMENT_ID];
  if (!entitlement?.isActive) return { ...FREE_BILLING_SUBSCRIPTION, platform };
  return {
    status: 'premium',
    entitlementActive: true,
    productId: entitlement.productIdentifier,
    expirationDate: entitlement.expirationDate,
    willRenew: entitlement.willRenew,
    platform,
  };
}

export function normalizePackageType(packageType: string): BillingPackageType {
  if (packageType === 'MONTHLY') return 'monthly';
  if (packageType === 'ANNUAL') return 'annual';
  return 'other';
}
