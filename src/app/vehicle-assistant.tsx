import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { NoVehicleState, Screen } from '@/shared/components/ui';
import { useDataStore } from '@/store/dataStore';
import { getAiAssistantPolicy } from '@/features/entitlements/domain/entitlements';
import { VehicleAssistantScreen } from '@/features/vehicleAssistant/components/VehicleAssistantScreen';
import {
  askVehicleAssistant,
  loadAiAssistantQuota,
} from '@/features/vehicleAssistant/services/vehicleAssistantService';
import type { AssistantQuotaState } from '@/features/vehicleAssistant/domain/assistantContract';

export default function VehicleAssistantRoute() {
  const { vehicles, activeVehicleId, entitlements } = useDataStore();
  const vehicle = vehicles.find((item) => item.id === activeVehicleId) ?? null;
  const policy = getAiAssistantPolicy(entitlements);
  const [quota, setQuota] = useState<AssistantQuotaState | null>(null);

  useEffect(() => {
    let active = true;
    void loadAiAssistantQuota().then((value) => {
      if (active) setQuota(value);
    });
    return () => {
      active = false;
    };
  }, [activeVehicleId]);

  if (!vehicle)
    return (
      <Screen>
        <NoVehicleState onCreate={() => router.navigate('/vehicle/edit')} />
      </Screen>
    );
  return (
    <VehicleAssistantScreen
      key={vehicle.id}
      vehicleName={`${vehicle.brand} ${vehicle.model}`}
      initialQuota={quota}
      entitlementLimit={policy.monthlyQuota}
      enabled={policy.enabled}
      onAsk={(question) => askVehicleAssistant(vehicle.id, question)}
    />
  );
}
