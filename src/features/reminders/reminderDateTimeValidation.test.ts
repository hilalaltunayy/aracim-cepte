import { describe, expect, it } from 'vitest';
import { validateReminderDateTime } from './reminderDateTimeValidation';

describe('reminder date-time save guard', () => {
  it('accepts future dates', () => {
    expect(validateReminderDateTime('2026-08-12', '09:00', new Date(2026, 7, 11, 12)).valid).toBe(
      true,
    );
  });

  it('rejects dates whose final local reminder time is in the past', () => {
    expect(validateReminderDateTime('2026-08-10', '09:00', new Date(2026, 7, 11, 8))).toMatchObject({
      valid: false,
      code: 'past_due_time',
    });
  });

  it('uses local 09:00 to distinguish same-day earlier and later times', () => {
    expect(
      validateReminderDateTime('2026-08-11', '09:00', new Date(2026, 7, 11, 8, 59)).valid,
    ).toBe(true);
    expect(
      validateReminderDateTime('2026-08-11', '09:00', new Date(2026, 7, 11, 9, 1)),
    ).toMatchObject({
      valid: false,
      code: 'past_due_time',
    });
  });

  it('compares an explicitly selected same-day time instead of calendar date only', () => {
    const now = new Date(2026, 7, 11, 16, 30);
    expect(validateReminderDateTime('2026-08-11', '15:00', now).valid).toBe(false);
    expect(validateReminderDateTime('2026-08-11', '18:00', now).valid).toBe(true);
  });

  it('keeps kilometer-only reminders valid and rejects malformed dates', () => {
    expect(validateReminderDateTime(null).valid).toBe(true);
    expect(validateReminderDateTime('2026-02-30')).toMatchObject({
      valid: false,
      code: 'invalid_date',
    });
    expect(validateReminderDateTime('2026-08-12', '25:00')).toMatchObject({
      valid: false,
      code: 'invalid_date',
    });
  });
});
