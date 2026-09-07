import { describe, expect, it } from 'vitest';
import {
  buildVehicleComparisons,
  buildVehicleReport,
  DEFAULT_REPORT_PERIOD_ID,
  isReportPeriodId,
  resolvePeriod,
} from './vehicleReports';
import type { VehicleRecord } from '@/domain/entities';

const record = (overrides: Partial<VehicleRecord>): VehicleRecord => ({
  id: Math.random().toString(),
  vehicleId: 'a',
  ownerId: 'u',
  recordType: 'fuel',
  category: 'Yakıt',
  amount: 0,
  recordDate: '2026-08-15',
  kilometer: null,
  liters: null,
  description: null,
  createdAt: '2026-08-15T12:00:00Z',
  updatedAt: '2026-08-15T12:00:00Z',
  ...overrides,
});

// "Today" for every test. "Last month" therefore means 1–31 August 2026.
const NOW = new Date('2026-09-07T10:00:00');

describe('resolvePeriod — one authoritative date range', () => {
  it('"Geçen ay" is exactly the previous complete calendar month', () => {
    const period = resolvePeriod('last_month', NOW);
    expect(period.startInclusive).toBe('2026-08-01');
    expect(period.endExclusive).toBe('2026-09-01');
    expect(period.previousStartInclusive).toBe('2026-07-01');
    expect(period.previousEndExclusive).toBe('2026-08-01');
    expect(period.granularity).toBe('week');
  });

  it('"Son 6 ay" starts five months back and runs through today (not month end)', () => {
    const period = resolvePeriod('six_months', NOW);
    expect(period.startInclusive).toBe('2026-04-01');
    // Capped at the day after "today" so future-dated records cannot leak.
    expect(period.endExclusive).toBe('2026-09-08');
    expect(period.previousStartInclusive).toBe('2025-10-01');
    expect(period.previousEndExclusive).toBe('2026-04-01');
    expect(period.buckets).toHaveLength(6);
    expect(period.buckets.map((bucket) => bucket.key)).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
  });

  it('"Son 3 ay" is this month plus the two before it', () => {
    const period = resolvePeriod('three_months', NOW);
    expect(period.startInclusive).toBe('2026-07-01');
    expect(period.endExclusive).toBe('2026-09-08');
    expect(period.buckets).toHaveLength(3);
  });

  it('marks the current month bucket as the incomplete interval', () => {
    const period = resolvePeriod('six_months', NOW);
    const september = period.buckets.find((bucket) => bucket.key === '2026-09');
    const august = period.buckets.find((bucket) => bucket.key === '2026-08');
    expect(september?.isPartial).toBe(true);
    expect(august?.isPartial).toBe(false);
  });

  it('breaks a single month into weekly buckets', () => {
    const weeks = resolvePeriod('last_month', NOW).buckets;
    expect(weeks.map((bucket) => bucket.label)).toEqual(['1–7', '8–14', '15–21', '22–28', '29–31']);
    expect(weeks[0].startInclusive).toBe('2026-08-01');
    expect(weeks[0].endExclusive).toBe('2026-08-08');
    expect(weeks.at(-1)?.endExclusive).toBe('2026-09-01');
    expect(weeks.every((bucket) => bucket.isPartial === false)).toBe(true);
  });

  it('validates the persisted period id and names a stable default', () => {
    expect(isReportPeriodId('last_month')).toBe(true);
    expect(isReportPeriodId('last_30_days')).toBe(false);
    expect(isReportPeriodId(undefined)).toBe(false);
    expect(DEFAULT_REPORT_PERIOD_ID).toBe('six_months');
  });
});

describe('buildVehicleReport — period boundaries', () => {
  const vehicle = { id: 'a' };

  it('includes a record on the first day of "Geçen ay"', () => {
    const report = buildVehicleReport(
      [record({ recordDate: '2026-08-01', recordType: 'expense', amount: 500 })],
      vehicle,
      'last_month',
      NOW,
    );
    expect(report.otherCost).toBe(500);
    expect(report.totalCost).toBe(500);
  });

  it('includes a record on the final day of "Geçen ay"', () => {
    const report = buildVehicleReport(
      [record({ recordDate: '2026-08-31', recordType: 'maintenance', amount: 900 })],
      vehicle,
      'last_month',
      NOW,
    );
    expect(report.maintenanceCost).toBe(900);
  });

  it('excludes records immediately before and after the period', () => {
    const report = buildVehicleReport(
      [
        record({ recordDate: '2026-07-31', amount: 100 }),
        record({ recordDate: '2026-09-01', amount: 200 }),
      ],
      vehicle,
      'last_month',
      NOW,
    );
    expect(report.totalCost).toBe(0);
  });

  it('never counts a future-dated record in the current period', () => {
    const report = buildVehicleReport(
      [
        record({ recordDate: '2026-09-07', amount: 300 }),
        record({ recordDate: '2026-09-20', amount: 999 }),
      ],
      vehicle,
      'six_months',
      NOW,
    );
    expect(report.totalCost).toBe(300);
  });

  it('sums every category in the same period and keeps Total = Fuel + Maintenance + Other', () => {
    const report = buildVehicleReport(
      [
        record({ recordDate: '2026-08-03', recordType: 'fuel', amount: 2000 }),
        record({ recordDate: '2026-08-12', recordType: 'maintenance', amount: 1500 }),
        record({ recordDate: '2026-08-25', recordType: 'expense', amount: 700 }),
      ],
      vehicle,
      'last_month',
      NOW,
    );
    expect(report.fuelCost).toBe(2000);
    expect(report.maintenanceCost).toBe(1500);
    expect(report.otherCost).toBe(700);
    expect(report.totalCost).toBe(4200);
    expect(report.fuelCost + report.maintenanceCost + report.otherCost).toBe(report.totalCost);
  });

  it('spreads records across six monthly buckets that align with the totals', () => {
    const records = [
      record({ recordDate: '2026-04-10', amount: 100 }),
      record({ recordDate: '2026-06-10', amount: 200 }),
      record({ recordDate: '2026-09-05', amount: 300 }),
    ];
    const report = buildVehicleReport(records, vehicle, 'six_months', NOW);
    expect(report.totalCost).toBe(600);
    expect(report.buckets.map((bucket) => bucket.total)).toEqual([100, 0, 200, 0, 0, 300]);
    expect(report.buckets.reduce((sum, bucket) => sum + bucket.total, 0)).toBe(report.totalCost);
    expect(report.hasTrend).toBe(true);
  });

  it('reports a vehicle with no records in the selected period as a true zero', () => {
    const report = buildVehicleReport(
      [record({ recordDate: '2026-01-05', amount: 5000 })],
      vehicle,
      'last_month',
      NOW,
    );
    expect(report.totalCost).toBe(0);
    expect(report.fuelLiters).toBeNull();
    expect(report.distanceKm).toBeNull();
    expect(report.hasTrend).toBe(false);
  });

  it('never lets another vehicle contaminate the active report for overlapping dates', () => {
    const records = [
      record({ id: 'a1', vehicleId: 'a', recordDate: '2026-08-10', amount: 400 }),
      record({ id: 'b1', vehicleId: 'b', recordDate: '2026-08-10', amount: 9999 }),
    ];
    expect(buildVehicleReport(records, { id: 'a' }, 'last_month', NOW).totalCost).toBe(400);
    expect(buildVehicleReport(records, { id: 'b' }, 'last_month', NOW).totalCost).toBe(9999);
  });

  it('shows a single-month trend from weekly buckets instead of a dead "need two months" state', () => {
    const report = buildVehicleReport(
      [
        record({ recordDate: '2026-08-02', amount: 300 }),
        record({ recordDate: '2026-08-19', amount: 500 }),
      ],
      vehicle,
      'last_month',
      NOW,
    );
    expect(report.trendGranularity).toBe('week');
    expect(report.buckets).toHaveLength(5);
    expect(report.buckets.map((bucket) => bucket.total)).toEqual([300, 0, 500, 0, 0]);
    expect(report.hasTrend).toBe(true);
  });
});

describe('buildVehicleReport — derived distance and fuel metrics', () => {
  const vehicle = { id: 'a' };

  it('derives distance from odometer readings inside the period', () => {
    const report = buildVehicleReport(
      [
        record({ recordDate: '2026-08-05', kilometer: 10_000, liters: 40, amount: 2000 }),
        record({ recordDate: '2026-08-25', kilometer: 10_500, liters: 30, amount: 1500 }),
      ],
      vehicle,
      'last_month',
      NOW,
    );
    expect(report.distanceKm).toBe(500);
    expect(report.distanceUsesPriorBaseline).toBe(false);
    expect(report.costPerKm).toBe(7);
    expect(report.consumption).toBeCloseTo(14);
  });

  it('uses an odometer reading recorded before the period as the starting point', () => {
    const report = buildVehicleReport(
      [
        record({ recordDate: '2026-07-20', kilometer: 9_000, amount: 1000 }),
        record({ recordDate: '2026-08-28', kilometer: 9_800, liters: 50, amount: 2500 }),
      ],
      vehicle,
      'last_month',
      NOW,
    );
    expect(report.distanceKm).toBe(800);
    expect(report.distanceUsesPriorBaseline).toBe(true);
    // The July record's amount must never enter the August totals.
    expect(report.totalCost).toBe(2500);
  });

  it('returns unavailable — not zero — when there is only one usable odometer reading', () => {
    const report = buildVehicleReport(
      [record({ recordDate: '2026-08-10', kilometer: 12_000, liters: 40, amount: 2000 })],
      vehicle,
      'last_month',
      NOW,
    );
    expect(report.distanceKm).toBeNull();
    expect(report.costPerKm).toBeNull();
    expect(report.consumption).toBeNull();
  });

  it('rejects a decreasing odometer as travelled distance', () => {
    const report = buildVehicleReport(
      [
        record({ recordDate: '2026-08-05', kilometer: 15_000 }),
        record({ recordDate: '2026-08-20', kilometer: 14_000 }),
      ],
      vehicle,
      'last_month',
      NOW,
    );
    expect(report.distanceKm).toBeNull();
  });

  it('keeps litres, price and consumption unknown when legacy fuel rows have no litres', () => {
    const report = buildVehicleReport(
      [
        record({ recordDate: '2026-08-05', liters: null, kilometer: 100, amount: 500 }),
        record({ recordDate: '2026-08-15', liters: 0, kilometer: 200, amount: 500 }),
      ],
      vehicle,
      'last_month',
      NOW,
    );
    expect(report.fuelLiters).toBeNull();
    expect(report.averageFuelPrice).toBeNull();
    expect(report.consumption).toBeNull();
  });

  it('computes weighted litre price and refuel frequency from valid rows only', () => {
    const report = buildVehicleReport(
      [
        record({ recordDate: '2026-08-05', amount: 500, liters: 10, kilometer: 100 }),
        record({ recordDate: '2026-08-18', amount: 1500, liters: 20, kilometer: 300 }),
      ],
      vehicle,
      'last_month',
      NOW,
    );
    expect(report.fuelLiters).toBe(30);
    expect(report.averageFuelPrice).toBeCloseTo(2000 / 30);
    expect(report.refuelFrequency).toBe(2);
  });
});

describe('buildVehicleReport — comparison and honesty', () => {
  const vehicle = { id: 'a' };

  it('compares against the equivalent immediately preceding window', () => {
    const report = buildVehicleReport(
      [
        record({ recordDate: '2026-08-10', amount: 200 }),
        record({ recordDate: '2026-07-10', amount: 100 }),
      ],
      vehicle,
      'last_month',
      NOW,
    );
    expect(report.comparisons.total.percentage).toBe(100);
  });

  it('keeps a zero-base comparison null rather than dividing by zero', () => {
    const report = buildVehicleReport(
      [record({ recordDate: '2026-08-10', amount: 200 })],
      vehicle,
      'last_month',
      NOW,
    );
    expect(report.comparisons.total.percentage).toBeNull();
  });

  it('does not manufacture a zero metric from a NaN legacy amount', () => {
    const report = buildVehicleReport(
      [record({ recordDate: '2026-08-10', amount: Number.NaN, liters: null })],
      vehicle,
      'last_month',
      NOW,
    );
    expect(report.totalCost).toBe(0);
    expect(report.fuelLiters).toBeNull();
    expect(report.hasTrend).toBe(false);
  });
});

describe('buildVehicleComparisons', () => {
  it('builds an isolated multi-vehicle comparison bounded to three vehicles', () => {
    const data = ['a', 'b', 'c', 'd'].map((id) => ({
      vehicle: { id, brand: id, model: 'model' },
      records: [record({ id, vehicleId: id, recordDate: '2026-08-10', amount: 100 })],
    }));
    const comparisons = buildVehicleComparisons(data, 'last_month', NOW);
    expect(comparisons).toHaveLength(3);
    expect(comparisons.every((item) => item.totalCost === 100)).toBe(true);
    expect(comparisons.every((item) => item.distanceKm === null)).toBe(true);
  });
});
