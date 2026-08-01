import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Reminder } from '@/domain/entities';
import {
  ReminderNotificationGateway,
  ReminderNotificationSyncResult,
  synchronizeReminderNotification,
} from './notificationRecovery';
import { getNotificationLeadDays } from './notificationPreferences';
import { getReminderNotificationBody } from './notificationSchedule';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function permissionState(status: Notifications.PermissionStatus) {
  if (status === Notifications.PermissionStatus.GRANTED) return 'granted' as const;
  if (status === Notifications.PermissionStatus.DENIED) return 'denied' as const;
  return 'undetermined' as const;
}

const notificationGateway: ReminderNotificationGateway = {
  async getPermission(requestIfUndetermined) {
    const current = await Notifications.getPermissionsAsync();
    if (current.status !== Notifications.PermissionStatus.UNDETERMINED || !requestIfUndetermined) {
      return permissionState(current.status);
    }
    return permissionState((await Notifications.requestPermissionsAsync()).status);
  },
  async list() {
    const requests = await Notifications.getAllScheduledNotificationsAsync();
    return requests.map((request) => ({
      id: request.identifier,
      reminderId:
        typeof request.content.data?.reminderId === 'string'
          ? request.content.data.reminderId
          : null,
    }));
  },
  async schedule(reminder, date, leadDays) {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Araç hatırlatıcıları',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    return Notifications.scheduleNotificationAsync({
      identifier: `reminder-${reminder.id}-lead-${leadDays}`,
      content: {
        title: 'Aracım Cepte',
        body: getReminderNotificationBody(reminder.title, leadDays),
        data: { route: '/(tabs)/reminders', reminderId: reminder.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
      },
    });
  },
  async cancel(id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Reconciliation is idempotent; the OS may already have removed the request.
    }
  },
};

export async function reconcileReminderNotification(
  reminder: Reminder,
  options: {
    requestPermission: boolean;
    forceReschedule?: boolean;
    staleIds?: string[];
    leadDays?: number;
    now?: Date;
  },
): Promise<ReminderNotificationSyncResult> {
  const leadDays = options.leadDays ?? (await getNotificationLeadDays(reminder.id));
  return synchronizeReminderNotification(reminder, notificationGateway, { ...options, leadDays });
}

export async function cancelReminderNotification(id: string | null): Promise<void> {
  if (id) await notificationGateway.cancel(id);
}

export async function cancelUnknownReminderNotifications(validReminderIds: Set<string>) {
  const scheduled = await notificationGateway.list();
  await Promise.all(
    scheduled
      .filter((item) => item.reminderId && !validReminderIds.has(item.reminderId))
      .map((item) => notificationGateway.cancel(item.id)),
  );
}
