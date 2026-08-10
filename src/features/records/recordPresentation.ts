import type { VehicleRecord } from '@/domain/entities';
import { recordTypeLabels } from '@/shared/constants/labels';
import {
  createMaintenanceTitle,
  getMaintenanceSummary,
} from '@/features/maintenance/domain/maintenancePackages';

const recordIcons = {
  fuel: 'water-outline',
  maintenance: 'construct-outline',
  expense: 'receipt-outline',
} as const;

export function getRecordPresentation(
  record: Pick<VehicleRecord, 'recordType' | 'category' | 'maintenanceItems'>,
) {
  const category = record.category.trim() || recordTypeLabels[record.recordType];
  const maintenanceItemIds = (record.maintenanceItems ?? []).map((item) => item.itemType);
  return {
    title:
      record.recordType === 'maintenance' && maintenanceItemIds.length === 1
        ? createMaintenanceTitle(maintenanceItemIds)
        : category === 'Diğer'
        ? record.recordType === 'maintenance'
          ? 'Diğer bakım'
          : record.recordType === 'expense'
            ? 'Diğer masraf'
            : category
        : category,
    typeLabel: recordTypeLabels[record.recordType],
    icon: recordIcons[record.recordType],
    summary: record.recordType === 'maintenance' ? getMaintenanceSummary(record) : null,
  };
}
