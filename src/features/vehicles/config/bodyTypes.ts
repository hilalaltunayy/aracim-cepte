import type { BodySchemaType, BodyType, NormalizedBodyType } from '@/domain/entities';

export interface VehicleBodyTypeDefinition {
  id: NormalizedBodyType;
  label: string;
  bodySchemaType: BodySchemaType;
}

export const VEHICLE_BODY_TYPES = [
  { id: 'sedan', label: 'Sedan', bodySchemaType: 'sedan_hatchback' },
  { id: 'hatchback', label: 'Hatchback', bodySchemaType: 'sedan_hatchback' },
  { id: 'crossover', label: 'Crossover', bodySchemaType: 'suv_crossover' },
  { id: 'suv', label: 'SUV', bodySchemaType: 'suv_crossover' },
  { id: 'station_wagon', label: 'Station Wagon', bodySchemaType: 'sedan_hatchback' },
  { id: 'coupe', label: 'Coupe', bodySchemaType: 'sedan_hatchback' },
  { id: 'cabrio', label: 'Cabrio', bodySchemaType: 'sedan_hatchback' },
  { id: 'roadster', label: 'Roadster', bodySchemaType: 'sedan_hatchback' },
  { id: 'pickup', label: 'Pickup', bodySchemaType: 'pickup_light_commercial' },
  { id: 'mpv_minivan', label: 'MPV / Minivan', bodySchemaType: 'pickup_light_commercial' },
  { id: 'van', label: 'Van', bodySchemaType: 'pickup_light_commercial' },
  { id: 'sports_car', label: 'Sports Car', bodySchemaType: 'sedan_hatchback' },
  { id: 'campervan', label: 'Campervan', bodySchemaType: 'pickup_light_commercial' },
  { id: 'minibus', label: 'Minibus', bodySchemaType: 'pickup_light_commercial' },
] as const satisfies readonly VehicleBodyTypeDefinition[];

const byId = new Map<NormalizedBodyType, VehicleBodyTypeDefinition>(
  VEHICLE_BODY_TYPES.map((definition) => [definition.id, definition]),
);

const legacyLabels: Record<BodySchemaType, string> = {
  sedan_hatchback: 'Sedan / Hatchback (eski sınıflandırma)',
  suv_crossover: 'SUV / Crossover (eski sınıflandırma)',
  pickup_light_commercial: 'Pickup / Hafif Ticari (eski sınıflandırma)',
};

export function isNormalizedBodyType(value: string): value is NormalizedBodyType {
  return byId.has(value as NormalizedBodyType);
}

export function getVehicleBodyTypeLabel(bodyType: BodyType | null | undefined): string {
  if (!bodyType) return 'Gövde tipi belirtilmedi';
  if (isNormalizedBodyType(bodyType)) return byId.get(bodyType)?.label ?? 'Gövde tipi belirtilmedi';
  return legacyLabels[bodyType] ?? 'Gövde tipi belirtilmedi';
}

export function getBodySchemaType(bodyType: BodyType): BodySchemaType {
  if (!isNormalizedBodyType(bodyType)) return bodyType;
  return byId.get(bodyType)?.bodySchemaType ?? 'sedan_hatchback';
}

export function getVehicleBodyTypeOptions(current?: BodyType | null) {
  const options: { value: BodyType; label: string }[] = VEHICLE_BODY_TYPES.map(({ id, label }) => ({
    value: id,
    label,
  }));
  if (current && !isNormalizedBodyType(current)) {
    options.unshift({ value: current, label: getVehicleBodyTypeLabel(current) });
  }
  return options;
}
