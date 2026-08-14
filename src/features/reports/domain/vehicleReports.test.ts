import { describe, expect, it } from 'vitest';
import { buildVehicleReport, getReportPeriod } from './vehicleReports';
import type { VehicleRecord } from '@/domain/entities';

const record = (overrides: Partial<VehicleRecord>): VehicleRecord => ({ id: Math.random().toString(), vehicleId: 'a', ownerId: 'u', recordType: 'fuel', category: 'Yakıt', amount: 0, recordDate: '2026-08-01', kilometer: null, liters: null, description: null, createdAt: '2026-08-01T12:00:00Z', updatedAt: '2026-08-01T12:00:00Z', ...overrides });
const anchor = new Date('2026-08-20T12:00:00');

describe('buildVehicleReport', () => {
  it('calculates vehicle-scoped costs, fuel, maintenance and period comparison', () => {
    const report = buildVehicleReport([
      record({ amount: 2000, liters: 40, kilometer: 150000 }), record({ id: 'm', recordType: 'maintenance', amount: 1000, partsCost: 650, laborCost: 350, kilometer: 150400 }),
      record({ id: 'old', recordDate: '2026-07-02', amount: 1500 }), record({ id: 'b', vehicleId: 'b', amount: 9999 }),
    ], { id: 'a' }, 'month', anchor);
    expect(report.totalCost).toBe(3000); expect(report.fuelCost).toBe(2000); expect(report.maintenanceCost).toBe(1000);
    expect(report.fuelLiters).toBe(40); expect(report.distanceKm).toBe(400); expect(report.costPerKm).toBe(7.5); expect(report.consumption).toBe(10);
    expect(report.partsCost).toBe(650); expect(report.laborCost).toBe(350); expect(report.comparisons.total.percentage).toBe(100);
  });
  it('keeps unknown values unknown and rejects inconsistent historical mileage for derived distance', () => {
    const report = buildVehicleReport([record({ kilometer: 150000 }), record({ id: 'lower', recordDate: '2026-08-10', kilometer: 148000 })], { id: 'a' }, 'month', anchor);
    expect(report.distanceKm).toBeNull(); expect(report.costPerKm).toBeNull(); expect(report.consumption).toBeNull();
  });
  it('creates UTC-free calendar periods and safely avoids zero-base comparison', () => {
    expect(getReportPeriod('six_months', anchor).start).toBe('2026-03-01');
    expect(buildVehicleReport([record({ amount: 100 })], { id: 'a' }, 'month', anchor).comparisons.total.percentage).toBeNull();
  });
});
