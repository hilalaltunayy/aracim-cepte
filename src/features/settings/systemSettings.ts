export const NOTIFICATION_SETTINGS_ERROR_MESSAGE =
  'Bildirim ayarları açılamadı. Lütfen cihaz ayarlarından Aracım Cepte bildirimlerini açın.';

export async function openNotificationSystemSettings(
  openSettings: () => Promise<void>,
): Promise<boolean> {
  try {
    await openSettings();
    return true;
  } catch {
    return false;
  }
}
