import { describe, expect, it } from 'vitest';
import { DEFAULT_REMINDER_TIME } from './reminderDateTimeValidation';
import {
  canSaveReminderDateAtTime,
  clampReminderDay,
  dateForReminderCalendar,
  getReminderYearRange,
  isWithinReminderDateRange,
  REMINDER_MAX_YEAR,
  resolveReminderTimeForForm,
} from './reminderSchedulePreferences';

describe('reminder scheduling preferences', () => {
  const now = new Date(2026, 7, 14, 10, 0);

  it('offers the current year through the product maximum year', () => {
    expect(getReminderYearRange(now)).toEqual(expect.arrayContaining([2026, REMINDER_MAX_YEAR]));
    expect(getReminderYearRange(now)).not.toContain(2041);
  });

  it('fails safely when the current year exceeds the product range', () => {
    expect(getReminderYearRange(new Date(2041, 0, 1))).toEqual([]);
  });

  it('rejects past and post-2040 dates', () => {
    expect(isWithinReminderDateRange('2026-08-13', now)).toBe(false);
    expect(isWithinReminderDateRange('2040-12-31', now)).toBe(true);
    expect(isWithinReminderDateRange('2041-01-01', now)).toBe(false);
  });

  it('keeps calendar day transitions valid for short months and leap years', () => {
    expect(clampReminderDay(2026, 1, 31)).toBe(28);
    expect(clampReminderDay(2028, 1, 31)).toBe(29);
    expect(dateForReminderCalendar(2028, 1, 31)).toBe('2028-02-29');
  });

  it('uses the complete date and time for same-day validity', () => {
    expect(canSaveReminderDateAtTime('2026-08-14', '09:00', now)).toBe(false);
    expect(canSaveReminderDateAtTime('2026-08-14', '14:30', now)).toBe(true);
  });

  it('keeps legacy missing time at 09:00 and retains an existing custom time after downgrade', () => {
    expect(resolveReminderTimeForForm(null, false)).toBe(DEFAULT_REMINDER_TIME);
    expect(resolveReminderTimeForForm('18:00', false)).toBe('18:00');
    expect(resolveReminderTimeForForm('14:30', true)).toBe('14:30');
  });
});
