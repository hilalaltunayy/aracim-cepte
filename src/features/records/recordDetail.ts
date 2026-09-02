import type { VehicleRecord } from '@/domain/entities';
import { formatCurrency, formatDate, formatNumber } from '@/shared/utils/format';
import { getFuelStationLabel } from '@/features/fuel/config/fuelStations';
import { getMaintenanceServiceTypeLabel } from '@/features/maintenance/config/maintenanceServiceTypes';
import { getMaintenanceItemLabel } from '@/features/maintenance/config/maintenanceCatalog';
import { getRecordPresentation } from './recordPresentation';

export interface RecordDetailRow {
  label: string;
  value: string;
}

export interface RecordDetailGroup {
  title?: string;
  rows: RecordDetailRow[];
}

export interface RecordDetailView {
  title: string;
  typeLabel: string;
  icon: ReturnType<typeof getRecordPresentation>['icon'];
  groups: RecordDetailGroup[];
  attachmentCount: number;
}

const km = (value: number | null | undefined) =>
  value === null || value === undefined ? null : `${formatNumber(value)} km`;

function nonEmpty(rows: (RecordDetailRow | null)[]): RecordDetailRow[] {
  return rows.filter((row): row is RecordDetailRow => row !== null && row.value.trim().length > 0);
}

export function buildRecordDetailView(record: VehicleRecord): RecordDetailView {
  const presentation = getRecordPresentation(record);
  const groups: RecordDetailGroup[] = [];

  const overview = nonEmpty([
    { label: 'Tarih', value: formatDate(record.recordDate) },
    record.kilometer !== null ? { label: 'Kilometre', value: km(record.kilometer) ?? '' } : null,
    { label: 'Tutar', value: formatCurrency(record.amount) },
  ]);
  groups.push({ rows: overview });

  if (record.recordType === 'fuel') {
    groups.push({
      title: 'Yakıt ayrıntısı',
      rows: nonEmpty([
        record.liters !== null
          ? { label: 'Litre', value: formatNumber(record.liters, 2) }
          : null,
        record.pricePerLiter
          ? { label: 'Litre fiyatı', value: formatCurrency(record.pricePerLiter) }
          : null,
        record.stationBrand
          ? { label: 'İstasyon', value: getFuelStationLabel(record.stationBrand) ?? record.stationBrand }
          : null,
      ]),
    });
  }

  if (record.recordType === 'maintenance') {
    const operations = (record.maintenanceItems ?? [])
      .map((item) => getMaintenanceItemLabel(item.itemType))
      .filter(Boolean);
    groups.push({
      title: 'Bakım ayrıntısı',
      rows: nonEmpty([
        operations.length ? { label: 'İşlemler', value: operations.join(', ') } : null,
        record.serviceType
          ? { label: 'Servis türü', value: getMaintenanceServiceTypeLabel(record.serviceType) ?? '' }
          : null,
        record.serviceName ? { label: 'Servis / usta', value: record.serviceName } : null,
        record.partsCost != null
          ? { label: 'Parça', value: formatCurrency(record.partsCost) }
          : null,
        record.laborCost != null
          ? { label: 'İşçilik', value: formatCurrency(record.laborCost) }
          : null,
        record.invoiceNumber ? { label: 'Fatura no', value: record.invoiceNumber } : null,
      ]),
    });
  }

  if (record.description?.trim()) {
    groups.push({ title: 'Notlar', rows: [{ label: 'Not', value: record.description.trim() }] });
  }

  return {
    title: presentation.title,
    typeLabel: presentation.typeLabel,
    icon: presentation.icon,
    groups: groups.filter((group) => group.rows.length > 0),
    attachmentCount: (record.attachments ?? []).length,
  };
}
