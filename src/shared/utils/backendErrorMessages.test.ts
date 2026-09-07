import { describe, expect, it } from 'vitest';
import { findBackendErrorMessage } from './backendErrorMessages';
import { AppError, getFriendlyError } from './errors';

const GENERIC = 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';

describe('backend guard code messages', () => {
  it('names the Premium reminder-time rejection instead of the generic failure', () => {
    // The exact shape Supabase wraps a plpgsql `raise exception` in.
    const error = new Error(
      'CUSTOM_REMINDER_TIME_PREMIUM_REQUIRED',
    );
    const message = getFriendlyError(error);
    expect(message).not.toBe(GENERIC);
    expect(message).toContain('Özel hatırlatıcı saati Premium');
    expect(message).toContain('eşitlenene kadar');
  });

  it('finds the code inside a wrapped provider message', () => {
    expect(
      getFriendlyError(
        new Error('new row violates: OCR_MONTHLY_QUOTA_EXCEEDED (P0001) at reserve_ocr_usage'),
      ),
    ).toContain('tarama limitinize ulaştınız');
  });

  it('separates the attachment count limit from the storage byte limit', () => {
    expect(findBackendErrorMessage('ATTACHMENT_COUNT_QUOTA_EXCEEDED')).toContain(
      'ek dosya sayısı limitine',
    );
    expect(findBackendErrorMessage('ATTACHMENT_BYTES_QUOTA_EXCEEDED')).toContain(
      'Depolama alanınız doldu',
    );
  });

  it('reports a rejected upload type as a file-type problem, not a network problem', () => {
    // "fetch"/"network" used to win over the real reason.
    const message = getFriendlyError(
      new Error('failed to fetch: ATTACHMENT_TYPE_NOT_ALLOWED'),
    );
    expect(message).toContain('dosya türü desteklenmiyor');
  });

  it('does not match a code that is only a substring of a longer token', () => {
    expect(findBackendErrorMessage('XOCR_MONTHLY_QUOTA_EXCEEDEDX')).toBeNull();
    expect(findBackendErrorMessage('some unrelated failure')).toBeNull();
  });

  it('leaves genuinely unknown failures on the safe generic message', () => {
    expect(getFriendlyError(new Error('column reminders.foo does not exist'))).toBe(GENERIC);
    expect(getFriendlyError('not an error at all')).toBe(GENERIC);
  });

  it('never leaks raw database or provider detail into the user message', () => {
    const message = getFriendlyError(
      new Error('duplicate key value violates unique constraint "ocr_usage_reservations_pkey"'),
    );
    expect(message).toBe(GENERIC);
    expect(message).not.toContain('ocr_usage_reservations');
  });

  it('still lets an explicit AppError message through unchanged', () => {
    expect(getFriendlyError(new AppError('Özel mesaj', 'VALIDATION'))).toBe('Özel mesaj');
  });

  it('keeps the pre-existing auth and credential mappings', () => {
    expect(getFriendlyError(new Error('Invalid login credentials'))).toBe(
      'E-posta veya şifre hatalı.',
    );
    expect(getFriendlyError(new Error('jwt expired'))).toBe(
      'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
    );
    expect(getFriendlyError(new Error('VEHICLE_LIMIT_REACHED'))).toContain(
      'Araç limitinize ulaştınız',
    );
  });
});
