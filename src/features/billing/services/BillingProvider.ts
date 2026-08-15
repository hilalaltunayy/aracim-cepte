import type {
  BillingOffering,
  BillingOperationResult,
  BillingSubscriptionState,
} from '../domain/billing';

export interface BillingAvailability {
  enabled: boolean;
  reason: 'ready' | 'disabled' | 'missing_key' | 'unsupported_platform';
}

export interface BillingProvider {
  getAvailability(): BillingAvailability;
  identify(userId: string): Promise<BillingSubscriptionState>;
  clearIdentity(): Promise<void>;
  getSubscription(): Promise<BillingSubscriptionState>;
  getOffering(): Promise<BillingOffering | null>;
  purchasePackage(packageId: string): Promise<BillingOperationResult>;
  restorePurchases(): Promise<BillingOperationResult>;
  subscribe(listener: (state: BillingSubscriptionState) => void): () => void;
}
