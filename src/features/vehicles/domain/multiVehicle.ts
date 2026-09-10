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
  | { status: 'verifying'; reason: 'resolving' | 'server_confirmation'; capacity: VehicleCapacity }
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

/**
 * Unknown is fail-closed for writes but is never presented as a definitive Free
 * limit.
 *
 * `serverConfirmed` is the trusted-mirror answer: when Premium is known only from
 * the store (RevenueCat active, `user_entitlements` mirror not caught up yet), the
 * server `create_vehicle_with_limit` gate still enforces the Free limit. Rather
 * than open a form the server will reject with a false "limit reached", hold a
 * short verifying state — reconciliation is already in flight — until the mirror
 * either confirms Premium (capacity opens to 3) or the store itself drops to Free
 * (the honest Free limit shows). Existing vehicles are unaffected either way.
 */
export function getVehicleCreationGate(
  vehicleCount: number,
  entitlementStatus: EntitlementStatus,
  entitlements: Pick<PlanEntitlements, 'maxVehicles'> | null | undefined,
  serverConfirmed = true,
): VehicleCreationGate {
  const capacity = getVehicleCapacity(vehicleCount, entitlements);
  if (entitlementStatus === 'unknown') {
    return { status: 'verifying', reason: 'resolving', capacity };
  }
  if (
    entitlementStatus === 'premium' &&
    !serverConfirmed &&
    !canCreateVehicle(capacity.current, FREE_ENTITLEMENTS)
  ) {
    return { status: 'verifying', reason: 'server_confirmation', capacity };
  }
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
