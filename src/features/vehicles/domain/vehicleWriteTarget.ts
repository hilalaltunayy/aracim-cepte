import type { Vehicle } from '@/domain/entities';

/**
 * The vehicle a form writes to, fixed for that form's whole lifetime.
 *
 * Store actions used to resolve the target from the live `activeVehicleId` at
 * submit time, so switching vehicles with a form open could save the record
 * against the wrong car — and, for the two direct-update paths, could move an
 * existing record to it. The target is now decided once, by the caller, and
 * validated here.
 */

/** An existing record always keeps its own vehicle; a new one uses the captured active vehicle. */
export function resolveVehicleWriteTarget(
  existingVehicleId: string | null | undefined,
  capturedActiveVehicleId: string | null | undefined,
): string | null {
  return existingVehicleId ?? capturedActiveVehicleId ?? null;
}

/**
 * Whether the captured target is still a vehicle this account owns.
 *
 * `vehicles` is the owner-scoped list the store holds, and sign-out empties it,
 * so this is also what stops a form left open across a logout from writing
 * under the next account.
 */
export function isVehicleWriteTargetOwned(
  targetVehicleId: string | null | undefined,
  vehicles: readonly Pick<Vehicle, 'id'>[],
): boolean {
  return Boolean(targetVehicleId) && vehicles.some((vehicle) => vehicle.id === targetVehicleId);
}

export const MISSING_VEHICLE_TARGET_MESSAGE = 'Aktif araç yok.';

/**
 * Deliberately does not name the vehicle: by the time this fires the target is
 * gone from the list, and after a sign-out it belonged to another account.
 */
export const LOST_VEHICLE_TARGET_MESSAGE =
  'Bu kayıt için seçilen araç artık kullanılamıyor. Ekranı yeniden açıp tekrar deneyin.';

/** The message to show for a target that cannot be written to, or `null` when it can. */
export function getVehicleWriteTargetError(
  targetVehicleId: string | null | undefined,
  vehicles: readonly Pick<Vehicle, 'id'>[],
): string | null {
  if (!targetVehicleId) return MISSING_VEHICLE_TARGET_MESSAGE;
  return isVehicleWriteTargetOwned(targetVehicleId, vehicles) ? null : LOST_VEHICLE_TARGET_MESSAGE;
}
