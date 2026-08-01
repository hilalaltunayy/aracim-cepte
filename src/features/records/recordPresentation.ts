import type { VehicleRecord } from '@/domain/entities';
import { recordTypeLabels } from '@/shared/constants/labels';

const recordIcons = {
  fuel: 'water-outline',
  maintenance: 'construct-outline',
  expense: 'receipt-outline',
} as const;

export function getRecordPresentation(record: Pick<VehicleRecord, 'recordType' | 'category'>) {
  const category = record.category.trim() || recordTypeLabels[record.recordType];
  return {
    title:
      category === 'Diğer'
        ? record.recordType === 'maintenance'
          ? 'Diğer bakım'
          : record.recordType === 'expense'
            ? 'Diğer masraf'
            : category
        : category,
    typeLabel: recordTypeLabels[record.recordType],
    icon: recordIcons[record.recordType],
  };
}
