import { Reminder } from '@/domain/entities';
import { parseDateOnly } from '@/shared/utils/format';

export type ReminderNotificationStatus =
  | 'pending'
  | 'scheduled'
  | 'not_required'
  | 'permission_denied'
  | 'failed';

export interface LocalReminderSchedule {
  id: string;
  reminderId: string | null;
}

export interface ReminderNotificationGateway {
  getPermission(requestIfUndetermined: boolean): Promise<'granted' | 'denied' | 'undetermined'>;
  list(): Promise<LocalReminderSchedule[]>;
  schedule(reminder: Reminder, date: Date): Promise<string>;
  cancel(id: string): Promise<void>;
}

export interface ReminderNotificationSyncResult {
  status: ReminderNotificationStatus;
  notificationId: string | null;
  errorCode: string | null;
}

async function cancelAll(gateway: ReminderNotificationGateway, ids: Iterable<string>) {
  await Promise.all(Array.from(new Set(ids)).map((id) => gateway.cancel(id)));
}

export async function synchronizeReminderNotification(
  reminder: Reminder,
  gateway: ReminderNotificationGateway,
  options: { requestPermission: boolean; forceReschedule?: boolean; staleIds?: string[] },
): Promise<ReminderNotificationSyncResult> {
  try {
    const scheduled = await gateway.list();
    const matching = scheduled.filter((item) => item.reminderId === reminder.id);
    const knownIds = [
      ...(options.staleIds ?? []),
      ...(reminder.notificationId ? [reminder.notificationId] : []),
      ...matching.map((item) => item.id),
    ];
    const date = reminder.dueDate ? parseDateOnly(reminder.dueDate) : null;
    if (date) date.setHours(9, 0, 0, 0);

    if (reminder.completed || !date || date.getTime() <= Date.now()) {
      await cancelAll(gateway, knownIds);
      return { status: 'not_required', notificationId: null, errorCode: null };
    }

    if (!options.forceReschedule && matching.length === 1) {
      const [existing] = matching;
      await cancelAll(
        gateway,
        knownIds.filter((id) => id !== existing.id),
      );
      return { status: 'scheduled', notificationId: existing.id, errorCode: null };
    }

    await cancelAll(gateway, knownIds);
    const permission = await gateway.getPermission(options.requestPermission);
    if (permission === 'denied') {
      return {
        status: 'permission_denied',
        notificationId: null,
        errorCode: 'NOTIFICATION_PERMISSION_DENIED',
      };
    }
    if (permission === 'undetermined') {
      return { status: 'pending', notificationId: null, errorCode: null };
    }

    const notificationId = await gateway.schedule(reminder, date);
    return { status: 'scheduled', notificationId, errorCode: null };
  } catch {
    return {
      status: 'failed',
      notificationId: null,
      errorCode: 'NOTIFICATION_SCHEDULE_FAILED',
    };
  }
}
