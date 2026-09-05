import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getPasswordResetFriendlyError,
  getSafeAuthErrorDetails,
  logPasswordResetErrorInDevelopment,
} from './passwordResetError';

describe('password reset errors', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('maps the Supabase email send limit to an actionable Turkish message', () => {
    const error = Object.assign(new Error('email rate limit exceeded'), {
      code: 'over_email_send_rate_limit',
    });

    expect(getPasswordResetFriendlyError(error)).toMatch(/gönderim sınırına ulaşıldı/i);
  });

  it('maps the same-as-old-password backend error to the exact required Turkish message', () => {
    const error = Object.assign(
      new Error('New password should be different from the old password.'),
      { code: 'same_password' },
    );

    expect(getPasswordResetFriendlyError(error)).toBe(
      'Yeni belirleyeceğiniz şifre eski şifrenizle aynı olamaz.',
    );
  });

  it('recognises the same-password case by the SDK message even without a code', () => {
    const error = new Error('New password should be different from the old password.');
    expect(getPasswordResetFriendlyError(error)).toBe(
      'Yeni belirleyeceğiniz şifre eski şifrenizle aynı olamaz.',
    );
  });

  it('never surfaces the raw Supabase error text for the same-password case', () => {
    const error = Object.assign(
      new Error('New password should be different from the old password.'),
      { code: 'same_password' },
    );
    expect(getPasswordResetFriendlyError(error)).not.toContain('New password should be');
  });

  it('keeps ordinary password-policy errors mapped as before (unaffected by the same-password case)', () => {
    const weak = Object.assign(new Error('Password should be at least 6 characters.'), {
      code: 'weak_password',
    });
    expect(getPasswordResetFriendlyError(weak)).toBe('Şifre güvenlik koşullarını karşılamıyor.');
  });

  it('keeps development diagnostics limited to a safe code and redacted message', () => {
    const details = getSafeAuthErrorDetails({
      code: 'email_address_not_authorized',
      message: 'user@example.com access_token=secret-value is not authorized',
      status: 422,
      cause: { private: 'must-not-leak' },
    });

    expect(details).toEqual({
      code: 'email_address_not_authorized',
      message: '[REDACTED_EMAIL] access_token=[REDACTED] is not authorized',
    });
    expect(JSON.stringify(details)).not.toContain('must-not-leak');
    expect(JSON.stringify(details)).not.toContain('secret-value');
  });

  it('logs only the safe code and message in development', () => {
    vi.stubGlobal('__DEV__', true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    logPasswordResetErrorInDevelopment({
      code: 'over_email_send_rate_limit',
      message: 'email rate limit exceeded',
      privateToken: 'must-not-leak',
    });

    expect(warn).toHaveBeenCalledWith('[auth:password-reset]', {
      code: 'over_email_send_rate_limit',
      message: 'email rate limit exceeded',
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('must-not-leak');
  });
});
