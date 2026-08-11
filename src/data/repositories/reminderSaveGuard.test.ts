/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReminderDraft } from '@/domain/entities';

const mocks = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
  reconcileReminderNotification: vi.fn(),
}));

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
vi.mock('@/data/storage/attachments', () => ({ reconcileAttachments: vi.fn() }));
vi.mock('@/shared/utils/requestId', () => ({ createRequestId: () => 'request-id' }));

import { SupabaseAppRepository } from './SupabaseAppRepository';

const draft = (dueDate: string): ReminderDraft => ({
  title: 'Geçmiş kontrolü',
  reminderType: 'custom',
  dueDate,
  dueKilometer: null,
  notificationLeadDays: 0,
});

describe('repository reminder save guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a past create before any database write or notification scheduling', async () => {
    const repository = new SupabaseAppRepository();
    await expect(repository.saveReminder('vehicle-id', draft('2000-01-01'))).rejects.toMatchObject({
      message: 'Geçmiş bir tarih için hatırlatıcı oluşturamazsınız.',
    });
    expect(mocks.getSupabaseClient).not.toHaveBeenCalled();
    expect(mocks.reconcileReminderNotification).not.toHaveBeenCalled();
  });

  it('rejects editing an existing reminder into the past before rescheduling', async () => {
    const repository = new SupabaseAppRepository();
    await expect(
      repository.saveReminder('vehicle-id', draft('2000-01-01'), 'reminder-id'),
    ).rejects.toBeTruthy();
    expect(mocks.getSupabaseClient).not.toHaveBeenCalled();
    expect(mocks.reconcileReminderNotification).not.toHaveBeenCalled();
  });
});
