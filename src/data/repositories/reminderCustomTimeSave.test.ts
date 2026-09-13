/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReminderDraft } from '@/domain/entities';

const mocks = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
  reconcileReminderNotification: vi.fn(),
  setNotificationLeadDays: vi.fn(),
  cancelReminderNotification: vi.fn(),
}));

vi.mock('@/data/supabase/client', () => ({ getSupabaseClient: mocks.getSupabaseClient }));
vi.mock('@/features/reminders/notifications', () => ({
  cancelReminderNotification: mocks.cancelReminderNotification,
  cancelUnknownReminderNotifications: vi.fn(),
  reconcileReminderNotification: mocks.reconcileReminderNotification,
}));
vi.mock('@/features/reminders/notificationPreferences', () => ({
  removeNotificationPreferences: vi.fn(),
  setNotificationLeadDays: mocks.setNotificationLeadDays,
}));
vi.mock('@/data/storage/attachments', () => ({ reconcileAttachments: vi.fn() }));
vi.mock('@/shared/utils/requestId', () => ({ createRequestId: () => 'request-id' }));

import { SupabaseAppRepository } from './SupabaseAppRepository';
import { getFriendlyError } from '@/shared/utils/errors';

const OWNER = '11111111-1111-4111-8111-111111111111';
// Far enough ahead that the past-date guard never interferes.
const FUTURE_DATE = `${new Date().getFullYear() + 2}-09-18`;

const draft = (dueTime: string | null): ReminderDraft => ({
  title: 'Periyodik bakım',
  reminderType: 'periodic_maintenance',
  dueDate: FUTURE_DATE,
  dueTime,
  dueKilometer: null,
  notificationLeadDays: 1,
});

const savedRow = (dueTime: string | null) => ({
  id: 'reminder-1',
  vehicle_id: 'vehicle-1',
  owner_id: OWNER,
  title: 'Periyodik bakım',
  reminder_type: 'periodic_maintenance',
  due_date: FUTURE_DATE,
  due_time: dueTime,
  due_kilometer: null,
  completed: false,
  completed_at: null,
  notification_id: 'notification-1',
  notification_status: 'scheduled',
  notification_last_attempt_at: null,
  notification_error_code: null,
  created_at: '2026-09-07T00:00:00Z',
});

/**
 * Minimal Supabase double that records the reminder payload actually sent and
 * lets a test make the first write fail the way the entitlement trigger does.
 */
function client({ insertError = null }: { insertError?: { message: string } | null } = {}) {
  const inserted: Record<string, unknown>[] = [];
  const auth = { getUser: vi.fn(async () => ({ data: { user: { id: OWNER } }, error: null })) };
  let writes = 0;
  const from = vi.fn(() => {
    const builder: Record<string, unknown> = {};
    const result = (data: unknown, error: unknown = null) => ({
      select: () => ({
        single: async () => ({ data, error }),
        maybeSingle: async () => ({ data, error }),
      }),
    });
    builder.insert = (payload: Record<string, unknown>) => {
      inserted.push(payload);
      return insertError
        ? result(null, insertError)
        : result(savedRow(payload.due_time as string | null));
    };
    builder.update = (payload: Record<string, unknown>) => {
      writes += 1;
      return {
        eq: () =>
          result(savedRow((payload.due_time as string | null) ?? inserted[0]?.due_time as string)),
      };
    };
    builder.select = () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) });
    return builder;
  });
  return { supabase: { auth, from }, inserted, writes: () => writes };
}

describe('reminder custom-time save path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reconcileReminderNotification.mockResolvedValue({
      notificationId: 'notification-1',
      status: 'scheduled',
      errorCode: null,
    });
  });

  it('sends the chosen 22:30 to the database as a plain wall-clock time', async () => {
    const stub = client();
    mocks.getSupabaseClient.mockReturnValue(stub.supabase);

    const saved = await new SupabaseAppRepository().saveReminder('vehicle-1', draft('22:30'));

    // No timezone conversion, no ISO timestamp: the column is `time without time zone`.
    expect(stub.inserted[0].due_time).toBe('22:30');
    expect(stub.inserted[0].due_date).toBe(FUTURE_DATE);
    expect(saved.dueTime).toBe('22:30');
  });

  it('falls back to 09:00 only when no time was chosen at all', async () => {
    const stub = client();
    mocks.getSupabaseClient.mockReturnValue(stub.supabase);

    await new SupabaseAppRepository().saveReminder('vehicle-1', draft(null));

    expect(stub.inserted[0].due_time).toBe('09:00');
  });

  it('surfaces the entitlement trigger rejection as an actionable Premium message', async () => {
    // Exactly what `enforce_reminder_due_time_entitlement` raises when the
    // trusted mirror still says Free.
    const stub = client({ insertError: { message: 'CUSTOM_REMINDER_TIME_PREMIUM_REQUIRED' } });
    mocks.getSupabaseClient.mockReturnValue(stub.supabase);

    const caught = await new SupabaseAppRepository()
      .saveReminder('vehicle-1', draft('22:30'))
      .then(() => null)
      .catch((error: unknown) => error);

    expect(caught).toBeTruthy();
    const message = getFriendlyError(caught);
    expect(message).not.toBe('İşlem tamamlanamadı. Lütfen tekrar deneyin.');
    expect(message).toContain('Özel hatırlatıcı saati Premium');
  });

  it('does not schedule a device notification when the database write is rejected', async () => {
    const stub = client({ insertError: { message: 'CUSTOM_REMINDER_TIME_PREMIUM_REQUIRED' } });
    mocks.getSupabaseClient.mockReturnValue(stub.supabase);

    await new SupabaseAppRepository()
      .saveReminder('vehicle-1', draft('22:30'))
      .catch(() => undefined);

    expect(mocks.reconcileReminderNotification).not.toHaveBeenCalled();
    expect(mocks.setNotificationLeadDays).not.toHaveBeenCalled();
  });
});

// TASK-013: the device notification must follow a confirmed database row, never
// precede it -- a reminder the server rejected must not leave an alarm behind, and a
// reminder the server accepted must schedule against the persisted time.
it('schedules the device notification only after the row is persisted, using the saved time', async () => {
  const stub = client();
  mocks.getSupabaseClient.mockReturnValue(stub.supabase);

  const saved = await new SupabaseAppRepository().saveReminder('vehicle-1', draft('22:30'));

  // The write happened first...
  expect(stub.inserted[0].due_time).toBe('22:30');
  expect(saved.dueTime).toBe('22:30');
  // ...and only then was an alarm scheduled, for the row that actually exists.
  expect(mocks.reconcileReminderNotification).toHaveBeenCalledOnce();
  const [scheduledFor] = mocks.reconcileReminderNotification.mock.calls[0];
  expect(scheduledFor).toMatchObject({ id: 'reminder-1', dueTime: '22:30', dueDate: FUTURE_DATE });
});
