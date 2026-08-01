import { BodyCondition, BodyPartCondition, VehicleRecord } from '@/domain/entities';
import { parseDateOnly, todayDateOnly } from './format';

export interface MonthlyTotal {
  key: string;
  label: string;
  total: number;
}

export interface MonthComparison {
  currentTotal: number;
  previousTotal: number;
  absoluteChange: number;
  percentageChange: number | null;
}

export interface CategoryPercentage {
  recordType: VehicleRecord['recordType'];
  total: number;
  percentage: number;
}

function safeAmount(record: VehicleRecord): number {
  return Number.isFinite(record.amount) && record.amount > 0 ? record.amount : 0;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function sortRecords(records: VehicleRecord[]): VehicleRecord[] {
  return [...records].sort(
    (a, b) => b.recordDate.localeCompare(a.recordDate) || b.createdAt.localeCompare(a.createdAt),
  );
}

export function getRecordTypeTotals(records: VehicleRecord[]) {
  return records.reduce(
    (totals, record) => {
      totals[record.recordType] += safeAmount(record);
      return totals;
    },
    { fuel: 0, maintenance: 0, expense: 0 },
  );
}

export function getCurrentMonthRecordTypeTotals(records: VehicleRecord[], anchor = new Date()) {
  const key = monthKey(anchor);
  return getRecordTypeTotals(records.filter((record) => record.recordDate.startsWith(key)));
}

export function getAllTimeTotal(records: VehicleRecord[]): number {
  return records.reduce((sum, record) => sum + safeAmount(record), 0);
}

export function getTotalFuelLiters(records: VehicleRecord[]): number {
  return records.reduce(
    (sum, record) =>
      record.recordType === 'fuel' && record.liters !== null && Number.isFinite(record.liters)
        ? sum + Math.max(record.liters, 0)
        : sum,
    0,
  );
}

export function getMonthlyTotals(
  records: VehicleRecord[],
  monthCount = 6,
  anchor = new Date(),
): MonthlyTotal[] {
  return Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(anchor.getFullYear(), anchor.getMonth() - (monthCount - 1 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const total = records
      .filter((record) => record.recordDate.startsWith(key))
      .reduce((sum, record) => sum + safeAmount(record), 0);
    return {
      key,
      label: new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(date).replace('.', ''),
      total,
    };
  });
}

export function getPreviousMonthComparison(
  records: VehicleRecord[],
  anchor = new Date(),
): number | null {
  const months = getMonthlyTotals(records, 2, anchor);
  const [previous, current] = months;
  if (!previous || !current || previous.total <= 0) return null;
  return ((current.total - previous.total) / previous.total) * 100;
}

export function getPreviousMonthSummary(
  records: VehicleRecord[],
  anchor = new Date(),
): MonthComparison {
  const [previous, current] = getMonthlyTotals(records, 2, anchor);
  const previousTotal = previous?.total ?? 0;
  const currentTotal = current?.total ?? 0;
  return {
    currentTotal,
    previousTotal,
    absoluteChange: currentTotal - previousTotal,
    percentageChange:
      previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null,
  };
}

export function getCategoryPercentages(records: VehicleRecord[]): CategoryPercentage[] {
  const totals = getRecordTypeTotals(records);
  const allTimeTotal = getAllTimeTotal(records);
  return (['fuel', 'maintenance', 'expense'] as const).map((recordType) => ({
    recordType,
    total: totals[recordType],
    percentage: allTimeTotal > 0 ? (totals[recordType] / allTimeTotal) * 100 : 0,
  }));
}

export function getCostPerKilometer(records: VehicleRecord[]): number | null {
  const withKm = records.filter(
    (record): record is VehicleRecord & { kilometer: number } =>
      record.kilometer !== null && Number.isFinite(record.kilometer),
  );
  if (withKm.length < 2) return null;
  const chronological = [...withKm].sort(
    (a, b) => a.recordDate.localeCompare(b.recordDate) || a.createdAt.localeCompare(b.createdAt),
  );
  if (
    chronological.some(
      (record, index) => index > 0 && record.kilometer < chronological[index - 1].kilometer,
    )
  )
    return null;
  const first = chronological[0];
  const last = chronological[chronological.length - 1];
  const range = last.kilometer - first.kilometer;
  if (range <= 0) return null;
  const total = records
    .filter(
      (record) => record.recordDate >= first.recordDate && record.recordDate <= last.recordDate,
    )
    .reduce((sum, record) => sum + safeAmount(record), 0);
  const result = total / range;
  return Number.isFinite(result) ? result : null;
}

export type UrgencyStatus = 'completed' | 'overdue' | 'due' | 'upcoming' | 'planned';

function urgencyRank(status: UrgencyStatus): number {
  return { completed: 0, planned: 1, upcoming: 2, due: 3, overdue: 4 }[status];
}

export function getReminderKilometerProgress(targetKm: number, currentKm: number) {
  const difference = Math.round(targetKm - currentKm);
  return {
    remaining: Math.max(difference, 0),
    overdueBy: Math.max(-difference, 0),
  };
}

export function getReminderStatus(
  reminder: {
    completed: boolean;
    dueDate: string | null;
    dueKilometer: number | null;
  },
  currentKm: number,
  today = todayDateOnly(),
): UrgencyStatus {
  if (reminder.completed) return 'completed';
  const statuses: UrgencyStatus[] = [];
  if (reminder.dueDate) {
    const due = parseDateOnly(reminder.dueDate);
    const current = parseDateOnly(today);
    if (due && current) {
      const days = Math.ceil((due.getTime() - current.getTime()) / 86_400_000);
      statuses.push(days < 0 ? 'overdue' : days <= 30 ? 'upcoming' : 'planned');
    }
  }
  if (reminder.dueKilometer !== null) {
    const remaining = reminder.dueKilometer - currentKm;
    statuses.push(
      remaining < 0
        ? 'overdue'
        : remaining === 0
          ? 'due'
          : remaining <= 1000
            ? 'upcoming'
            : 'planned',
    );
  }
  return statuses.sort((a, b) => urgencyRank(b) - urgencyRank(a))[0] ?? 'planned';
}

export type DocumentExpiryStatus = 'expired' | 'approaching' | 'valid' | 'no_expiry';

export function getDocumentExpiryStatus(
  expiryDate: string | null,
  today = todayDateOnly(),
): DocumentExpiryStatus {
  if (!expiryDate) return 'no_expiry';
  const expiry = parseDateOnly(expiryDate);
  const current = parseDateOnly(today);
  if (!expiry || !current) return 'no_expiry';
  const days = Math.ceil((expiry.getTime() - current.getTime()) / 86_400_000);
  return days < 0 ? 'expired' : days <= 30 ? 'approaching' : 'valid';
}

export function getBodyConditionSummary(
  conditions: BodyPartCondition[],
): Record<BodyCondition, number> {
  const initial: Record<BodyCondition, number> = {
    original: 0,
    painted: 0,
    locally_painted: 0,
    replaced: 0,
    damaged: 0,
    unknown: 0,
  };
  return conditions.reduce((summary, item) => {
    summary[item.condition] += 1;
    return summary;
  }, initial);
}
