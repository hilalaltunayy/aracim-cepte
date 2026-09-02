import { describe, expect, it } from 'vitest';
import type { VehicleRecord } from '@/domain/entities';
import { buildRecordDetailView } from './recordDetail';

const base: VehicleRecord = {
  id: 'r1',
  vehicleId: 'v1',
  ownerId: 'o1',
  recordType: 'fuel',
  category: 'Yakıt alımı',
  amount: 900,
  recordDate: '2026-08-15',
  kilometer: 45000,
  liters: 20,
  pricePerLiter: 45,
  stationBrand: 'shell',
  description: 'Otoyol öncesi depo',
  createdAt: '2026-08-15T10:00:00Z',
  updatedAt: '2026-08-15T10:00:00Z',
};

function flatten(record: VehicleRecord) {
  return buildRecordDetailView(record).groups.flatMap((group) =>
    group.rows.map((row) => `${row.label}=${row.value}`),
  );
}

describe('buildRecordDetailView', () => {
  it('presents fuel records as read-only labelled rows', () => {
    const rows = flatten(base);
    expect(rows).toContain('Tarih=15 Ağustos 2026');
    expect(rows).toContain('Kilometre=45.000 km');
    expect(rows.some((row) => row.startsWith('Litre='))).toBe(true);
    expect(rows.some((row) => row.startsWith('İstasyon='))).toBe(true);
    expect(rows).toContain('Not=Otoyol öncesi depo');
  });

  it('omits unknown fuel values instead of inventing zeros', () => {
    const rows = flatten({
      ...base,
      liters: null,
      pricePerLiter: null,
      stationBrand: null,
      description: null,
    });
    expect(rows.some((row) => row.startsWith('Litre='))).toBe(false);
    expect(rows.some((row) => row.startsWith('İstasyon='))).toBe(false);
    expect(rows.some((row) => row.startsWith('Not='))).toBe(false);
  });

  it('presents maintenance operations, service and cost split', () => {
    const view = buildRecordDetailView({
      ...base,
      recordType: 'maintenance',
      category: 'Periyodik bakım',
      serviceType: 'authorized_service',
      serviceName: 'Usta Ali',
      partsCost: 600,
      laborCost: 300,
      invoiceNumber: 'A-123',
      maintenanceItems: [
        {
          id: 'm1',
          maintenanceRecordId: 'r1',
          vehicleId: 'v1',
          ownerId: 'o1',
          itemType: 'engine_oil',
          cost: 600,
          note: null,
          createdAt: '2026-08-15T10:00:00Z',
          updatedAt: '2026-08-15T10:00:00Z',
        },
      ],
    });
    const rows = view.groups.flatMap((group) => group.rows.map((row) => row.label));
    expect(rows).toContain('İşlemler');
    expect(rows).toContain('Servis / usta');
    expect(rows).toContain('Parça');
    expect(rows).toContain('İşçilik');
    expect(rows).toContain('Fatura no');
  });
});
