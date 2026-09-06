import type { VehicleIntelligenceSnapshot } from '../domain/vehicleIntelligence';
import type { VehicleAssistantContext } from '@/features/vehicleAssistant/domain/assistantContract';

/** Canonical, privacy-minimized TASK-034 → TASK-035 hand-off. */
export function buildVehicleAssistantContext(
  snapshot: VehicleIntelligenceSnapshot,
  vehicle?: Partial<VehicleAssistantContext['vehicle']>,
): VehicleAssistantContext {
  return {
    vehicleId: snapshot.vehicleId,
    generatedAt: snapshot.generatedAt,
    vehicle: {
      displayName: vehicle?.displayName ?? 'Araç',
      brand: vehicle?.brand ?? null,
      model: vehicle?.model ?? null,
      color: vehicle?.color ?? null,
      fuelType: vehicle?.fuelType ?? null,
      bodyType: vehicle?.bodyType ?? null,
      year: vehicle?.year ?? null,
      currentOdometer: snapshot.facts.currentOdometer,
    },
    highPrioritySignals: snapshot.signals.slice(0, 5),
    maintenanceFacts: snapshot.facts.maintenance,
    documentFacts: snapshot.facts.documents,
    expertiseFacts: snapshot.facts.expertise,
    fuelFacts: snapshot.facts.fuel,
    costFacts: snapshot.facts.cost,
    reminderFacts: snapshot.facts.reminders,
    trends: snapshot.trends,
    dataQuality: {
      validFuelRecords: snapshot.dataQuality.validFuelRecords,
      knownOdometerRecords: snapshot.dataQuality.knownOdometerRecords,
      hasSufficientFuelTrendData: snapshot.dataQuality.hasSufficientFuelTrendData,
      hasSufficientDistanceData: snapshot.dataQuality.hasSufficientDistanceData,
      availableScoreDomains: snapshot.dataQuality.availableScoreDomains.join(','),
    },
  };
}
