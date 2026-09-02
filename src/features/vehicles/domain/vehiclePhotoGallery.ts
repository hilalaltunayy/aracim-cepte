import type { PlanEntitlements } from '@/features/entitlements/domain/entitlements';
import type { VehiclePhoto } from '@/domain/entities';

export interface VehiclePhotoCapacity {
  current: number;
  maximum: number;
  canAdd: boolean;
  isOverCapacity: boolean;
}

export function getVehiclePhotoCapacity(
  photoCount: number,
  entitlements: Pick<PlanEntitlements, 'maxVehiclePhotos'>,
): VehiclePhotoCapacity {
  const current = Math.max(0, photoCount);
  return {
    current,
    maximum: entitlements.maxVehiclePhotos,
    canAdd: current < entitlements.maxVehiclePhotos,
    isOverCapacity: current > entitlements.maxVehiclePhotos,
  };
}

/** Primary is always rendered first; the remaining order is stable and server-defined. */
export function orderVehiclePhotos(photos: readonly VehiclePhoto[]): VehiclePhoto[] {
  return [...photos].sort(
    (left, right) =>
      Number(right.isPrimary) - Number(left.isPrimary) ||
      left.sortOrder - right.sortOrder ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id),
  );
}

export function getVehiclePhotoLimitMessage(capacity: VehiclePhotoCapacity): string {
  return `Planınızda en fazla ${capacity.maximum} araç fotoğrafı ekleyebilirsiniz.`;
}
