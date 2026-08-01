import { describe, expect, it } from 'vitest';
import fixture from '../../../qa/seed-fixture.json';
import { VehicleRecord } from '@/domain/entities';
import {
  getAllTimeTotal,
  getCategoryPercentages,
  getCostPerKilometer,
  getCurrentMonthRecordTypeTotals,
  getMonthlyTotals,
  getMonthlyTrendTotal,
  getPreviousMonthSummary,
  getTotalFuelLiters,
} from './analytics';
import { formatCurrency, parseDateOnly, parseDecimal, toDateOnly } from './format';

function record(
  id: string,
  date: string,
  amount: number,
  kilometer: number | null,
  overrides: Partial<VehicleRecord> = {},
): VehicleRecord {
  return {
    id,
    vehicleId: 'vehicle-a',
    ownerId: 'owner-a',
    recordType: 'expense',
    category: 'Diğer',
    amount,
    recordDate: date,
    kilometer,
    liters: null,
    description: null,
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
    ...overrides,
  };
}

const mainVehicleId = fixture.vehicles[0].id;
const seededRecords: VehicleRecord[] = fixture.records
  .filter((item) => item.vehicle_id === mainVehicleId)
  .map((item) =>
    record(item.id, item.record_date, item.amount, item.kilometer, {
      vehicleId: item.vehicle_id,
      recordType: item.record_type as VehicleRecord['recordType'],
      category: item.category,
      liters: item.liters,
      description: item.description,
    }),
  );
const anchor = new Date(2026, 6, 15, 12);

describe('Turkish decimal and currency rules', () => {
  it.each([
    ['100', 100],
    ['100,50', 100.5],
    ['100.50', 100.5],
    [' 100,50 ', 100.5],
    ['0', 0],
    ['-5,25', -5.25],
    ['', null],
    ['abc', null],
    ['1,2,3', null],
  ])('parses %s as %s without NaN', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });

  it('formats Turkish currency with two safe decimal places', () => {
    const normalized = (value: string) => value.replace(/\u00a0/g, ' ');
    expect(normalized(formatCurrency(1234.5))).toMatch(/1\.234,50 (₺|TL)|₺1\.234,50/);
    expect(formatCurrency(Number.NaN)).toMatch(/0/);
    expect(formatCurrency(Number.POSITIVE_INFINITY)).toMatch(/0/);
  });
});

describe('date-only and month-boundary rules', () => {
  it('handles January/December transitions and leap days', () => {
    expect(
      getMonthlyTotals(
        [record('dec', '2025-12-31', 100, null), record('jan', '2026-01-01', 200, null)],
        2,
        new Date(2026, 0, 15),
      ).map((item) => [item.key, item.total]),
    ).toEqual([
      ['2025-12', 100],
      ['2026-01', 200],
    ]);
    expect(parseDateOnly('2024-02-29')).not.toBeNull();
    expect(parseDateOnly('2025-02-29')).toBeNull();
  });

  it('keeps date-only values on the same local calendar date', () => {
    const parsed = parseDateOnly('2026-01-01');
    expect(parsed).not.toBeNull();
    expect(toDateOnly(parsed!)).toBe('2026-01-01');
    expect(parsed!.getHours()).toBe(12);
  });
});

describe('deterministic Prompt 3 seed calculations', () => {
  it('matches current-month totals by record type', () => {
    const totals = getCurrentMonthRecordTypeTotals(seededRecords, anchor);
    expect(totals.fuel).toBe(fixture.expected.currentMonthFuel);
    expect(totals.maintenance).toBe(fixture.expected.currentMonthMaintenance);
    expect(totals.expense).toBe(fixture.expected.currentMonthExpense);
    expect(totals.fuel + totals.maintenance + totals.expense).toBe(
      fixture.expected.currentMonthTotal,
    );
  });

  it('matches all-time total and fuel litres', () => {
    expect(getAllTimeTotal(seededRecords)).toBeCloseTo(fixture.expected.allTimeTotal, 8);
    expect(getTotalFuelLiters(seededRecords)).toBeCloseTo(fixture.expected.totalFuelLitres, 8);
  });

  it('calculates previous month absolute and percentage change', () => {
    const comparison = getPreviousMonthSummary(seededRecords, anchor);
    expect(comparison.previousTotal).toBe(fixture.expected.previousMonthTotal);
    expect(comparison.currentTotal).toBe(fixture.expected.currentMonthTotal);
    expect(comparison.absoluteChange).toBe(fixture.expected.previousMonthAbsoluteChange);
    expect(comparison.percentageChange).toBeCloseTo(
      fixture.expected.previousMonthPercentageChange,
      2,
    );
  });

  it('uses a defined null percentage when the previous month is zero', () => {
    const comparison = getPreviousMonthSummary(
      [record('current', '2026-07-01', 100, null)],
      anchor,
    );
    expect(comparison.previousTotal).toBe(0);
    expect(comparison.absoluteChange).toBe(100);
    expect(comparison.percentageChange).toBeNull();
  });

  it('orders six months chronologically and fills the empty month with zero', () => {
    const monthly = getMonthlyTotals(seededRecords, 6, anchor);
    expect(monthly.map((item) => item.key)).toEqual([
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
    ]);
    expect(monthly.map((item) => item.total)).toEqual(fixture.expected.sixMonthTotals);
    expect(getMonthlyTrendTotal(monthly)).toBe(
      fixture.expected.sixMonthTotals.reduce((sum, value) => sum + value, 0),
    );
  });

  it('does not confuse fuel amount with litres and keeps zero comparisons honest', () => {
    const amountOnly = record('fuel-no-litres', '2026-07-10', 500, null, {
      recordType: 'fuel',
      liters: null,
    });
    const withLitres = record('fuel-with-litres', '2026-07-11', 500, null, {
      recordType: 'fuel',
      liters: 50,
    });
    expect(getTotalFuelLiters([amountOnly])).toBe(0);
    expect(getTotalFuelLiters([amountOnly, withLitres])).toBe(50);
    expect(getPreviousMonthSummary([], anchor).percentageChange).toBeNull();
    expect(
      getPreviousMonthSummary([record('previous', '2026-06-10', 100, null)], anchor)
        .percentageChange,
    ).toBe(-100);
  });

  it('calculates category percentages and a zero-safe empty state', () => {
    const values = Object.fromEntries(
      getCategoryPercentages(seededRecords).map((item) => [
        item.recordType,
        Number(item.percentage.toFixed(2)),
      ]),
    );
    expect(values).toEqual(fixture.expected.categoryPercentages);
    expect(
      getCategoryPercentages([]).every((item) => item.total === 0 && item.percentage === 0),
    ).toBe(true);
  });

  it('matches the documented cost per kilometre', () => {
    expect(getCostPerKilometer(seededRecords)).toBeCloseTo(fixture.expected.costPerKilometre, 2);
  });
});

describe('cost-per-kilometre integrity', () => {
  it('returns null for one mileage, decreasing mileage and zero distance', () => {
    expect(getCostPerKilometer([record('one', '2026-01-01', 100, 1000)])).toBeNull();
    expect(
      getCostPerKilometer([
        record('a', '2026-01-01', 100, 1200),
        record('b', '2026-01-02', 100, 1100),
      ]),
    ).toBeNull();
    expect(
      getCostPerKilometer([
        record('a', '2026-01-01', 100, 1000),
        record('b', '2026-01-02', 100, 1000),
      ]),
    ).toBeNull();
  });

  it('allows duplicate intermediate mileage and includes mileage-free records in the range', () => {
    const value = getCostPerKilometer([
      record('a', '2026-01-01', 100, 1000),
      record('duplicate', '2026-01-02', 50, 1000),
      record('no-km', '2026-01-03', 50, null),
      record('b', '2026-01-04', 200, 1200),
    ]);
    expect(value).toBe(2);
    expect(Number.isFinite(value)).toBe(true);
  });
});

describe('statistics after CRUD-shaped changes', () => {
  const base = [
    record('old', '2026-06-10', 100, 1000, { recordType: 'fuel', liters: 10 }),
    record('current', '2026-07-10', 200, 1200, { recordType: 'maintenance' }),
  ];

  it('recomputes after create, edit, type change, month move and delete', () => {
    const created = [...base, record('new', '2026-07-15', 50, null)];
    expect(getAllTimeTotal(created)).toBe(350);

    const edited = created.map((item) => (item.id === 'new' ? { ...item, amount: 75 } : item));
    expect(getAllTimeTotal(edited)).toBe(375);

    const categoryChanged = edited.map((item) =>
      item.id === 'current' ? { ...item, recordType: 'expense' as const } : item,
    );
    expect(getCurrentMonthRecordTypeTotals(categoryChanged, anchor).expense).toBe(275);

    const moved = categoryChanged.map((item) =>
      item.id === 'current' ? { ...item, recordDate: '2026-06-30' } : item,
    );
    expect(getCurrentMonthRecordTypeTotals(moved, anchor).expense).toBe(75);

    const deleted = moved.filter((item) => item.id !== 'new');
    expect(getCurrentMonthRecordTypeTotals(deleted, anchor).expense).toBe(0);
  });
});
