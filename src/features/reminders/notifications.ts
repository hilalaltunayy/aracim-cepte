import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { parseDateOnly } from '@/shared/utils/format';
import { canScheduleReminderNotification } from './notificationRules';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function scheduleReminderNotification(
  title: string,
  dueDate: string | null,
): Promise<string | null> {
  if (!dueDate) return null;
  const date = parseDateOnly(dueDate);
  if (!date) return null;
  date.setHours(9, 0, 0, 0);
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Araç hatırlatıcıları',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;
  if (status === 'undetermined') status = (await Notifications.requestPermissionsAsync()).status;
  if (
    !canScheduleReminderNotification({
      permissionStatus: status,
      dueTime: date.getTime(),
      now: Date.now(),
    })
  )
    return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Aracım Cepte',
      body: `${title} için planlanan tarih geldi.`,
      data: { route: '/(tabs)/reminders' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
    },
  });
}

export async function cancelReminderNotification(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // The operating system may already have delivered or removed this notification.
  }
}
