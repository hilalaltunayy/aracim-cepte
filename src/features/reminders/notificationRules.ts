export function canScheduleReminderNotification(input: {
  permissionStatus: string;
  dueTime: number;
  now: number;
}): boolean {
  return (
    input.permissionStatus === 'granted' &&
    Number.isFinite(input.dueTime) &&
    input.dueTime > input.now
  );
}
