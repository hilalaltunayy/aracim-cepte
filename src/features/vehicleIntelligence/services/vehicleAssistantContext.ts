import type { VehicleIntelligenceSnapshot } from '../domain/vehicleIntelligence';

export function buildVehicleAssistantContext(snapshot: VehicleIntelligenceSnapshot) {
  return {
    vehicleId: snapshot.vehicleId,
    generatedAt: snapshot.generatedAt,
    currentOdometer: snapshot.facts.currentOdometer,
    highPrioritySignals: snapshot.signals.slice(0, 5),
    maintenanceFacts: snapshot.facts.maintenance,
    documentFacts: snapshot.facts.documents,
    expertiseFacts: snapshot.facts.expertise,
    fuelFacts: snapshot.facts.fuel,
    costFacts: snapshot.facts.cost,
    reminderFacts: snapshot.facts.reminders,
    dataQuality: snapshot.dataQuality,
  } as const;
}
