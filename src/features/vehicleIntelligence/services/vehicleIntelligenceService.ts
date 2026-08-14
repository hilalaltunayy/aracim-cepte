import type { ExpertiseReport, Reminder, Vehicle, VehicleDocument, VehicleRecord } from '@/domain/entities';
import { buildVehicleIntelligence, type VehicleIntelligenceInput } from '../domain/vehicleIntelligence';

/** Single pure entry point for screens and the future assistant; callers supply already owner-scoped data. */
export function buildVehicleIntelligenceSnapshot(input: VehicleIntelligenceInput) {
  return buildVehicleIntelligence(input);
}

export function createVehicleIntelligenceInput(
  vehicle: Pick<Vehicle, 'id' | 'brand' | 'model' | 'year' | 'currentKm'>,
  data: {
    records: readonly VehicleRecord[];
    documents: readonly VehicleDocument[];
    expertiseReports: readonly ExpertiseReport[];
    reminders: readonly Reminder[];
  },
  now?: Date,
): VehicleIntelligenceInput {
  return { vehicle, ...data, now };
}
