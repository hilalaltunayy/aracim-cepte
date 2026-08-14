import { parseDateOnly, toDateOnly } from '@/shared/utils/format';
import { DEFAULT_REMINDER_TIME, validateReminderDateTime } from './reminderDateTimeValidation';

export const REMINDER_MAX_YEAR = 2040;

export const REMINDER_MONTH_NAMES = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const;

export function getReminderYearRange(now = new Date()): number[] {
  const currentYear = now.getFullYear();
  if (currentYear > REMINDER_MAX_YEAR) return [];
  return Array.from(
    { length: REMINDER_MAX_YEAR - currentYear + 1 },
    (_, index) => currentYear + index,
  );
}

export function isWithinReminderDateRange(
  value: string | null | undefined,
  now = new Date(),
): boolean {
  if (!value) return true;
  const date = parseDateOnly(value);
  if (!date) return false;
  const min = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const max = new Date(REMINDER_MAX_YEAR, 11, 31, 23, 59, 59, 999);
  return date >= min && date <= max;
}

export function clampReminderDay(year: number, monthIndex: number, day: number): number {
  return Math.min(Math.max(day, 1), new Date(year, monthIndex + 1, 0).getDate());
}

export function dateForReminderCalendar(year: number, monthIndex: number, day: number): string {
  return toDateOnly(new Date(year, monthIndex, clampReminderDay(year, monthIndex, day), 12));
}

/** Free users keep an existing custom reminder time after a downgrade, but cannot choose a new one. */
export function resolveReminderTimeForForm(
  storedDueTime: string | null | undefined,
  canCustomizeReminderTime: boolean,
): string {
  if (canCustomizeReminderTime && storedDueTime) return storedDueTime;
  return storedDueTime || DEFAULT_REMINDER_TIME;
}

export function canSaveReminderDateAtTime(
  dueDate: string | null,
  dueTime: string,
  now = new Date(),
): boolean {
  return (
    isWithinReminderDateRange(dueDate, now) && validateReminderDateTime(dueDate, dueTime, now).valid
  );
}
