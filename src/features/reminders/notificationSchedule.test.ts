import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFICATION_HOUR,
  DEFAULT_NOTIFICATION_LEAD_DAYS,
  getReminderNotificationBody,
  getReminderNotificationTrigger,
  normalizeLeadDays,
} from './notificationSchedule';

describe('notification lead-time rules', () => {
  it('uses a one-day default and local 09:00 trigger', () => {
    expect(DEFAULT_NOTIFICATION_LEAD_DAYS).toBe(1);
    const trigger = getReminderNotificationTrigger('2026-08-10', 1, new Date(2026, 7, 1, 12));
    expect(trigger?.getDate()).toBe(9);
    expect(trigger?.getHours()).toBe(DEFAULT_NOTIFICATION_HOUR);
  });

  it('preserves the selected local reminder time when calculating lead days', () => {
    const trigger = getReminderNotificationTrigger(
      '2026-08-10',
      1,
      new Date(2026, 7, 1, 12),
      '18:30',
    );
    expect(trigger?.getDate()).toBe(9);
    expect(trigger?.getHours()).toBe(18);
    expect(trigger?.getMinutes()).toBe(30);
  });

  it('supports 7, 3, 1, same-day and bounded custom day differences', () => {
    expect([7, 3, 1, 0, 15].map(normalizeLeadDays)).toEqual([7, 3, 1, 0, 15]);
    expect(normalizeLeadDays(-1)).toBe(1);
    expect(normalizeLeadDays(366)).toBe(1);
  });

  it('never creates an immediate notification for a past trigger', () => {
    expect(getReminderNotificationTrigger('2026-08-02', 1, new Date(2026, 7, 2, 12))).toBeNull();
  });

  it('creates clear Turkish date notification copy', () => {
    expect(getReminderNotificationBody('MTV ödemeniz', 7)).toBe('MTV ödemeniz için 7 gün kaldı.');
    expect(getReminderNotificationBody('Trafik sigortanız', 1)).toBe('Trafik sigortanız yarın.');
    expect(getReminderNotificationBody('Periyodik bakımınız', 0)).toBe(
      'Periyodik bakımınız bugün yapılmalı.',
    );
  });
});
