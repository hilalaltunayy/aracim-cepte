import type { Reminder } from '@/domain/entities';

export type ReminderNotificationDestination =
  { pathname: '/reminder/edit'; params: { id: string } } | { pathname: '/(tabs)/reminders' };

export function getReminderNotificationDestination(
  notificationIdentifier: unknown,
  reminders: readonly Reminder[],
): ReminderNotificationDestination {
  if (typeof notificationIdentifier !== 'string' || !notificationIdentifier.trim()) {
    return { pathname: '/(tabs)/reminders' };
  }
  const reminder = reminders.find(
    (item) => item.notificationId === notificationIdentifier && Boolean(item.id),
  );
  return reminder
    ? { pathname: '/reminder/edit', params: { id: reminder.id } }
    : { pathname: '/(tabs)/reminders' };
}
