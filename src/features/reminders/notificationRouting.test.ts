import { describe, expect, it } from 'vitest';
import type { Reminder } from '@/domain/entities';
import { getReminderNotificationDestination } from './notificationRouting';

const reminder = {
  id: 'reminder-id',
  notificationId: 'notification-id',
} as Reminder;

describe('reminder notification routing', () => {
  it('opens the reminder matched by the scheduled notification identifier', () => {
    expect(getReminderNotificationDestination('notification-id', [reminder])).toEqual({
      pathname: '/reminder/edit',
      params: { id: 'reminder-id' },
    });
  });

  it('falls back safely for deleted reminders and unsupported payloads', () => {
    expect(getReminderNotificationDestination('deleted-notification', [reminder])).toEqual({
      pathname: '/(tabs)/reminders',
    });
    expect(getReminderNotificationDestination({ unsafe: true }, [reminder])).toEqual({
      pathname: '/(tabs)/reminders',
    });
  });
});
