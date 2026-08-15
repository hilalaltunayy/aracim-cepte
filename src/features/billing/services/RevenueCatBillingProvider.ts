import Purchases, {
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesPackage,
} from 'react-native-purchases';
import type { BillingProvider } from './BillingProvider';
import { getRevenueCatPublicConfig, type RevenueCatPublicConfig } from './billingConfig';
import {
  FREE_BILLING_SUBSCRIPTION,
  UNAVAILABLE_BILLING_SUBSCRIPTION,
  normalizePackageType,
  normalizeRevenueCatCustomerInfo,
  type BillingOffering,
  type BillingOperationResult,
  type BillingSubscriptionState,
} from '../domain/billing';

type RevenueCatSdk = Pick<
  typeof Purchases,
  | 'configure'
  | 'logIn'
  | 'logOut'
  | 'getCustomerInfo'
  | 'getOfferings'
  | 'purchasePackage'
  | 'restorePurchases'
  | 'addCustomerInfoUpdateListener'
  | 'removeCustomerInfoUpdateListener'
> & { PURCHASES_ERROR_CODE: typeof Purchases.PURCHASES_ERROR_CODE };

function isCancelled(error: unknown, sdk: RevenueCatSdk) {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: unknown; userCancelled?: unknown };
  return (
    value.userCancelled === true || value.code === sdk.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

export class RevenueCatBillingProvider implements BillingProvider {
  private configured = false;
  private identitySequence = 0;
  private currentUserId: string | null = null;
  private nativeListener: CustomerInfoUpdateListener | null = null;
  private readonly listeners = new Set<(state: BillingSubscriptionState) => void>();
  private readonly packages = new Map<string, PurchasesPackage>();

  constructor(
    private readonly config: RevenueCatPublicConfig = getRevenueCatPublicConfig(),
    private readonly sdk: RevenueCatSdk = Purchases,
  ) {}

  getAvailability() {
    return this.config.availability;
  }

  async identify(userId: string): Promise<BillingSubscriptionState> {
    if (!this.config.availability.enabled || !this.config.apiKey || !this.config.platform)
      return UNAVAILABLE_BILLING_SUBSCRIPTION;
    const sequence = ++this.identitySequence;
    this.detachNativeListener();
    try {
      let customerInfo: CustomerInfo;
      if (!this.configured) {
        this.sdk.configure({ apiKey: this.config.apiKey, appUserID: userId });
        this.configured = true;
        customerInfo = await this.sdk.getCustomerInfo();
      } else if (this.currentUserId !== userId) {
        customerInfo = (await this.sdk.logIn(userId)).customerInfo;
      } else {
        customerInfo = await this.sdk.getCustomerInfo();
      }
      if (sequence !== this.identitySequence) return UNAVAILABLE_BILLING_SUBSCRIPTION;
      this.currentUserId = userId;
      this.attachNativeListener();
      return normalizeRevenueCatCustomerInfo(customerInfo, this.config.platform);
    } catch {
      this.currentUserId = null;
      return UNAVAILABLE_BILLING_SUBSCRIPTION;
    }
  }

  async clearIdentity() {
    ++this.identitySequence;
    this.detachNativeListener();
    this.currentUserId = null;
    this.packages.clear();
    if (!this.configured) return;
    try {
      await this.sdk.logOut();
    } catch {
      // Local billing state is cleared even when the provider is temporarily unreachable.
    }
  }

  async getSubscription() {
    if (!this.ready()) return UNAVAILABLE_BILLING_SUBSCRIPTION;
    try {
      return normalizeRevenueCatCustomerInfo(
        await this.sdk.getCustomerInfo(),
        this.config.platform ?? undefined,
      );
    } catch {
      return UNAVAILABLE_BILLING_SUBSCRIPTION;
    }
  }

  async getOffering(): Promise<BillingOffering | null> {
    if (!this.ready()) return null;
    try {
      const offering = (await this.sdk.getOfferings()).current;
      this.packages.clear();
      if (!offering) return null;
      return {
        id: offering.identifier,
        packages: offering.availablePackages.map((item) => {
          this.packages.set(item.identifier, item);
          return {
            id: item.identifier,
            packageType: normalizePackageType(item.packageType),
            title: item.product.title,
            productId: item.product.identifier,
            priceString: item.product.priceString,
          };
        }),
      };
    } catch {
      return null;
    }
  }

  async purchasePackage(packageId: string): Promise<BillingOperationResult> {
    const item = this.packages.get(packageId);
    if (!this.ready() || !item)
      return { kind: 'failed', subscription: UNAVAILABLE_BILLING_SUBSCRIPTION };
    try {
      const subscription = normalizeRevenueCatCustomerInfo(
        (await this.sdk.purchasePackage(item)).customerInfo,
        this.config.platform ?? undefined,
      );
      return subscription.entitlementActive
        ? { kind: 'success', subscription }
        : { kind: 'pending', subscription };
    } catch (error) {
      if (isCancelled(error, this.sdk))
        return { kind: 'cancelled', subscription: await this.getSubscription() };
      return { kind: 'failed', subscription: await this.getSubscription() };
    }
  }

  async restorePurchases(): Promise<BillingOperationResult> {
    if (!this.ready()) return { kind: 'failed', subscription: UNAVAILABLE_BILLING_SUBSCRIPTION };
    try {
      const subscription = normalizeRevenueCatCustomerInfo(
        await this.sdk.restorePurchases(),
        this.config.platform ?? undefined,
      );
      return subscription.entitlementActive
        ? { kind: 'success', subscription }
        : { kind: 'no_purchase', subscription: FREE_BILLING_SUBSCRIPTION };
    } catch {
      return { kind: 'failed', subscription: await this.getSubscription() };
    }
  }

  subscribe(listener: (state: BillingSubscriptionState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private ready() {
    return Boolean(
      this.config.availability.enabled &&
      this.config.apiKey &&
      this.config.platform &&
      this.configured &&
      this.currentUserId,
    );
  }

  private attachNativeListener() {
    if (!this.ready() || this.nativeListener) return;
    this.nativeListener = (customerInfo) => {
      if (!this.currentUserId) return;
      const state = normalizeRevenueCatCustomerInfo(
        customerInfo,
        this.config.platform ?? undefined,
      );
      for (const listener of this.listeners) listener(state);
    };
    this.sdk.addCustomerInfoUpdateListener(this.nativeListener);
  }

  private detachNativeListener() {
    if (!this.nativeListener) return;
    this.sdk.removeCustomerInfoUpdateListener(this.nativeListener);
    this.nativeListener = null;
  }
}

export const revenueCatBillingProvider = new RevenueCatBillingProvider();
