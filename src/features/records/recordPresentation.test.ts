import { describe, expect, it } from 'vitest';
import { getRecordPresentation } from './recordPresentation';

describe('record category presentation', () => {
  it('keeps fuel, maintenance and expense icon/type mapping consistent', () => {
    expect(getRecordPresentation({ recordType: 'fuel', category: 'Yakıt alımı' })).toEqual({
      title: 'Yakıt alımı',
      typeLabel: 'Yakıt',
      icon: 'water-outline',
      summary: null,
    });
    expect(getRecordPresentation({ recordType: 'maintenance', category: 'Diğer' })).toEqual({
      title: 'Diğer bakım',
      typeLabel: 'Bakım',
      icon: 'construct-outline',
      summary: null,
    });
    expect(getRecordPresentation({ recordType: 'expense', category: 'Diğer' })).toEqual({
      title: 'Diğer masraf',
      typeLabel: 'Diğer Masraf',
      icon: 'receipt-outline',
      summary: null,
    });
  });

  it('uses a single operation as title and keeps multi-operation history compact', () => {
    const maintenanceItem = (itemType: string, id: string) => ({
      id,
      maintenanceRecordId: 'record-a',
      vehicleId: 'vehicle-a',
      ownerId: 'owner-a',
      itemType,
      cost: null,
      note: null,
      createdAt: '2026-08-11T00:00:00.000Z',
      updatedAt: '2026-08-11T00:00:00.000Z',
    });
    expect(
      getRecordPresentation({
        recordType: 'maintenance',
        category: 'Bakım işlemleri',
        maintenanceItems: [maintenanceItem('air_filter', 'item-a')],
      }).title,
    ).toBe('Hava filtresi');
    expect(
      getRecordPresentation({
        recordType: 'maintenance',
        category: 'Periyodik bakım',
        maintenanceItems: [
          maintenanceItem('engine_oil', 'item-a'),
          maintenanceItem('oil_filter', 'item-b'),
          maintenanceItem('air_filter', 'item-c'),
        ],
      }).summary,
    ).toBe('Motor yağı + 2 işlem daha');
  });
});
