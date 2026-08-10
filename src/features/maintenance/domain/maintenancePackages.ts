import type { MaintenanceTemplate, VehicleRecord } from '@/domain/entities';
import { getMaintenanceItemLabel } from '@/features/maintenance/config/maintenanceCatalog';

export function clonePackageItemIds(itemIds: readonly string[]): string[] {
  return [...itemIds];
}

export function toggleMaintenanceItem(selected: readonly string[], itemId: string): string[] {
  return selected.includes(itemId)
    ? selected.filter((value) => value !== itemId)
    : [...selected, itemId];
}

export function createMaintenanceTitle(
  selectedItemIds: readonly string[],
  packageTitle?: string | null,
  legacyTitle = 'Bakım',
): string {
  if (selectedItemIds.length === 1) return getMaintenanceItemLabel(selectedItemIds[0]);
  if (packageTitle?.trim()) return packageTitle.trim();
  if (selectedItemIds.length > 1) return 'Bakım işlemleri';
  return legacyTitle.trim() || 'Bakım';
}

export function getMaintenanceSummary(
  record: Pick<VehicleRecord, 'maintenanceItems'>,
): string | null {
  const items = record.maintenanceItems ?? [];
  if (items.length <= 1) return null;
  return `${getMaintenanceItemLabel(items[0].itemType)} + ${items.length - 1} işlem daha`;
}

export function templateSelection(template: Pick<MaintenanceTemplate, 'itemDefinitions'>): string[] {
  return clonePackageItemIds(template.itemDefinitions);
}
