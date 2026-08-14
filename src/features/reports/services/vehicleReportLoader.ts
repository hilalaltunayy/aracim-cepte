import type { Vehicle, VehicleRecord } from '@/domain/entities';
import { appRepository } from '@/data/repositories/SupabaseAppRepository';

export type VehicleRecordsLoader = (vehicleId: string) => Promise<VehicleRecord[]>;

/** Bounded, owner-scoped repository reads; repository RLS remains the source of authorization. */
export async function loadReportsForVehicles(
  vehicles: Vehicle[],
  maxVehicles: number,
  load: VehicleRecordsLoader = (vehicleId) => appRepository.loadVehicleReportRecords(vehicleId),
) {
  const selected = vehicles.slice(0, Math.max(0, Math.min(maxVehicles, 3)));
  return Promise.all(selected.map(async (vehicle) => ({ vehicle, records: await load(vehicle.id) })));
}
