import type { ReminderType } from '@/domain/entities';
import { reminderTypeLabels } from '@/shared/constants/labels';

export function isAutomaticReminderTitle(title: string, type: ReminderType): boolean {
  return title.trim() === reminderTypeLabels[type];
}

export function titleAfterReminderTypeChange(
  title: string,
  previousType: ReminderType,
  nextType: ReminderType,
  automatic: boolean,
): string {
  return automatic || isAutomaticReminderTitle(title, previousType)
    ? reminderTypeLabels[nextType]
    : title;
}
