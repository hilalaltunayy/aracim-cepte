import { describe, expect, it } from 'vitest';
import { canScheduleReminderNotification } from './notificationRules';

describe('notification permission and date rules', () => {
  it('does not schedule when permission is denied or the date is not future-valid', () => {
    expect(
      canScheduleReminderNotification({
        permissionStatus: 'denied',
        dueTime: 2_000,
        now: 1_000,
      }),
    ).toBe(false);
    expect(
      canScheduleReminderNotification({
        permissionStatus: 'granted',
        dueTime: 1_000,
        now: 1_000,
      }),
    ).toBe(false);
    expect(
      canScheduleReminderNotification({
        permissionStatus: 'granted',
        dueTime: Number.NaN,
        now: 1_000,
      }),
    ).toBe(false);
  });

  it('schedules only a future date with granted permission', () => {
    expect(
      canScheduleReminderNotification({
        permissionStatus: 'granted',
        dueTime: 2_000,
        now: 1_000,
      }),
    ).toBe(true);
  });
});
