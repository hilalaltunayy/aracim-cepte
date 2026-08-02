import { describe, expect, it, vi } from 'vitest';
import {
  CONFIRMATION_RESEND_COOLDOWN_MS,
  CONFIRMATION_RESEND_LIMIT_MESSAGE,
  CONFIRMATION_RESEND_MAX_ATTEMPTS,
  CONFIRMATION_RESEND_SUCCESS_MESSAGE,
  getConfirmationCooldownSeconds,
  getConfirmationResendError,
  resendSignupConfirmation,
} from './confirmationResend';

describe('confirmation resend', () => {
  it('normalizes the email and calls only the signup resend API', async () => {
    const resend = vi.fn(async () => ({ error: null }));
    await resendSignupConfirmation({ resend }, '  User@Example.Invalid ');
    expect(resend).toHaveBeenCalledWith({ type: 'signup', email: 'user@example.invalid' });
  });

  it('calculates a non-negative cooldown', () => {
    expect(CONFIRMATION_RESEND_COOLDOWN_MS).toBe(60_000);
    expect(CONFIRMATION_RESEND_MAX_ATTEMPTS).toBe(3);
    expect(CONFIRMATION_RESEND_LIMIT_MESSAGE).toMatch(/daha sonra/);
    expect(getConfirmationCooldownSeconds(31_000, 1_000)).toBe(30);
    expect(getConfirmationCooldownSeconds(999, 1_000)).toBe(0);
  });

  it('maps provider failures without exposing raw details', () => {
    expect(getConfirmationResendError(new Error('email rate limit exceeded'))).toMatch(/bekleyip/);
    expect(getConfirmationResendError(new Error('email already confirmed'))).toMatch(/zaten/);
    const safe = getConfirmationResendError(new Error('provider token=secret-value'));
    expect(safe).toMatch(/gönderilemedi/);
    expect(safe).not.toContain('secret-value');
    expect(CONFIRMATION_RESEND_SUCCESS_MESSAGE).toMatch(/yeniden gönderildi/);
  });
});
