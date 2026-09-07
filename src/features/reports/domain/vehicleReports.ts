import type { Vehicle, VehicleRecord } from '@/domain/entities';

export const REPORT_PERIOD_IDS = [
  'month',
  'last_month',
  'three_months',
  'six_months',
  'year',
] as const;
export type ReportPeriodId = (typeof REPORT_PERIOD_IDS)[number];

export const DEFAULT_REPORT_PERIOD_ID: ReportPeriodId = 'six_months';

export function isReportPeriodId(value: unknown): value is ReportPeriodId {
  return typeof value === 'string' && (REPORT_PERIOD_IDS as readonly string[]).includes(value);
}

/**
 * Normalises a persisted period id read back from storage. An unknown value —
 * an id removed in a later build, or corrupted storage — resolves to the
 * product default instead of being trusted.
 */
export function sanitizeStoredReportPeriod(value: unknown): ReportPeriodId {
  return isReportPeriodId(value) ? value : DEFAULT_REPORT_PERIOD_ID;
}

/**
 * The single authoritative interpretation of a selected period.
 *
 * Every report section, the trend chart and the PDF export read the same
 * resolved range from here. Boundaries are half-open date-only strings:
 * `startInclusive <= recordDate < endExclusive`. `recordDate` is always a
 * `YYYY-MM-DD` string, so string comparison is calendar-correct and there is no
 * end-of-day / timezone precision bug to reason about.
 */
export interface ResolvedPeriodBucket {
  key: string;
  label: string;
  startInclusive: string;
  endExclusive: string;
  /** The bucket that contains "today" — an incomplete interval. */
  isPartial: boolean;
}

export interface ResolvedPeriod {
  id: ReportPeriodId;
  label: string;
  startInclusive: string;
  /** Exclusive upper bound, capped at the day after "today" so future-dated
   *  records never leak and the current month/week is a genuine partial. */
  endExclusive: string;
  previousStartInclusive: string;
  previousEndExclusive: string;
  /** Trend grouping: single-month periods group by week, longer ones by month. */
  granularity: 'week' | 'month';
  buckets: ResolvedPeriodBucket[];
}

/** Backward-compatible shape retained for existing readers (inclusive dates). */
export interface ReportPeriod {
  id: ReportPeriodId;
  label: string;
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
  monthCount: number;
}

export interface ReportBucket {
  key: string;
  label: string;
  total: number;
  fuel: number;
  maintenance: number;
  expense: number;
  isPartial: boolean;
}
export interface ReportComparison {
  value: number;
  previousValue: number;
  percentage: number | null;
}
export interface VehicleReport {
  period: ReportPeriod;
  resolvedPeriod: ResolvedPeriod;
  trendGranularity: 'week' | 'month';
  totalCost: number;
  fuelCost: number;
  maintenanceCost: number;
  otherCost: number;
  fuelLiters: number | null;
  averageFuelPrice: number | null;
  distanceKm: number | null;
  /** True when distanceKm used an odometer reading recorded before the period. */
  distanceUsesPriorBaseline: boolean;
  costPerKm: number | null;
  consumption: number | null;
  maintenanceCount: number;
  averageMaintenanceCost: number | null;
  highestMaintenance: Pick<VehicleRecord, 'id' | 'category' | 'amount' | 'recordDate'> | null;
  fuelCostPerKm: number | null;
  refuelFrequency: number | null;
  stationDistribution: { id: string; total: number }[];
  maintenanceBreakdown: { id: string; total: number }[];
  fuelBuckets: ReportBucket[];
  maintenanceBuckets: ReportBucket[];
  partsCost: number | null;
  laborCost: number | null;
  buckets: ReportBucket[];
  comparisons: {
    total: ReportComparison;
    fuel: ReportComparison;
    maintenance: ReportComparison;
    distance: ReportComparison;
    costPerKm: ReportComparison;
    consumption: ReportComparison;
  };
  highestCategory: 'fuel' | 'maintenance' | 'expense' | null;
  hasTrend: boolean;
}

const MONTH_SHORT = new Intl.DateTimeFormat('tr-TR', { month: 'short' });
const MONTH_LONG = new Intl.DateTimeFormat('tr-TR', { month: 'long' });

const pad2 = (value: number) => String(value).padStart(2, '0');
const dateOnly = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
/** Local calendar day + `offsetDays`, returned as a date-only string. */
const shiftDay = (date: Date, offsetDays: number) =>
  dateOnly(new Date(date.getFullYear(), date.getMonth(), date.getDate() + offsetDays));
const monthShort = (date: Date) => MONTH_SHORT.format(date).replace('.', '');
const amount = (record: VehicleRecord) =>
  Number.isFinite(record.amount) && record.amount > 0 ? record.amount : 0;

interface PeriodSpec {
  label: string;
  /** Months back from the current month that the window starts at. */
  startOffsetMonths: number;
  /** How many whole months the window nominally spans (for the previous window). */
  monthSpan: number;
  granularity: 'week' | 'month';
}

const PERIOD_SPECS: Record<ReportPeriodId, (anchor: Date) => PeriodSpec> = {
  month: () => ({ label: 'Bu ay', startOffsetMonths: 0, monthSpan: 1, granularity: 'week' }),
  last_month: () => ({
    label: 'Geçen ay',
    startOffsetMonths: -1,
    monthSpan: 1,
    granularity: 'week',
  }),
  three_months: () => ({
    label: 'Son 3 ay',
    startOffsetMonths: -2,
    monthSpan: 3,
    granularity: 'month',
  }),
  six_months: () => ({
    label: 'Son 6 ay',
    startOffsetMonths: -5,
    monthSpan: 6,
    granularity: 'month',
  }),
  year: (anchor) => ({
    label: 'Bu yıl',
    startOffsetMonths: -anchor.getMonth(),
    monthSpan: anchor.getMonth() + 1,
    granularity: 'month',
  }),
};

function weekBuckets(monthStart: Date, endExclusive: string, todayExclusive: string) {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const buckets: ResolvedPeriodBucket[] = [];
  for (let day = 1; day <= daysInMonth; day += 7) {
    const lastDay = Math.min(day + 6, daysInMonth);
    const startInclusive = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    // Exclusive end is the day after the last day in the week (or next month).
    const endOfWeekExclusive =
      lastDay === daysInMonth
        ? dateOnly(new Date(year, month + 1, 1))
        : `${year}-${pad2(month + 1)}-${pad2(lastDay + 1)}`;
    // A week that starts on or after the resolved end is entirely in the future.
    if (startInclusive >= endExclusive) break;
    buckets.push({
      key: startInclusive,
      label: `${day}–${lastDay}`,
      startInclusive,
      endExclusive: endOfWeekExclusive < endExclusive ? endOfWeekExclusive : endExclusive,
      isPartial: startInclusive < todayExclusive && todayExclusive < endOfWeekExclusive,
    });
  }
  return buckets;
}

function monthBuckets(
  firstMonthStart: Date,
  monthCount: number,
  endExclusive: string,
  todayExclusive: string,
) {
  const buckets: ResolvedPeriodBucket[] = [];
  for (let index = 0; index < monthCount; index += 1) {
    const monthStart = new Date(
      firstMonthStart.getFullYear(),
      firstMonthStart.getMonth() + index,
      1,
    );
    const nextMonthStart = new Date(
      firstMonthStart.getFullYear(),
      firstMonthStart.getMonth() + index + 1,
      1,
    );
    const startInclusive = dateOnly(monthStart);
    if (startInclusive >= endExclusive) break;
    const bucketEndExclusive = dateOnly(nextMonthStart);
    buckets.push({
      key: `${monthStart.getFullYear()}-${pad2(monthStart.getMonth() + 1)}`,
      label: monthShort(monthStart),
      startInclusive,
      endExclusive: bucketEndExclusive < endExclusive ? bucketEndExclusive : endExclusive,
      isPartial: startInclusive < todayExclusive && todayExclusive < bucketEndExclusive,
    });
  }
  return buckets;
}

/**
 * Resolves a selected period id into one concrete, half-open date range plus its
 * trend buckets. This is the function every report metric must agree with.
 */
export function resolvePeriod(id: ReportPeriodId, anchor = new Date()): ResolvedPeriod {
  const spec = PERIOD_SPECS[id](anchor);
  const currentMonthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const windowStart = new Date(
    currentMonthStart.getFullYear(),
    currentMonthStart.getMonth() + spec.startOffsetMonths,
    1,
  );
  const startInclusive = dateOnly(windowStart);

  // The nominal end of the window is the first day of the month after it.
  const nominalEndMonthStart = new Date(
    windowStart.getFullYear(),
    windowStart.getMonth() + spec.monthSpan,
    1,
  );
  const nominalEndExclusive = dateOnly(nominalEndMonthStart);
  // "Today" is derived from the anchor so tests stay deterministic. The window
  // never extends past tomorrow — a future-dated record cannot inflate totals,
  // and the current month/week is an honest partial interval.
  const todayExclusive = shiftDay(anchor, 1);
  const endExclusive =
    nominalEndExclusive < todayExclusive ? nominalEndExclusive : todayExclusive;

  // Previous equivalent window: same whole-month span immediately before.
  const previousEndExclusive = startInclusive;
  const previousStart = new Date(
    windowStart.getFullYear(),
    windowStart.getMonth() - spec.monthSpan,
    1,
  );
  const previousStartInclusive = dateOnly(previousStart);

  const buckets =
    spec.granularity === 'week'
      ? weekBuckets(windowStart, endExclusive, todayExclusive)
      : monthBuckets(windowStart, spec.monthSpan, endExclusive, todayExclusive);

  return {
    id,
    label: spec.label,
    startInclusive,
    endExclusive,
    previousStartInclusive,
    previousEndExclusive,
    granularity: spec.granularity,
    buckets,
  };
}

/** @deprecated Prefer {@link resolvePeriod}. Retained for existing callers/tests. */
export function getReportPeriod(id: ReportPeriodId, anchor = new Date()): ReportPeriod {
  const resolved = resolvePeriod(id, anchor);
  return {
    id,
    label: resolved.label,
    start: resolved.startInclusive,
    end: shiftDay(new Date(`${resolved.endExclusive}T12:00:00`), -1),
    previousStart: resolved.previousStartInclusive,
    previousEnd: shiftDay(new Date(`${resolved.previousEndExclusive}T12:00:00`), -1),
    monthCount: resolved.buckets.length,
  };
}

function inHalfOpen(records: VehicleRecord[], startInclusive: string, endExclusive: string) {
  return records.filter(
    (record) => record.recordDate >= startInclusive && record.recordDate < endExclusive,
  );
}

function totals(records: VehicleRecord[]) {
  return records.reduce(
    (value, record) => {
      value.total += amount(record);
      value[record.recordType] += amount(record);
      return value;
    },
    { total: 0, fuel: 0, maintenance: 0, expense: 0 },
  );
}

function comparison(current: number, previous: number): ReportComparison {
  return {
    value: current,
    previousValue: previous,
    percentage: previous > 0 ? ((current - previous) / previous) * 100 : null,
  };
}

interface DistanceResult {
  distanceKm: number | null;
  usesPriorBaseline: boolean;
}

/**
 * Distance recorded across the selected period from odometer readings.
 *
 * When there is at least one reading inside the period, the last reading dated
 * strictly before the period is used as the starting odometer (its monetary
 * amount is never counted — it lives outside the range). Readings are ordered
 * high-water-safe; an out-of-order lower reading, a non-positive result or too
 * few readings all resolve to `null` rather than a misleading `0`.
 */
function distance(
  inRange: VehicleRecord[],
  prior: VehicleRecord[],
): DistanceResult {
  const withKm = (records: VehicleRecord[]) =>
    records
      .filter(
        (record): record is VehicleRecord & { kilometer: number } =>
          record.kilometer !== null && Number.isFinite(record.kilometer),
      )
      .sort(
        (a, b) =>
          a.recordDate.localeCompare(b.recordDate) || a.createdAt.localeCompare(b.createdAt),
      );

  const inRangeReadings = withKm(inRange);
  if (inRangeReadings.length === 0) return { distanceKm: null, usesPriorBaseline: false };

  const priorReadings = withKm(prior);
  const baseline = priorReadings.at(-1) ?? null;
  const sequence = baseline ? [baseline, ...inRangeReadings] : inRangeReadings;
  if (sequence.length < 2) return { distanceKm: null, usesPriorBaseline: false };

  const regressed = sequence.some(
    (record, index) =>
      index > 0 &&
      record.recordDate !== sequence[index - 1].recordDate &&
      record.kilometer < sequence[index - 1].kilometer,
  );
  if (regressed) return { distanceKm: null, usesPriorBaseline: false };

  const result = sequence.at(-1)!.kilometer - sequence[0].kilometer;
  return result > 0
    ? { distanceKm: result, usesPriorBaseline: Boolean(baseline) }
    : { distanceKm: null, usesPriorBaseline: false };
}

export interface VehicleComparison {
  vehicleId: string;
  label: string;
  totalCost: number;
  fuelCost: number;
  maintenanceCost: number;
  distanceKm: number | null;
  costPerKm: number | null;
}

function fuelStats(records: VehicleRecord[], km: number | null) {
  const fuel = records.filter((item) => item.recordType === 'fuel');
  const liters = fuel.reduce(
    (sum, item) => sum + (item.liters !== null && item.liters > 0 ? item.liters : 0),
    0,
  );
  return {
    liters: liters || null,
    costPerKm: km && fuel.length ? totals(fuel).fuel / km : null,
    consumption: km && liters ? (liters / km) * 100 : null,
    frequency: fuel.length || null,
  };
}

function distribution(
  records: VehicleRecord[],
  selector: (record: VehicleRecord) => string | null,
) {
  const values = new Map<string, number>();
  records.forEach((record) => {
    const key = selector(record);
    if (key) values.set(key, (values.get(key) ?? 0) + amount(record));
  });
  return [...values]
    .map(([id, total]) => ({ id, total }))
    .sort((a, b) => b.total - a.total);
}

/** Category totals for one bucket window, from the same records the metrics use. */
function fillBuckets(
  records: VehicleRecord[],
  buckets: readonly ResolvedPeriodBucket[],
): ReportBucket[] {
  return buckets.map((bucket) => {
    const scoped = records.filter(
      (record) =>
        record.recordDate >= bucket.startInclusive && record.recordDate < bucket.endExclusive,
    );
    return { key: bucket.key, label: bucket.label, isPartial: bucket.isPartial, ...totals(scoped) };
  });
}

export function buildVehicleReport(
  records: VehicleRecord[],
  vehicle: Pick<Vehicle, 'id'>,
  periodId: ReportPeriodId,
  anchor = new Date(),
): VehicleReport {
  const resolved = resolvePeriod(periodId, anchor);
  const scoped = records.filter((record) => record.vehicleId === vehicle.id);
  const current = inHalfOpen(scoped, resolved.startInclusive, resolved.endExclusive);
  const previous = inHalfOpen(
    scoped,
    resolved.previousStartInclusive,
    resolved.previousEndExclusive,
  );
  const prior = scoped.filter((record) => record.recordDate < resolved.startInclusive);
  const previousPrior = scoped.filter(
    (record) => record.recordDate < resolved.previousStartInclusive,
  );

  const currentTotals = totals(current);
  const previousTotals = totals(previous);
  const fuelRecords = current.filter((record) => record.recordType === 'fuel');
  const totalLiters = fuelRecords.reduce(
    (sum, record) =>
      sum +
      (record.liters !== null && Number.isFinite(record.liters) && record.liters > 0
        ? record.liters
        : 0),
    0,
  );
  const hasLiters = totalLiters > 0;
  const distanceResult = distance(current, prior);
  const km = distanceResult.distanceKm;
  const maintenanceRecords = current.filter((record) => record.recordType === 'maintenance');
  const parts = maintenanceRecords.reduce(
    (sum, record) => sum + (record.partsCost && record.partsCost > 0 ? record.partsCost : 0),
    0,
  );
  const labor = maintenanceRecords.reduce(
    (sum, record) => sum + (record.laborCost && record.laborCost > 0 ? record.laborCost : 0),
    0,
  );
  const categoryEntries = (['fuel', 'maintenance', 'expense'] as const)
    .map((key) => [key, currentTotals[key]] as const)
    .filter(([, value]) => value > 0);
  const highestCategory = categoryEntries.length
    ? categoryEntries.sort((a, b) => b[1] - a[1])[0][0]
    : null;

  const buckets = fillBuckets(scoped, resolved.buckets);
  const previousKm = distance(previous, previousPrior).distanceKm;
  const previousFuel = fuelStats(previous, previousKm);
  const currentFuel = fuelStats(current, km);
  const highestMaintenance = maintenanceRecords.length
    ? [...maintenanceRecords].sort((a, b) => amount(b) - amount(a))[0]
    : null;

  const nonEmptyBuckets = buckets.filter((bucket) => bucket.total > 0).length;

  return {
    period: getReportPeriod(periodId, anchor),
    resolvedPeriod: resolved,
    trendGranularity: resolved.granularity,
    totalCost: currentTotals.total,
    fuelCost: currentTotals.fuel,
    maintenanceCost: currentTotals.maintenance,
    otherCost: currentTotals.expense,
    fuelLiters: hasLiters ? totalLiters : null,
    averageFuelPrice: hasLiters ? currentTotals.fuel / totalLiters : null,
    distanceKm: km,
    distanceUsesPriorBaseline: distanceResult.usesPriorBaseline,
    costPerKm: km ? currentTotals.total / km : null,
    consumption: currentFuel.consumption,
    maintenanceCount: maintenanceRecords.length,
    partsCost: parts > 0 ? parts : null,
    laborCost: labor > 0 ? labor : null,
    averageMaintenanceCost: maintenanceRecords.length
      ? currentTotals.maintenance / maintenanceRecords.length
      : null,
    highestMaintenance: highestMaintenance
      ? {
          id: highestMaintenance.id,
          category: highestMaintenance.category,
          amount: highestMaintenance.amount,
          recordDate: highestMaintenance.recordDate,
        }
      : null,
    fuelCostPerKm: currentFuel.costPerKm,
    refuelFrequency: currentFuel.frequency,
    stationDistribution: distribution(fuelRecords, (item) => item.stationBrand ?? null),
    maintenanceBreakdown: distribution(
      maintenanceRecords,
      (item) => item.maintenanceItems?.[0]?.itemType ?? item.category ?? null,
    ),
    buckets,
    fuelBuckets: fillBuckets(
      scoped.filter((item) => item.recordType === 'fuel'),
      resolved.buckets,
    ),
    maintenanceBuckets: fillBuckets(
      scoped.filter((item) => item.recordType === 'maintenance'),
      resolved.buckets,
    ),
    comparisons: {
      total: comparison(currentTotals.total, previousTotals.total),
      fuel: comparison(currentTotals.fuel, previousTotals.fuel),
      maintenance: comparison(currentTotals.maintenance, previousTotals.maintenance),
      distance: comparison(km ?? 0, previousKm ?? 0),
      costPerKm: comparison(
        km ? currentTotals.total / km : 0,
        previousKm ? previousTotals.total / previousKm : 0,
      ),
      consumption: comparison(currentFuel.consumption ?? 0, previousFuel.consumption ?? 0),
    },
    highestCategory,
    hasTrend: nonEmptyBuckets > 1,
  };
}

/** Uses independently loaded, owner-scoped record arrays; never reuses active-vehicle data. */
export function buildVehicleComparisons(
  data: { vehicle: Pick<Vehicle, 'id' | 'brand' | 'model'>; records: VehicleRecord[] }[],
  periodId: ReportPeriodId,
  anchor = new Date(),
): VehicleComparison[] {
  return data.slice(0, 3).map(({ vehicle, records }) => {
    const report = buildVehicleReport(records, vehicle, periodId, anchor);
    return {
      vehicleId: vehicle.id,
      label: `${vehicle.brand} ${vehicle.model}`,
      totalCost: report.totalCost,
      fuelCost: report.fuelCost,
      maintenanceCost: report.maintenanceCost,
      distanceKm: report.distanceKm,
      costPerKm: report.costPerKm,
    };
  });
}

/** Full Turkish month label for a bucket key like `2026-08`. */
export function bucketLongLabel(key: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return key;
  return MONTH_LONG.format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
}
