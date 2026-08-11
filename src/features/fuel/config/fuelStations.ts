import type { FuelStationId } from '@/domain/entities';

export const FUEL_STATIONS: readonly { id: FuelStationId; label: string }[] = [
  { id: 'opet', label: 'Opet' },
  { id: 'shell', label: 'Shell' },
  { id: 'petrol_ofisi', label: 'Petrol Ofisi' },
  { id: 'bp', label: 'BP' },
  { id: 'totalenergies', label: 'TotalEnergies' },
  { id: 'aytemiz', label: 'Aytemiz' },
  { id: 'other', label: 'Diğer' },
] as const;

export type { FuelStationId } from '@/domain/entities';

const stationIds = new Set<string>(FUEL_STATIONS.map((station) => station.id));

export function isFuelStationId(value: unknown): value is FuelStationId {
  return typeof value === 'string' && stationIds.has(value);
}

export function getFuelStationLabel(value: FuelStationId | null | undefined): string | null {
  return FUEL_STATIONS.find((station) => station.id === value)?.label ?? null;
}

const receiptStationMatchers: readonly [FuelStationId, RegExp][] = [
  ['petrol_ofisi', /petrol\s*ofisi|p\.?\s*o\.?(?:\s|$)/i],
  ['totalenergies', /total\s*energies|totalenergies/i],
  ['aytemiz', /aytemiz/i],
  ['shell', /shell/i],
  ['opet', /opet/i],
  ['bp', /(?:^|[^a-z])bp(?:[^a-z]|$)/i],
];

export function detectFuelStationFromReceiptText(value: string): FuelStationId | null {
  const searchable = value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return receiptStationMatchers.find(([, matcher]) => matcher.test(searchable))?.[0] ?? null;
}
