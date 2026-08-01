import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, parseDecimal } from '@/shared/utils/format';
import {
  getBodyConditionSummary,
  getCostPerKilometer,
  getDocumentExpiryStatus,
  getMonthlyTotals,
  getPreviousMonthComparison,
  getReminderKilometerProgress,
  getReminderStatus,
  sortRecords,
} from '@/shared/utils/analytics';
import { BodyPartCondition, VehicleRecord } from '@/domain/entities';
import { bodySchemas, isValidPartKey } from '@/features/bodyCondition/schemas';

const record = (
  id: string,
  recordDate: string,
  amount: number,
  kilometer: number | null,
): VehicleRecord => ({
  id,
  vehicleId: 'vehicle',
  ownerId: 'owner',
  recordType: 'expense',
  category: 'Diğer',
  amount,
  recordDate,
  kilometer,
  liters: null,
  description: null,
  createdAt: `${recordDate}T12:00:00Z`,
  updatedAt: `${recordDate}T12:00:00Z`,
});

describe('Turkish formatting and input', () => {
  it('parses comma and period decimals without producing NaN', () => {
    expect(parseDecimal('12,50')).toBe(12.5);
    expect(parseDecimal('12.50')).toBe(12.5);
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('')).toBeNull();
  });

  it('uses safe fallbacks for currency and dates', () => {
    expect(formatCurrency(Number.NaN)).toMatch(/₺|TL/);
    expect(formatCurrency(undefined)).toMatch(/0/);
    expect(formatDate('invalid')).toBe('Geçersiz tarih');
    expect(formatDate(null)).toBe('Tarih yok');
  });
});

describe('record analytics', () => {
  const records = [
    record('jan', '2026-01-12', 100, 1000),
    record('feb-a', '2026-02-02', 150, 1100),
    record('feb-b', '2026-02-22', 50, 1200),
  ];

  it('calculates monthly totals and previous month comparison', () => {
    const totals = getMonthlyTotals(records, 2, new Date(2026, 1, 15));
    expect(totals.map((item) => item.total)).toEqual([100, 200]);
    expect(getPreviousMonthComparison(records, new Date(2026, 1, 15))).toBe(100);
  });

  it('safely calculates cost per kilometer', () => {
    expect(getCostPerKilometer(records)).toBe(1.5);
    expect(getCostPerKilometer([record('only', '2026-01-01', 100, 1000)])).toBeNull();
    expect(
      getCostPerKilometer([
        record('a', '2026-01-01', 100, 1000),
        record('b', '2026-01-02', 50, 1000),
      ]),
    ).toBeNull();
  });

  it('sorts records newest first', () => {
    expect(sortRecords(records).map((item) => item.id)).toEqual(['feb-b', 'feb-a', 'jan']);
  });
});

describe('status calculations', () => {
  it('uses the most urgent reminder condition', () => {
    expect(
      getReminderStatus(
        { completed: false, dueDate: '2026-02-20', dueKilometer: 5000 },
        1000,
        '2026-02-21',
      ),
    ).toBe('overdue');
    expect(
      getReminderStatus(
        { completed: false, dueDate: null, dueKilometer: 1800 },
        1000,
        '2026-02-01',
      ),
    ).toBe('upcoming');
    expect(
      getReminderStatus({ completed: true, dueDate: '2020-01-01', dueKilometer: null }, 1000),
    ).toBe('completed');
  });

  it('distinguishes mileage due from overdue and clamps displayed distances', () => {
    const reminder = { completed: false, dueDate: null, dueKilometer: 50_000 };
    expect(getReminderStatus(reminder, 50_000, '2026-02-01')).toBe('due');
    expect(getReminderStatus(reminder, 50_001, '2026-02-01')).toBe('overdue');
    expect(getReminderKilometerProgress(50_000, 49_500)).toEqual({
      remaining: 500,
      overdueBy: 0,
    });
    expect(getReminderKilometerProgress(50_000, 50_250)).toEqual({
      remaining: 0,
      overdueBy: 250,
    });
  });

  it('calculates document expiry status from date-only values', () => {
    expect(getDocumentExpiryStatus(null, '2026-02-01')).toBe('no_expiry');
    expect(getDocumentExpiryStatus('2026-01-31', '2026-02-01')).toBe('expired');
    expect(getDocumentExpiryStatus('2026-02-20', '2026-02-01')).toBe('approaching');
    expect(getDocumentExpiryStatus('2026-12-01', '2026-02-01')).toBe('valid');
  });
});

describe('body condition schemas', () => {
  it('summarizes conditions', () => {
    const items: BodyPartCondition[] = [
      {
        id: '1',
        vehicleId: 'v',
        ownerId: 'o',
        schemaType: 'sedan_hatchback',
        partKey: 'hood',
        condition: 'painted',
        note: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        vehicleId: 'v',
        ownerId: 'o',
        schemaType: 'sedan_hatchback',
        partKey: 'roof',
        condition: 'painted',
        note: null,
        createdAt: '',
        updatedAt: '',
      },
    ];
    expect(getBodyConditionSummary(items).painted).toBe(2);
    expect(getBodyConditionSummary(items).replaced).toBe(0);
  });

  it('validates supported parts per body schema', () => {
    expect(isValidPartKey('sedan_hatchback', 'trunk')).toBe(true);
    expect(isValidPartKey('pickup_light_commercial', 'cargo_bed')).toBe(true);
    expect(isValidPartKey('sedan_hatchback', 'cargo_bed')).toBe(false);
    expect(bodySchemas.suv_crossover.parts.length).toBeGreaterThan(5);
  });
});
