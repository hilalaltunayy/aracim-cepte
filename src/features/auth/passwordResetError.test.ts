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
