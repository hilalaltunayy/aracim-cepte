import { create } from 'zustand';
import type { BillingProvider } from '../services/BillingProvider';
import { revenueCatBillingProvider } from '../services/RevenueCatBillingProvider';
import {
  UNKNOWN_BILLING_SUBSCRIPTION,
  type BillingOffering,
  type BillingOperationResult,
  type BillingSubscriptionState,
} from '../domain/billing';

interface BillingState {
  userId: string | null;
  subscription: BillingSubscriptionState;
  offering: BillingOffering | null;
  selectedPackageId: string | null;
  ready: boolean;
  loading: boolean;
  message: string | null;
  syncUser: (userId: string) => Promise<void>;
  clearUser: () => Promise<void>;
  loadOffering: () => Promise<void>;
  selectPackage: (packageId: string) => void;
  purchaseSelected: () => Promise<BillingOperationResult>;
  restore: () => Promise<BillingOperationResult>;
  clearMessage: () => void;
}

const initialSnapshot = {
  userId: null,
  subscription: UNKNOWN_BILLING_SUBSCRIPTION,
  offering: null,
  selectedPackageId: null,
  ready: false,
  loading: false,
  message: null,
} satisfies Pick<
  BillingState,
  'userId' | 'subscription' | 'offering' | 'selectedPackageId' | 'ready' | 'loading' | 'message'
>;

function operationMessage(result: BillingOperationResult, restoring = false) {
  switch (result.kind) {
    case 'success':
      return restoring
        ? 'Premium aboneliğiniz geri yüklendi. Hesap yetkileri eşitleniyor.'
        : 'Satın alma doğrulandı. Premium hesap yetkileri eşitleniyor.';
    case 'cancelled':
      return 'Satın alma iptal edildi. Herhangi bir ücret alınmadı.';
    case 'pending':
      return 'Satın alma mağazada işleniyor. Premium yalnız doğrulama tamamlandığında açılır.';
    case 'no_purchase':
      return 'Bu mağaza hesabında geri yüklenecek aktif Premium aboneliği bulunamadı.';
    case 'failed':
      return 'Satın alma hizmetine şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.';
  }
}

export function createBillingStore(provider: BillingProvider) {
  let identitySequence = 0;
  let unsubscribe: (() => void) | null = null;

  return create<BillingState>((set, get) => ({
    ...initialSnapshot,
    syncUser: async (userId) => {
      const sequence = ++identitySequence;
      unsubscribe?.();
      unsubscribe = null;
      set({
        ...initialSnapshot,
        userId,
        loading: true,
      });
      const subscription = await provider.identify(userId);
      if (sequence !== identitySequence || get().userId !== userId) return;
      unsubscribe = provider.subscribe((next) => {
        if (sequence === identitySequence && get().userId === userId) set({ subscription: next });
      });
      set({ subscription, loading: false, ready: true });
    },
    clearUser: async () => {
      ++identitySequence;
      unsubscribe?.();
      unsubscribe = null;
      set(initialSnapshot);
      await provider.clearIdentity();
    },
    loadOffering: async () => {
      if (!get().userId || !provider.getAvailability().enabled) {
        set({ offering: null, selectedPackageId: null, ready: true, loading: false });
        return;
      }
      set({ loading: true, message: null });
      const offering = await provider.getOffering();
      const preferred =
        offering?.packages.find((item) => item.packageType === 'annual') ??
        offering?.packages.find((item) => item.packageType === 'monthly') ??
        offering?.packages[0] ??
        null;
      set({
        offering,
        selectedPackageId: preferred?.id ?? null,
        loading: false,
        message: offering
          ? null
          : 'Premium paketleri şu anda yüklenemiyor. Daha sonra tekrar deneyin.',
      });
    },
    selectPackage: (selectedPackageId) => set({ selectedPackageId, message: null }),
    purchaseSelected: async () => {
      const packageId = get().selectedPackageId;
      if (!packageId) {
        const result: BillingOperationResult = {
          kind: 'failed',
          subscription: get().subscription,
        };
        set({ message: operationMessage(result) });
        return result;
      }
      set({ loading: true, message: null });
      const result = await provider.purchasePackage(packageId);
      set({
        loading: false,
        subscription: result.subscription,
        message: operationMessage(result),
      });
      return result;
    },
    restore: async () => {
      set({ loading: true, message: null });
      const result = await provider.restorePurchases();
      set({
        loading: false,
        subscription: result.subscription,
        message: operationMessage(result, true),
      });
      return result;
    },
    clearMessage: () => set({ message: null }),
  }));
}

export const useBillingStore = createBillingStore(revenueCatBillingProvider);
