import type { Vehicle } from '@/domain/entities';
import {
  FREE_ENTITLEMENTS,
  canCreateVehicle,
  type PlanEntitlements,
} from '@/features/entitlements/domain/entitlements';
import type { EntitlementStatus } from '@/features/entitlements/domain/entitlementResolution';
import { resolveActiveVehicleId } from '@/shared/utils/vehicleState';

export interface VehicleCapacity {
  current: number;
  maximum: number;
  canAdd: boolean;
}

export type VehicleCreationGate =
  | { status: 'verifying'; capacity: VehicleCapacity }
  | { status: 'allowed'; capacity: VehicleCapacity }
  | { status: 'limit_reached'; capacity: VehicleCapacity };

export function getVehicleCapacity(
  vehicleCount: number,
  entitlements: Pick<PlanEntitlements, 'maxVehicles'> | null | undefined = FREE_ENTITLEMENTS,
): VehicleCapacity {
  const current = Number.isInteger(vehicleCount) && vehicleCount >= 0 ? vehicleCount : 0;
  const maximum = entitlements?.maxVehicles ?? FREE_ENTITLEMENTS.maxVehicles;
  return { current, maximum, canAdd: canCreateVehicle(current, { maxVehicles: maximum }) };
}

/** Unknown is fail-closed for writes but is never presented as a definitive Free limit. */
export function getVehicleCreationGate(
  vehicleCount: number,
  entitlementStatus: EntitlementStatus,
  entitlements: Pick<PlanEntitlements, 'maxVehicles'> | null | undefined,
): VehicleCreationGate {
  const capacity = getVehicleCapacity(vehicleCount, entitlements);
  if (entitlementStatus === 'unknown') return { status: 'verifying', capacity };
  return capacity.canAdd ? { status: 'allowed', capacity } : { status: 'limit_reached', capacity };
}

export function getVehicleDeletionOutcome(
  remainingVehicles: readonly Vehicle[],
  preferredActiveVehicleId: string | null,
): {
  activeVehicleId: string | null;
  destination: '/(tabs)/vehicle' | '/vehicle/edit';
} {
  const activeVehicleId = resolveActiveVehicleId(remainingVehicles, preferredActiveVehicleId);
  return {
    activeVehicleId,
    destination: activeVehicleId ? '/(tabs)/vehicle' : '/vehicle/edit',
  };
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
