export const MAINTENANCE_SERVICE_TYPES = [
  { id: 'authorized_service', label: 'Yetkili Servis' },
  { id: 'independent_service', label: 'Özel Servis / Usta' },
  { id: 'self_service', label: 'Kendim Yaptım' },
  { id: 'other', label: 'Diğer' },
] as const;

export type MaintenanceServiceType = (typeof MAINTENANCE_SERVICE_TYPES)[number]['id'];

export const maintenanceServiceTypeOptions = [
  { value: '', label: 'Servis türü seçilmedi' },
  ...MAINTENANCE_SERVICE_TYPES.map(({ id, label }) => ({ value: id, label })),
] as const;

const serviceTypeLabels = new Map<string, string>(
  MAINTENANCE_SERVICE_TYPES.map(({ id, label }) => [id, label]),
);

export function isMaintenanceServiceType(value: string): value is MaintenanceServiceType {
  return serviceTypeLabels.has(value);
}

export function normalizeMaintenanceServiceType(
  value: string | null | undefined,
): MaintenanceServiceType | null {
  return value && isMaintenanceServiceType(value) ? value : null;
}

export function getMaintenanceServiceTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return serviceTypeLabels.get(value) ?? null;
}
