import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_NOTIFICATION_LEAD_DAYS, normalizeLeadDays } from './notificationSchedule';

const STORAGE_KEY = 'aracim-cepte-reminder-notification-preferences';

type PreferenceMap = Record<string, number>;

async function readPreferences(): Promise<PreferenceMap> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    if (!value) return {};
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([id, days]) =>
        typeof days === 'number' ? [[id, normalizeLeadDays(days)]] : [],
      ),
    );
  } catch {
    return {};
  }
}

export async function getNotificationLeadDays(reminderId: string): Promise<number> {
  const preferences = await readPreferences();
  return preferences[reminderId] ?? DEFAULT_NOTIFICATION_LEAD_DAYS;
}

export async function setNotificationLeadDays(reminderId: string, days: number): Promise<void> {
  const preferences = await readPreferences();
  preferences[reminderId] = normalizeLeadDays(days);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export async function removeNotificationPreferences(reminderIds: readonly string[]): Promise<void> {
  if (!reminderIds.length) return;
  const preferences = await readPreferences();
  for (const id of reminderIds) delete preferences[id];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
