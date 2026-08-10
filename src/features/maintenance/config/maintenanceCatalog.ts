export interface MaintenanceCatalogItem {
  id: string;
  label: string;
}

export interface DefaultMaintenancePackage {
  id: string;
  title: string;
  itemIds: readonly string[];
}

export const maintenanceCatalog = [
  { id: 'engine_oil', label: 'Motor yağı' },
  { id: 'oil_filter', label: 'Yağ filtresi' },
  { id: 'air_filter', label: 'Hava filtresi' },
  { id: 'cabin_filter', label: 'Polen filtresi' },
  { id: 'fuel_filter', label: 'Yakıt filtresi' },
  { id: 'spark_plugs', label: 'Bujiler' },
  { id: 'brake_inspection', label: 'Fren kontrolü' },
  { id: 'coolant_fluid_check', label: 'Soğutma ve sıvı kontrolü' },
] as const satisfies readonly MaintenanceCatalogItem[];

export const defaultMaintenancePackages = [
  {
    id: 'periodic_maintenance',
    title: 'Periyodik bakım',
    itemIds: ['engine_oil', 'oil_filter', 'air_filter', 'cabin_filter'],
  },
] as const satisfies readonly DefaultMaintenancePackage[];

const labels = new Map<string, string>(maintenanceCatalog.map((item) => [item.id, item.label]));

export function getMaintenanceItemLabel(itemId: string): string {
  return labels.get(itemId) ?? itemId;
}
