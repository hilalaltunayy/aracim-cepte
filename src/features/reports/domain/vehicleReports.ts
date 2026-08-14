import type { Vehicle, VehicleRecord } from '@/domain/entities';

export const REPORT_PERIOD_IDS = ['month', 'last_month', 'three_months', 'six_months', 'year'] as const;
export type ReportPeriodId = (typeof REPORT_PERIOD_IDS)[number];

export interface ReportPeriod { id: ReportPeriodId; label: string; start: string; end: string; previousStart: string; previousEnd: string; monthCount: number; }
export interface ReportBucket { key: string; label: string; total: number; fuel: number; maintenance: number; expense: number; }
export interface ReportComparison { value: number; previousValue: number; percentage: number | null; }
export interface VehicleReport {
  period: ReportPeriod;
  totalCost: number;
  fuelCost: number;
  maintenanceCost: number;
  otherCost: number;
  fuelLiters: number | null;
  averageFuelPrice: number | null;
  distanceKm: number | null;
  costPerKm: number | null;
  consumption: number | null;
  maintenanceCount: number;
  partsCost: number | null;
  laborCost: number | null;
  buckets: ReportBucket[];
  comparisons: { total: ReportComparison; fuel: ReportComparison; maintenance: ReportComparison };
  highestCategory: 'fuel' | 'maintenance' | 'expense' | null;
  hasTrend: boolean;
}

const dateOnly = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const amount = (record: VehicleRecord) => Number.isFinite(record.amount) && record.amount > 0 ? record.amount : 0;

export function getReportPeriod(id: ReportPeriodId, anchor = new Date()): ReportPeriod {
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const endOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const spec: Record<ReportPeriodId, [string, number, number]> = {
    month: ['Bu ay', 0, 1], last_month: ['Geçen ay', -1, 1], three_months: ['Son 3 ay', -2, 3], six_months: ['Son 6 ay', -5, 6], year: ['Bu yıl', -anchor.getMonth(), anchor.getMonth() + 1],
  };
  const [label, offset, monthCount] = spec[id];
  const start = new Date(monthStart.getFullYear(), monthStart.getMonth() + offset, 1);
  const end = id === 'last_month' ? new Date(monthStart.getFullYear(), monthStart.getMonth(), 0) : endOfMonth;
  const previousEnd = new Date(start.getFullYear(), start.getMonth(), 0);
  const previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth() - monthCount + 1, 1);
  return { id, label, start: dateOnly(start), end: dateOnly(end), previousStart: dateOnly(previousStart), previousEnd: dateOnly(previousEnd), monthCount };
}

function inRange(records: VehicleRecord[], start: string, end: string) { return records.filter((record) => record.recordDate >= start && record.recordDate <= end); }
function totals(records: VehicleRecord[]) {
  return records.reduce((value, record) => { value.total += amount(record); value[record.recordType] += amount(record); return value; }, { total: 0, fuel: 0, maintenance: 0, expense: 0 });
}
function comparison(current: number, previous: number): ReportComparison { return { value: current, previousValue: previous, percentage: previous > 0 ? ((current - previous) / previous) * 100 : null }; }

function distance(records: VehicleRecord[]): number | null {
  const known = records.filter((record): record is VehicleRecord & { kilometer: number } => record.kilometer !== null && Number.isFinite(record.kilometer))
    .sort((a, b) => a.recordDate.localeCompare(b.recordDate) || a.createdAt.localeCompare(b.createdAt));
  if (known.length < 2) return null;
  if (known.some((record, index) => index > 0 && record.recordDate !== known[index - 1].recordDate && record.kilometer < known[index - 1].kilometer)) return null;
  const result = known.at(-1)!.kilometer - known[0].kilometer;
  return result > 0 ? result : null;
}

function buckets(records: VehicleRecord[], period: ReportPeriod): ReportBucket[] {
  return Array.from({ length: period.monthCount }, (_, index) => {
    const date = new Date(`${period.start}T12:00:00`); date.setMonth(date.getMonth() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthTotals = totals(records.filter((record) => record.recordDate.startsWith(key)));
    return { key, label: new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(date).replace('.', ''), ...monthTotals };
  });
}

export function buildVehicleReport(records: VehicleRecord[], vehicle: Pick<Vehicle, 'id'>, periodId: ReportPeriodId, anchor = new Date()): VehicleReport {
  const period = getReportPeriod(periodId, anchor);
  const scoped = records.filter((record) => record.vehicleId === vehicle.id);
  const current = inRange(scoped, period.start, period.end); const previous = inRange(scoped, period.previousStart, period.previousEnd);
  const currentTotals = totals(current); const previousTotals = totals(previous);
  const fuelRecords = current.filter((record) => record.recordType === 'fuel');
  const totalLiters = fuelRecords.reduce((sum, record) => sum + (record.liters !== null && Number.isFinite(record.liters) && record.liters > 0 ? record.liters : 0), 0);
  const hasLiters = totalLiters > 0;
  const km = distance(current); const parts = current.filter((record) => record.recordType === 'maintenance').reduce((sum, record) => sum + (record.partsCost && record.partsCost > 0 ? record.partsCost : 0), 0);
  const labor = current.filter((record) => record.recordType === 'maintenance').reduce((sum, record) => sum + (record.laborCost && record.laborCost > 0 ? record.laborCost : 0), 0);
  const categoryEntries = (['fuel', 'maintenance', 'expense'] as const).map((key) => [key, currentTotals[key]] as const).filter(([, value]) => value > 0);
  const highestCategory = categoryEntries.length ? categoryEntries.sort((a, b) => b[1] - a[1])[0][0] : null;
  const reportBuckets = buckets(scoped, period);
  return { period, totalCost: currentTotals.total, fuelCost: currentTotals.fuel, maintenanceCost: currentTotals.maintenance, otherCost: currentTotals.expense,
    fuelLiters: hasLiters ? totalLiters : null, averageFuelPrice: hasLiters ? currentTotals.fuel / totalLiters : null, distanceKm: km,
    costPerKm: km ? currentTotals.total / km : null, consumption: km && hasLiters ? (totalLiters / km) * 100 : null,
    maintenanceCount: current.filter((record) => record.recordType === 'maintenance').length, partsCost: parts > 0 ? parts : null, laborCost: labor > 0 ? labor : null,
    buckets: reportBuckets, comparisons: { total: comparison(currentTotals.total, previousTotals.total), fuel: comparison(currentTotals.fuel, previousTotals.fuel), maintenance: comparison(currentTotals.maintenance, previousTotals.maintenance) }, highestCategory,
    hasTrend: reportBuckets.filter((bucket) => bucket.total > 0).length > 1 };
}
