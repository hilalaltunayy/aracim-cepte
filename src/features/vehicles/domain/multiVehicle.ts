import type { Vehicle } from '@/domain/entities';
import {
  FREE_ENTITLEMENTS,
  canCreateVehicle,
  type PlanEntitlements,
} from '@/features/entitlements/domain/entitlements';

export interface VehicleCapacity {
  current: number;
  maximum: number;
  canAdd: boolean;
}

export function getVehicleCapacity(
  vehicleCount: number,
  entitlements: Pick<PlanEntitlements, 'maxVehicles'> | null | undefined = FREE_ENTITLEMENTS,
): VehicleCapacity {
  const current = Number.isInteger(vehicleCount) && vehicleCount >= 0 ? vehicleCount : 0;
  const maximum = entitlements?.maxVehicles ?? FREE_ENTITLEMENTS.maxVehicles;
  return { current, maximum, canAdd: canCreateVehicle(current, { maxVehicles: maximum }) };
}

export function getVehicleDisplayName(vehicle: Pick<Vehicle, 'brand' | 'model'>): string {
  return [vehicle.brand, vehicle.model]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ');
}

export function getVehicleLimitMessage(capacity: Pick<VehicleCapacity, 'maximum'>): string {
  return `Planınızda en fazla ${capacity.maximum} araç ekleyebilirsiniz. Mevcut araçlarınız korunur.`;
}

/** A response for an old vehicle selection must never overwrite the current vehicle bundle. */
export function canApplyVehicleData(
  activeVehicleId: string | null,
  responseVehicleId: string,
  expectedLoadSequence: number,
  currentLoadSequence: number,
): boolean {
  return activeVehicleId === responseVehicleId && expectedLoadSequence === currentLoadSequence;
}
