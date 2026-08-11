import {
  DEFAULT_REMINDER_TIME,
  getReminderDueDateTime,
} from './reminderDateTimeValidation';

export const DEFAULT_NOTIFICATION_LEAD_DAYS = 1;
export const DEFAULT_NOTIFICATION_HOUR = Number(DEFAULT_REMINDER_TIME.slice(0, 2));
export const NOTIFICATION_LEAD_OPTIONS = [
  { value: '7', label: '7 gün önce' },
  { value: '3', label: '3 gün önce' },
  { value: '1', label: '1 gün önce' },
  { value: '0', label: 'Aynı gün' },
  { value: 'custom', label: 'Özel' },
] as const;

export function normalizeLeadDays(value: number): number {
  return Number.isInteger(value) && value >= 0 && value <= 365
    ? value
    : DEFAULT_NOTIFICATION_LEAD_DAYS;
}

export function getReminderNotificationTrigger(
  dueDate: string,
  leadDays: number,
  now = new Date(),
  dueTime: string | null | undefined = DEFAULT_REMINDER_TIME,
): Date | null {
  const due = getReminderDueDateTime(dueDate, dueTime);
  if (!due) return null;
  const trigger = new Date(due);
  trigger.setDate(trigger.getDate() - normalizeLeadDays(leadDays));
  return trigger.getTime() > now.getTime() ? trigger : null;
}

export function getReminderNotificationBody(title: string, leadDays: number): string {
  if (leadDays === 0) return `${title} bugün yapılmalı.`;
  if (leadDays === 1) return `${title} yarın.`;
  return `${title} için ${leadDays.toLocaleString('tr-TR')} gün kaldı.`;
}
