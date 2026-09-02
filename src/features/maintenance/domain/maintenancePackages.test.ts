import { describe, expect, it } from 'vitest';
import type { MaintenanceTemplate, VehicleRecord } from '@/domain/entities';
import {
  defaultMaintenancePackages,
  getMaintenanceItemLabel,
} from '@/features/maintenance/config/maintenanceCatalog';
import {
  clonePackageItemIds,
  addCustomMaintenanceItem,
  createMaintenanceTitle,
  getMaintenanceSummary,
  templateSelection,
  toggleMaintenanceItem,
} from './maintenancePackages';

const template: MaintenanceTemplate = {
  id: 'template-a',
  ownerId: 'owner-a',
  title: '10.000 km bakımım',
  itemDefinitions: ['engine_oil', 'oil_filter', 'air_filter'],
  createdAt: '2026-08-11T00:00:00.000Z',
  updatedAt: '2026-08-11T00:00:00.000Z',
};

const item = (itemType: string, index: number) => ({
  id: `item-${index}`,
  maintenanceRecordId: 'record-a',
  vehicleId: 'vehicle-a',
  ownerId: 'owner-a',
  itemType,
  cost: null,
  note: null,
  createdAt: '2026-08-11T00:00:00.000Z',
  updatedAt: '2026-08-11T00:00:00.000Z',
});

describe('maintenance package domain', () => {
  it('defines the periodic package once and preselects the approved operations', () => {
    expect(defaultMaintenancePackages[0]).toEqual({
      id: 'periodic_maintenance',
      title: 'Periyodik bakım',
      itemIds: ['engine_oil', 'oil_filter', 'air_filter', 'cabin_filter'],
    });
  });

  it('clones default and user package item arrays before form editing', () => {
    const defaultSelection = clonePackageItemIds(defaultMaintenancePackages[0].itemIds);
    const userSelection = templateSelection(template);
    defaultSelection.pop();
    userSelection.push('spark_plugs');
    expect(defaultMaintenancePackages[0].itemIds).toHaveLength(4);
    expect(template.itemDefinitions).toEqual(['engine_oil', 'oil_filter', 'air_filter']);
  });

  it('supports manual single and multi-item selection without mutating prior state', () => {
    const first = toggleMaintenanceItem([], 'air_filter');
    const second = toggleMaintenanceItem(first, 'oil_filter');
    expect(first).toEqual(['air_filter']);
    expect(second).toEqual(['air_filter', 'oil_filter']);
    expect(createMaintenanceTitle(first)).toBe('Hava filtresi');
    expect(createMaintenanceTitle(second)).toBe('Bakım işlemleri');
  });

  it('keeps legacy records readable and summarizes multi-item records compactly', () => {
    const legacy = { maintenanceItems: undefined } satisfies Pick<
      VehicleRecord,
      'maintenanceItems'
    >;
    expect(getMaintenanceSummary(legacy)).toBeNull();
    expect(createMaintenanceTitle([], null, 'Yağ değişimi')).toBe('Yağ değişimi');
    expect(
      getMaintenanceSummary({
        maintenanceItems: [item('engine_oil', 1), item('oil_filter', 2), item('air_filter', 3)],
      }),
    ).toBe('Motor yağı + 2 işlem daha');
    expect(getMaintenanceItemLabel('future_item')).toBe('future_item');
  });

  it('adds trimmed custom operations once and keeps them selectable', () => {
    const added = addCustomMaintenanceItem(['engine_oil'], '  Klima   gazı kontrolü ');
    expect(added).toEqual(['engine_oil', 'custom:Klima gazı kontrolü']);
    expect(addCustomMaintenanceItem(added, 'klima gazı kontrolü')).toEqual(added);
    expect(getMaintenanceItemLabel(added[1])).toBe('Klima gazı kontrolü');
    expect(toggleMaintenanceItem(added, added[1])).toEqual(['engine_oil']);
  });
});
