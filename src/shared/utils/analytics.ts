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

export function getMonthlyTrendTotal(data: readonly MonthlyTotal[]): number {
  return data.reduce(
    (sum, item) => sum + (Number.isFinite(item.total) && item.total > 0 ? item.total : 0),
    0,
  );
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

export const REMINDER_APPROACHING_DAYS = 30;
export const REMINDER_APPROACHING_KILOMETERS = 1_000;

export type ReminderDisplayStatus =
  | 'completed'
  | 'planned'
  | 'approaching'
  | 'today'
  | 'date_overdue'
  | 'mileage_due'
  | 'mileage_overdue'
  | 'both_overdue';

export interface ReminderDisplay {
  status: ReminderDisplayStatus;
  reasons: string[];
}

function calendarDayDifference(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / 86_400_000);
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
): ReminderDisplayStatus {
  return getReminderDisplay(reminder, currentKm, today).status;
}

export function getReminderDisplay(
  reminder: {
    completed: boolean;
    dueDate: string | null;
    dueKilometer: number | null;
  },
  currentKm: number,
  today = todayDateOnly(),
): ReminderDisplay {
  if (reminder.completed) return { status: 'completed', reasons: ['Tamamlandı'] };
  let dateStatus: 'planned' | 'approaching' | 'today' | 'overdue' | null = null;
  let kilometerStatus: 'planned' | 'approaching' | 'due' | 'overdue' | null = null;
  const reasons: string[] = [];
  if (reminder.dueDate) {
    const due = parseDateOnly(reminder.dueDate);
    const current = parseDateOnly(today);
    if (due && current) {
      const days = calendarDayDifference(current, due);
      dateStatus =
        days < 0
          ? 'overdue'
          : days === 0
            ? 'today'
            : days <= REMINDER_APPROACHING_DAYS
              ? 'approaching'
              : 'planned';
      reasons.push(
        days < 0
          ? `Tarih ${Math.abs(days)} gün geçti`
          : days === 0
            ? 'Tarih bugün'
            : `Tarihe ${days.toLocaleString('tr-TR')} gün kaldı`,
      );
    }
  }
  if (reminder.dueKilometer !== null) {
    const difference = Math.round(reminder.dueKilometer - currentKm);
    kilometerStatus =
      difference < 0
        ? 'overdue'
        : difference === 0
          ? 'due'
          : difference <= REMINDER_APPROACHING_KILOMETERS
            ? 'approaching'
            : 'planned';
    reasons.push(
      difference < 0
        ? `${Math.abs(difference).toLocaleString('tr-TR')} km aşıldı`
        : difference === 0
          ? 'Hedef kilometreye ulaşıldı'
          : `${difference.toLocaleString('tr-TR')} km kaldı`,
    );
  }

  if (dateStatus === 'overdue' && kilometerStatus === 'overdue') {
    return { status: 'both_overdue', reasons };
  }
  if (kilometerStatus === 'overdue') return { status: 'mileage_overdue', reasons };
  if (dateStatus === 'overdue') return { status: 'date_overdue', reasons };
  if (kilometerStatus === 'due') return { status: 'mileage_due', reasons };
  if (dateStatus === 'today') return { status: 'today', reasons };
  if (dateStatus === 'approaching' || kilometerStatus === 'approaching') {
    return { status: 'approaching', reasons };
  }
  return { status: 'planned', reasons };
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
    for (const condition of item.conditions) summary[condition] += 1;
    return summary;
  }, initial);
}
