import { useEffect } from 'react';
import { PremiumPaywallScreen } from '@/features/billing/components/PremiumPaywallScreen';
import { useBillingStore } from '@/features/billing/store/billingStore';
import { revenueCatBillingProvider } from '@/features/billing/services/RevenueCatBillingProvider';
import { useDataStore } from '@/store/dataStore';

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

  useEffect(() => {
    void loadOffering();
  }, [loadOffering]);

  const purchase = async () => {
    const result = await purchaseSelected();
    if (result.kind === 'success') await refresh();
  };

  const restorePurchases = async () => {
    const result = await restore();
    if (result.kind === 'success') await refresh();
  };

  return (
    <PremiumPaywallScreen
      authoritativePlanId={entitlements.planId}
      billingEnabled={billingEnabled}
      subscription={subscription}
      offering={offering}
      selectedPackageId={selectedPackageId}
      loading={loading}
      message={message}
      onSelectPackage={selectPackage}
      onPurchase={() => void purchase()}
      onRestore={() => void restorePurchases()}
      onReload={() => void loadOffering()}
    />
  );
}
