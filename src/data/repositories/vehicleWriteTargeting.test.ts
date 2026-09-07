/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
  reconcileReminderNotification: vi.fn(),
}));

vi.mock('react-native', () => ({}));
vi.mock('@/data/supabase/client', () => ({ getSupabaseClient: mocks.getSupabaseClient }));
vi.mock('@/features/reminders/notifications', () => ({
  cancelReminderNotification: vi.fn(),
  cancelUnknownReminderNotifications: vi.fn(),
  reconcileReminderNotification: mocks.reconcileReminderNotification,
}));
vi.mock('@/features/reminders/notificationPreferences', () => ({
  removeNotificationPreferences: vi.fn(),
  setNotificationLeadDays: vi.fn(),
}));
vi.mock('@/data/storage/attachments', () => ({
  reconcileAttachments: vi.fn(),
  uploadParentAttachment: vi.fn(),
}));
vi.mock('@/shared/utils/requestId', () => ({ createRequestId: () => 'request-id' }));

import { SupabaseAppRepository } from './SupabaseAppRepository';

const OWNER = '11111111-1111-4111-8111-111111111111';
const VEHICLE_A = 'vehicle-a';
const VEHICLE_B = 'vehicle-b';
const FUTURE = `${new Date().getFullYear() + 2}-09-18`;

/**
 * Records every write so a test can assert what actually reached the database:
 * which columns were set, and which filters scoped the statement.
 */
function client() {
  const writes: {
    table: string;
    op: 'insert' | 'update';
    payload: Record<string, unknown>;
    filters: { column: string; value: unknown }[];
  }[] = [];
  const row = (extra: Record<string, unknown> = {}) => ({
    id: 'row-1',
    vehicle_id: VEHICLE_A,
    owner_id: OWNER,
    title: 'Periyodik bakım',
    content: 'Not',
    reminder_type: 'periodic_maintenance',
    due_date: FUTURE,
    due_time: '09:00',
    due_kilometer: null,
    completed: false,
    completed_at: null,
    notification_id: null,
    notification_status: 'scheduled',
    notification_last_attempt_at: null,
    notification_error_code: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...extra,
  });

  const from = vi.fn((table: string) => {
    const builder: Record<string, unknown> = {};
    let current: (typeof writes)[number] | null = null;
    const result = () => ({
      select: () => ({
        single: async () => ({ data: row(), error: null }),
        maybeSingle: async () => ({ data: row(), error: null }),
      }),
    });
    builder.insert = (payload: Record<string, unknown>) => {
      current = { table, op: 'insert', payload, filters: [] };
      writes.push(current);
      return result();
    };
    builder.update = (payload: Record<string, unknown>) => {
      current = { table, op: 'update', payload, filters: [] };
      writes.push(current);
      return builder;
    };
    builder.eq = (column: string, value: unknown) => {
      current?.filters.push({ column, value });
      return { ...builder, ...result() };
    };
    builder.select = () => ({
      eq: () => ({ single: async () => ({ data: row(), error: null }) }),
    });
    return builder;
  });

  return {
    writes,
    supabase: {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: OWNER } }, error: null })) },
      from,
    },
  };
}

const reminderDraft = {
  title: 'Periyodik bakım',
  reminderType: 'periodic_maintenance' as const,
  dueDate: FUTURE,
  dueTime: '09:00',
  dueKilometer: null,
  notificationLeadDays: 1,
};

describe('repository never reassigns a record to another vehicle on edit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reconcileReminderNotification.mockResolvedValue({
      notificationId: 'n1',
      status: 'scheduled',
      errorCode: null,
    });
  });

  it('omits vehicle_id from a reminder update and scopes it to the original vehicle', async () => {
    const stub = client();
    mocks.getSupabaseClient.mockReturnValue(stub.supabase);

    await new SupabaseAppRepository().saveReminder(VEHICLE_A, reminderDraft, 'row-1');

    const update = stub.writes.find((w) => w.table === 'reminders' && w.op === 'update');
    expect(update).toBeTruthy();
    // The column that used to move the reminder is simply not written any more.
    expect(update!.payload).not.toHaveProperty('vehicle_id');
    expect(update!.payload).not.toHaveProperty('owner_id');
    // And the statement itself cannot touch a row on a different vehicle.
    expect(update!.filters).toEqual(
      expect.arrayContaining([
        { column: 'id', value: 'row-1' },
        { column: 'vehicle_id', value: VEHICLE_A },
      ]),
    );
  });

  it('still sets vehicle_id when a reminder is created', async () => {
    const stub = client();
    mocks.getSupabaseClient.mockReturnValue(stub.supabase);

    await new SupabaseAppRepository().saveReminder(VEHICLE_B, reminderDraft);

    const insert = stub.writes.find((w) => w.table === 'reminders' && w.op === 'insert');
    expect(insert!.payload).toMatchObject({ vehicle_id: VEHICLE_B, owner_id: OWNER });
  });

  it('omits vehicle_id from a note update and scopes it to the original vehicle', async () => {
    const stub = client();
    mocks.getSupabaseClient.mockReturnValue(stub.supabase);

    await new SupabaseAppRepository().saveNote(VEHICLE_A, { title: 'T', content: 'C' }, 'row-1');

    const update = stub.writes.find((w) => w.table === 'vehicle_notes' && w.op === 'update');
    expect(update!.payload).not.toHaveProperty('vehicle_id');
    expect(update!.filters).toEqual(
      expect.arrayContaining([
        { column: 'id', value: 'row-1' },
        { column: 'vehicle_id', value: VEHICLE_A },
      ]),
    );
  });

  it('still sets vehicle_id when a note is created', async () => {
    const stub = client();
    mocks.getSupabaseClient.mockReturnValue(stub.supabase);

    await new SupabaseAppRepository().saveNote(VEHICLE_B, { title: 'T', content: 'C' });

    const insert = stub.writes.find((w) => w.table === 'vehicle_notes' && w.op === 'insert');
    expect(insert!.payload).toMatchObject({ vehicle_id: VEHICLE_B, owner_id: OWNER });
  });
});
