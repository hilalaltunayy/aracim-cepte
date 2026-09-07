import { useEffect, useState } from 'react';
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
  const entitlementStatus = useDataStore((state) => state.entitlementStatus);
  const awaitingServerSync = useDataStore((state) => state.entitlementAwaitingSync);
  const syncEntitlements = useDataStore((state) => state.syncEntitlements);
  const billingEnabled = revenueCatBillingProvider.getAvailability().enabled;
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    void loadOffering();
  }, [loadOffering]);

  // The purchase result already unlocked the UI through the billing store; this
  // asks the backend to re-verify against RevenueCat so server-enforced Premium
  // operations work too, instead of blind-polling for a webhook that may lag.
  const syncEntitlement = async () => {
    setReconciling(true);
    try {
      await syncEntitlements();
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
      entitlementStatus={entitlementStatus}
      awaitingServerSync={awaitingServerSync}
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
