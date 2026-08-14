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
  comparisons: { total: ReportComparison; fuel: ReportComparison; maintenance: ReportComparison; distance: ReportComparison; costPerKm: ReportComparison; consumption: ReportComparison };
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
  if (id === 'year') {
    const previousStart = new Date(start.getFullYear() - 1, 0, 1);
    const previousEnd = new Date(end.getFullYear() - 1, end.getMonth() + 1, 0);
    return { id, label, start: dateOnly(start), end: dateOnly(end), previousStart: dateOnly(previousStart), previousEnd: dateOnly(previousEnd), monthCount };
  }
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
export interface VehicleComparison { vehicleId: string; label: string; totalCost: number; fuelCost: number; maintenanceCost: number; distanceKm: number | null; costPerKm: number | null; }

function fuelStats(records: VehicleRecord[], km: number | null) {
  const fuel = records.filter((item) => item.recordType === 'fuel');
  const liters = fuel.reduce((sum, item) => sum + (item.liters !== null && item.liters > 0 ? item.liters : 0), 0);
  return { liters: liters || null, costPerKm: km && fuel.length ? totals(fuel).fuel / km : null, consumption: km && liters ? (liters / km) * 100 : null, frequency: fuel.length || null };
}
function distribution(records: VehicleRecord[], selector: (record: VehicleRecord) => string | null) {
  const values = new Map<string, number>();
  records.forEach((record) => { const key = selector(record); if (key) values.set(key, (values.get(key) ?? 0) + amount(record)); });
  return [...values].map(([id, total]) => ({ id, total })).sort((a, b) => b.total - a.total);
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
  const reportBuckets = buckets(scoped, period); const previousKm = distance(previous); const previousFuel = fuelStats(previous, previousKm);
  const maintenanceRecords = current.filter((record) => record.recordType === 'maintenance'); const currentFuel = fuelStats(current, km);
  const highestMaintenance = maintenanceRecords.length ? [...maintenanceRecords].sort((a, b) => amount(b) - amount(a))[0] : null;
  return { period, totalCost: currentTotals.total, fuelCost: currentTotals.fuel, maintenanceCost: currentTotals.maintenance, otherCost: currentTotals.expense,
    fuelLiters: hasLiters ? totalLiters : null, averageFuelPrice: hasLiters ? currentTotals.fuel / totalLiters : null, distanceKm: km,
    costPerKm: km ? currentTotals.total / km : null, consumption: currentFuel.consumption,
    maintenanceCount: maintenanceRecords.length, partsCost: parts > 0 ? parts : null, laborCost: labor > 0 ? labor : null, averageMaintenanceCost: maintenanceRecords.length ? currentTotals.maintenance / maintenanceRecords.length : null, highestMaintenance: highestMaintenance ? { id: highestMaintenance.id, category: highestMaintenance.category, amount: highestMaintenance.amount, recordDate: highestMaintenance.recordDate } : null, fuelCostPerKm: currentFuel.costPerKm, refuelFrequency: currentFuel.frequency, stationDistribution: distribution(fuelRecords, (item) => item.stationBrand ?? null), maintenanceBreakdown: distribution(maintenanceRecords, (item) => item.maintenanceItems?.[0]?.itemType ?? item.category ?? null),
    buckets: reportBuckets, fuelBuckets: buckets(scoped.filter((item) => item.recordType === 'fuel'), period), maintenanceBuckets: buckets(scoped.filter((item) => item.recordType === 'maintenance'), period), comparisons: { total: comparison(currentTotals.total, previousTotals.total), fuel: comparison(currentTotals.fuel, previousTotals.fuel), maintenance: comparison(currentTotals.maintenance, previousTotals.maintenance), distance: comparison(km ?? 0, previousKm ?? 0), costPerKm: comparison(km ? currentTotals.total / km : 0, previousKm ? previousTotals.total / previousKm : 0), consumption: comparison(currentFuel.consumption ?? 0, previousFuel.consumption ?? 0) }, highestCategory,
    hasTrend: reportBuckets.filter((bucket) => bucket.total > 0).length > 1 };
}

/** Uses independently loaded, owner-scoped record arrays; never reuses active-vehicle data for another vehicle. */
export function buildVehicleComparisons(
  data: { vehicle: Pick<Vehicle, 'id' | 'brand' | 'model'>; records: VehicleRecord[] }[],
  periodId: ReportPeriodId,
  anchor = new Date(),
): VehicleComparison[] {
  return data.slice(0, 3).map(({ vehicle, records }) => {
    const report = buildVehicleReport(records, vehicle, periodId, anchor);
    return { vehicleId: vehicle.id, label: `${vehicle.brand} ${vehicle.model}`, totalCost: report.totalCost, fuelCost: report.fuelCost, maintenanceCost: report.maintenanceCost, distanceKm: report.distanceKm, costPerKm: report.costPerKm };
  });
}
