import { describe, expect, it } from 'vitest';
import { Reminder } from '@/domain/entities';
import {
  LocalReminderSchedule,
  ReminderNotificationGateway,
  synchronizeReminderNotification,
} from './notificationRecovery';

const futureDate = () => {
  const date = new Date(Date.now() + 86_400_000);
  return date.toISOString().slice(0, 10);
};

const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: 'reminder-a',
  vehicleId: 'vehicle-a',
  ownerId: 'owner-a',
  title: 'Bakım',
  reminderType: 'periodic_maintenance',
  dueDate: futureDate(),
  dueKilometer: null,
  completed: false,
  completedAt: null,
  notificationId: null,
  notificationStatus: 'pending',
  notificationLastAttemptAt: null,
  notificationErrorCode: null,
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

function gateway(options: {
  permission?: 'granted' | 'denied' | 'undetermined';
  scheduled?: LocalReminderSchedule[];
  failSchedule?: boolean;
} = {}) {
  const cancelled: string[] = [];
  const value: ReminderNotificationGateway = {
    getPermission: async () => options.permission ?? 'granted',
    list: async () => options.scheduled ?? [],
    schedule: async () => {
      if (options.failSchedule) throw new Error('provider detail');
      return 'local-new';
    },
    cancel: async (id) => {
      cancelled.push(id);
    },
  };
  return { value, cancelled };
}

describe('reminder notification recovery', () => {
  it('keeps the DB reminder recoverable when scheduling fails', async () => {
    const fake = gateway({ failSchedule: true });
    await expect(
      synchronizeReminderNotification(reminder(), fake.value, { requestPermission: true }),
    ).resolves.toEqual({
      status: 'failed',
      notificationId: null,
      errorCode: 'NOTIFICATION_SCHEDULE_FAILED',
    });
  });

  it('retries a failed reminder and schedules once', async () => {
    const fake = gateway();
    const result = await synchronizeReminderNotification(
      reminder({ notificationStatus: 'failed' }),
      fake.value,
      { requestPermission: false },
    );
    expect(result.status).toBe('scheduled');
    expect(result.notificationId).toBe('local-new');
  });

  it('cancels the old schedule before an edit and avoids duplicates', async () => {
    const fake = gateway({ scheduled: [{ id: 'duplicate', reminderId: 'reminder-a' }] });
    const result = await synchronizeReminderNotification(
      reminder({ notificationId: 'old' }),
      fake.value,
      { requestPermission: true, forceReschedule: true },
    );
    expect(fake.cancelled).toEqual(expect.arrayContaining(['old', 'duplicate']));
    expect(result.notificationId).toBe('local-new');
  });

  it('does not retry forever while permission remains denied', async () => {
    const fake = gateway({ permission: 'denied' });
    const result = await synchronizeReminderNotification(reminder(), fake.value, {
      requestPermission: false,
    });
    expect(result.status).toBe('permission_denied');
  });

  it('cancels a completed reminder schedule', async () => {
    const fake = gateway({ scheduled: [{ id: 'local-old', reminderId: 'reminder-a' }] });
    const result = await synchronizeReminderNotification(
      reminder({ completed: true, notificationId: 'local-old' }),
      fake.value,
      { requestPermission: false },
    );
    expect(result.status).toBe('not_required');
    expect(fake.cancelled).toContain('local-old');
  });
});
