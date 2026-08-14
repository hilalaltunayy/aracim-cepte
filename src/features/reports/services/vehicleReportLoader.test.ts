/* eslint-disable import/first */
import { describe, expect, it, vi } from 'vitest';
import type { Vehicle, VehicleRecord } from '@/domain/entities';

vi.mock('@/data/repositories/SupabaseAppRepository', () => ({ appRepository: { loadVehicleReportRecords: vi.fn() } }));

import { loadReportsForVehicles } from './vehicleReportLoader';

const vehicle = (id: string) => ({ id, ownerId: 'owner', brand: `Brand ${id}`, model: 'Model' }) as Vehicle;
const record = (vehicleId: string) => ({ id: vehicleId, vehicleId }) as VehicleRecord;

describe('loadReportsForVehicles', () => {
  it('loads each supplied vehicle independently and remains bounded to the entitlement maximum', async () => {
    const load = vi.fn(async (vehicleId: string) => [record(vehicleId)]);
    const result = await loadReportsForVehicles([vehicle('a'), vehicle('b'), vehicle('c'), vehicle('d')], 3, load);
    expect(load).toHaveBeenCalledTimes(3); expect(result.map((item) => item.vehicle.id)).toEqual(['a', 'b', 'c']); expect(result.map((item) => item.records[0].vehicleId)).toEqual(['a', 'b', 'c']);
  });

  it('does not make a report read when entitlement capacity is zero', async () => {
    const load = vi.fn();
    await expect(loadReportsForVehicles([vehicle('a')], 0, load)).resolves.toEqual([]);
    expect(load).not.toHaveBeenCalled();
  });
});
