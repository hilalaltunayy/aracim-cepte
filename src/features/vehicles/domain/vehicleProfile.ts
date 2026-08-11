import type { BodyType, Vehicle, VehicleColorId } from '@/domain/entities';
import { getVehicleBodyTypeLabel } from '@/features/vehicles/config/bodyTypes';
import {
  getVehicleColorDefinition,
  getVehicleColorLabel,
  resolveLegacyVehicleColor,
} from '@/features/vehicles/config/vehicleColors';

export interface VehicleTaxonomyFormState {
  bodyType: BodyType | '';
  colorId: VehicleColorId | '';
}

export function getVehicleTaxonomyFormState(
  vehicle?: Pick<Vehicle, 'bodyType' | 'colorId' | 'color'> | null,
): VehicleTaxonomyFormState {
  return {
    bodyType: vehicle?.bodyType ?? '',
    colorId: vehicle?.colorId ?? resolveLegacyVehicleColor(vehicle?.color) ?? '',
  };
}

export function getVehicleColorPersistence(
  colorId: VehicleColorId | '',
  existingLegacyColor?: string | null,
): Pick<Vehicle, 'colorId' | 'color'> {
  if (!colorId) return { colorId: null, color: existingLegacyColor?.trim() || null };
  return {
    colorId,
    color: getVehicleColorDefinition(colorId)?.label ?? existingLegacyColor?.trim() ?? null,
  };
}

export function getVehicleTaxonomySummary(
  vehicle: Pick<Vehicle, 'bodyType' | 'colorId' | 'color'>,
): string {
  return `${getVehicleBodyTypeLabel(vehicle.bodyType)} · ${getVehicleColorLabel(vehicle.colorId, vehicle.color)}`;
}
