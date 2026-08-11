import { parseDateOnly, parseTimeOnly } from '@/shared/utils/format';

export const REMINDER_TIME_TOLERANCE_MS = 1_000;
export const DEFAULT_REMINDER_TIME = '09:00';

export type ReminderDateTimeValidation =
  | { valid: true; dueAt: Date | null; code: null }
  | { valid: false; dueAt: Date | null; code: 'invalid_date' | 'past_due_time' };

export function getReminderDueDateTime(
  dueDate: string,
  dueTime: string | null | undefined = DEFAULT_REMINDER_TIME,
): Date | null {
  const parsed = parseDateOnly(dueDate);
  if (!parsed) return null;
  return parseTimeOnly(dueTime || DEFAULT_REMINDER_TIME, parsed);
}

export function validateReminderDateTime(
  dueDate: string | null,
  dueTime: string | null | undefined = DEFAULT_REMINDER_TIME,
  now = new Date(),
): ReminderDateTimeValidation {
  if (!dueDate) return { valid: true, dueAt: null, code: null };
  const dueAt = getReminderDueDateTime(dueDate, dueTime);
  if (!dueAt) return { valid: false, dueAt: null, code: 'invalid_date' };
  if (dueAt.getTime() + REMINDER_TIME_TOLERANCE_MS < now.getTime()) {
    return { valid: false, dueAt, code: 'past_due_time' };
  }
  return { valid: true, dueAt, code: null };
}
