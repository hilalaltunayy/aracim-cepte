import type { VehicleColorId } from '@/domain/entities';

export interface VehicleColorDefinition {
  id: VehicleColorId;
  label: string;
  hexFallback: `#${string}`;
}

export const VEHICLE_COLORS = [
  { id: 'white', label: 'Beyaz', hexFallback: '#F7F7F2' },
  { id: 'black', label: 'Siyah', hexFallback: '#171A1D' },
  { id: 'gray', label: 'Gri', hexFallback: '#70777F' },
  { id: 'silver', label: 'Gümüş', hexFallback: '#BCC2C7' },
  { id: 'red', label: 'Kırmızı', hexFallback: '#C93B3B' },
  { id: 'blue', label: 'Mavi', hexFallback: '#3277B5' },
  { id: 'green', label: 'Yeşil', hexFallback: '#3D7D5A' },
  { id: 'brown', label: 'Kahverengi', hexFallback: '#795548' },
  { id: 'beige', label: 'Bej', hexFallback: '#D8C7A2' },
  { id: 'gold', label: 'Altın', hexFallback: '#C9A441' },
  { id: 'yellow', label: 'Sarı', hexFallback: '#E5C229' },
  { id: 'orange', label: 'Turuncu', hexFallback: '#E77B2E' },
] as const satisfies readonly VehicleColorDefinition[];

const byId = new Map<VehicleColorId, VehicleColorDefinition>(
  VEHICLE_COLORS.map((definition) => [definition.id, definition]),
);

const legacyAliases: Readonly<Record<string, VehicleColorId>> = {
  beyaz: 'white',
  white: 'white',
  siyah: 'black',
  black: 'black',
  gri: 'gray',
  gray: 'gray',
  grey: 'gray',
  gumus: 'silver',
  silver: 'silver',
  kirmizi: 'red',
  red: 'red',
  mavi: 'blue',
  blue: 'blue',
  yesil: 'green',
  green: 'green',
  kahverengi: 'brown',
  brown: 'brown',
  bej: 'beige',
  beige: 'beige',
  altin: 'gold',
  gold: 'gold',
  sari: 'yellow',
  yellow: 'yellow',
  turuncu: 'orange',
  orange: 'orange',
};

function normalizeLegacyKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
}

export function isVehicleColorId(value: string): value is VehicleColorId {
  return byId.has(value as VehicleColorId);
}

export function resolveLegacyVehicleColor(value: string | null | undefined): VehicleColorId | null {
  if (!value) return null;
  if (isVehicleColorId(value)) return value;
  return legacyAliases[normalizeLegacyKey(value)] ?? null;
}

export function getVehicleColorDefinition(
  colorId: VehicleColorId | null | undefined,
): VehicleColorDefinition | null {
  return colorId ? (byId.get(colorId) ?? null) : null;
}

export function getVehicleColorLabel(
  colorId: VehicleColorId | null | undefined,
  legacyColor?: string | null,
): string {
  const resolved = getVehicleColorDefinition(colorId ?? resolveLegacyVehicleColor(legacyColor));
  return resolved?.label ?? legacyColor?.trim() ?? 'Renk belirtilmedi';
}

export function getVehicleRenderColor(colorId: VehicleColorId | null | undefined): string {
  return getVehicleColorDefinition(colorId)?.hexFallback ?? '#8A949C';
}
