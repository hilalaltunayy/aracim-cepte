import { useEffect, useState } from 'react';
import { PremiumPaywallScreen } from '@/features/billing/components/PremiumPaywallScreen';
import { useBillingStore } from '@/features/billing/store/billingStore';
import { revenueCatBillingProvider } from '@/features/billing/services/RevenueCatBillingProvider';
import { useDataStore } from '@/store/dataStore';

/** Poll the authoritative entitlement until the RevenueCat webhook lands. */
async function waitForServerPremium(
  refresh: () => Promise<void>,
  isPremium: () => boolean,
  attempts = 5,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await refresh();
    if (isPremium()) return;
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
}

export default function PremiumRoute() {
  const subscription = useBillingStore((state) => state.subscription);
  const offering = useBillingStore((state) => state.offering);
  const selectedPackageId = useBillingStore((state) => state.selectedPackageId);
  const loading = useBillingStore((state) => state.loading);
  const message = useBillingStore((state) => state.message);
  const loadOffering = useBillingStore((state) => state.loadOffering);
  const selectPackage = useBillingStore((state) => state.selectPackage);
  const purchaseSelected = useBillingStore((state) => state.purchaseSelected);
  const restore = useBillingStore((state) => state.restore);
  const entitlements = useDataStore((state) => state.entitlements);
  const refresh = useDataStore((state) => state.refresh);
  const billingEnabled = revenueCatBillingProvider.getAvailability().enabled;
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    void loadOffering();
  }, [loadOffering]);

  const syncEntitlement = async () => {
    setReconciling(true);
    try {
      await waitForServerPremium(
        refresh,
        () => useDataStore.getState().entitlements.planId === 'premium',
      );
    } finally {
      setReconciling(false);
    }
  };

  const purchase = async () => {
    const result = await purchaseSelected();
    if (result.kind === 'success') await syncEntitlement();
  };

  const restorePurchases = async () => {
    const result = await restore();
    if (result.kind === 'success') await syncEntitlement();
  };

  return (
    <PremiumPaywallScreen
      authoritativePlanId={entitlements.planId}
      billingEnabled={billingEnabled}
      subscription={subscription}
      offering={offering}
      selectedPackageId={selectedPackageId}
      loading={loading}
      reconciling={reconciling}
      message={message}
      onSelectPackage={selectPackage}
      onPurchase={() => void purchase()}
      onRestore={() => void restorePurchases()}
      onReload={() => void loadOffering()}
    />
  );
}
