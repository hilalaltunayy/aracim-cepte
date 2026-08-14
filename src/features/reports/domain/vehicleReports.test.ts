import { describe, expect, it } from 'vitest';
import { buildVehicleComparisons, buildVehicleReport, getReportPeriod } from './vehicleReports';
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
  it('aggregates monthly, selected-period and year fuel totals without leaking another vehicle', () => {
    const records = [record({ amount: 100, liters: 2 }), record({ id: 'july', recordDate: '2026-07-15', amount: 200, liters: 4 }), record({ id: 'january', recordDate: '2026-01-15', amount: 300, liters: 6 }), record({ id: 'other', vehicleId: 'b', amount: 999 })];
    expect(buildVehicleReport(records, { id: 'a' }, 'month', anchor).fuelCost).toBe(100);
    expect(buildVehicleReport(records, { id: 'a' }, 'three_months', anchor).fuelCost).toBe(300);
    expect(buildVehicleReport(records, { id: 'a' }, 'year', anchor).fuelCost).toBe(600);
  });
  it('calculates litres, weighted price, frequency and fuel cost per kilometre only with valid inputs', () => {
    const report = buildVehicleReport([record({ amount: 500, liters: 10, kilometer: 100 }), record({ id: 'second', amount: 1000, liters: 20, kilometer: 200 })], { id: 'a' }, 'month', anchor);
    expect(report.fuelLiters).toBe(30); expect(report.averageFuelPrice).toBe(50); expect(report.refuelFrequency).toBe(2); expect(report.fuelCostPerKm).toBe(15);
  });
  it('keeps litres and consumption unknown when legacy fuel records have no usable litres', () => {
    const report = buildVehicleReport([record({ amount: 500, liters: null, kilometer: 100 }), record({ id: 'second', amount: 500, liters: 0, kilometer: 200 })], { id: 'a' }, 'month', anchor);
    expect(report.fuelLiters).toBeNull(); expect(report.averageFuelPrice).toBeNull(); expect(report.consumption).toBeNull();
  });
  it('does not derive consumption without valid distance coverage', () => {
    const report = buildVehicleReport([record({ amount: 500, liters: 10, kilometer: null })], { id: 'a' }, 'month', anchor);
    expect(report.distanceKm).toBeNull(); expect(report.consumption).toBeNull(); expect(report.costPerKm).toBeNull();
  });
  it('derives maintenance totals, average, highest event, and parts/labor independently', () => {
    const report = buildVehicleReport([record({ id: 'm1', recordType: 'maintenance', category: 'Bakım', amount: 1000, partsCost: 600, laborCost: 400 }), record({ id: 'm2', recordType: 'maintenance', category: 'Bakım', amount: 2500, partsCost: 1800, laborCost: 500 })], { id: 'a' }, 'month', anchor);
    expect(report.maintenanceCost).toBe(3500); expect(report.maintenanceCount).toBe(2); expect(report.partsCost).toBe(2400); expect(report.laborCost).toBe(900); expect(report.averageMaintenanceCost).toBe(1750); expect(report.highestMaintenance?.id).toBe('m2');
  });
  it('groups maintenance operations and station spending conservatively', () => {
    const item = { id: 'i', maintenanceRecordId: 'm', vehicleId: 'a', ownerId: 'u', itemType: 'engine_oil', cost: null, note: null, createdAt: 'x', updatedAt: 'x' };
    const report = buildVehicleReport([record({ amount: 900, stationBrand: 'opet' }), record({ id: 'shell', amount: 500, stationBrand: 'shell' }), record({ id: 'm', recordType: 'maintenance', category: 'Bakım', amount: 700, maintenanceItems: [item] })], { id: 'a' }, 'month', anchor);
    expect(report.stationDistribution).toEqual([{ id: 'opet', total: 900 }, { id: 'shell', total: 500 }]); expect(report.maintenanceBreakdown).toEqual([{ id: 'engine_oil', total: 700 }]);
  });
  it('builds fuel and maintenance period buckets from their own records', () => {
    const report = buildVehicleReport([record({ amount: 100 }), record({ id: 'm', recordType: 'maintenance', amount: 200, recordDate: '2026-07-11' })], { id: 'a' }, 'three_months', anchor);
    expect(report.fuelBuckets.map((bucket) => bucket.fuel)).toEqual([0, 0, 100]); expect(report.maintenanceBuckets.map((bucket) => bucket.maintenance)).toEqual([0, 200, 0]);
  });
  it('uses valid equivalent previous periods and keeps absent or zero bases honest', () => {
    const records = [record({ amount: 200 }), record({ id: 'previous', recordDate: '2026-07-03', amount: 100 })];
    expect(buildVehicleReport(records, { id: 'a' }, 'month', anchor).comparisons.total.percentage).toBe(100);
    expect(buildVehicleReport([record({ amount: 100 })], { id: 'a' }, 'three_months', anchor).comparisons.total.percentage).toBeNull();
    expect(getReportPeriod('year', anchor).previousStart).toBe('2025-01-01');
  });
  it('uses high-water-safe record ordering for distance and never treats a historical lower event as travelled distance', () => {
    const valid = buildVehicleReport([record({ kilometer: 100 }), record({ id: 'later', recordDate: '2026-08-10', kilometer: 150 })], { id: 'a' }, 'month', anchor);
    const historical = buildVehicleReport([record({ kilometer: 150 }), record({ id: 'history', recordDate: '2026-08-10', kilometer: 120 })], { id: 'a' }, 'month', anchor);
    expect(valid.distanceKm).toBe(50); expect(historical.distanceKm).toBeNull();
  });
  it('keeps null legacy amounts out of cost totals instead of manufacturing a zero-valued metric', () => {
    const legacy = record({ amount: Number.NaN, liters: null });
    const report = buildVehicleReport([legacy], { id: 'a' }, 'month', anchor);
    expect(report.totalCost).toBe(0); expect(report.hasTrend).toBe(false); expect(report.fuelLiters).toBeNull();
  });
  it('builds an isolated two-vehicle comparison with every reported comparison metric', () => {
    const comparisons = buildVehicleComparisons([{ vehicle: { id: 'a', brand: 'Kia', model: 'Sportage' }, records: [record({ amount: 100, kilometer: 100 }), record({ id: 'a2', amount: 100, kilometer: 200 })] }, { vehicle: { id: 'b', brand: 'Ford', model: 'Puma' }, records: [record({ id: 'b1', vehicleId: 'b', amount: 300, kilometer: 10 }), record({ id: 'b2', vehicleId: 'b', amount: 200, kilometer: 110, recordType: 'maintenance' })] }], 'month', anchor);
    expect(comparisons).toHaveLength(2); expect(comparisons[0]).toMatchObject({ vehicleId: 'a', totalCost: 200, fuelCost: 200, maintenanceCost: 0, distanceKm: 100, costPerKm: 2 }); expect(comparisons[1]).toMatchObject({ vehicleId: 'b', totalCost: 500, fuelCost: 300, maintenanceCost: 200, distanceKm: 100, costPerKm: 5 });
  });
  it('bounds comparison to three vehicles and represents missing per-vehicle distance truthfully', () => {
    const data = ['a', 'b', 'c', 'd'].map((id) => ({ vehicle: { id, brand: id, model: 'model' }, records: [record({ id, vehicleId: id, amount: 100 })] }));
    const comparisons = buildVehicleComparisons(data, 'month', anchor);
    expect(comparisons).toHaveLength(3); expect(comparisons.every((item) => item.distanceKm === null && item.costPerKm === null)).toBe(true);
  });
});
