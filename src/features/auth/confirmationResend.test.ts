import { describe, expect, it, vi } from 'vitest';
import {
  CONFIRMATION_RESEND_SUCCESS_MESSAGE,
  getConfirmationCooldownSeconds,
  getConfirmationResendError,
  resendSignupConfirmation,
} from './confirmationResend';

describe('confirmation resend', () => {
  it('normalizes the email and calls only the signup resend API', async () => {
    const resend = vi.fn(async () => ({ error: null }));
    await resendSignupConfirmation({ resend }, '  User@Example.COM ');
    expect(resend).toHaveBeenCalledWith({ type: 'signup', email: 'user@example.com' });
  });

  it('calculates a non-negative cooldown', () => {
    expect(getConfirmationCooldownSeconds(31_000, 1_000)).toBe(30);
    expect(getConfirmationCooldownSeconds(999, 1_000)).toBe(0);
  });

  it('maps provider failures without exposing raw details', () => {
    expect(getConfirmationResendError(new Error('email rate limit exceeded'))).toMatch(/bekleyip/);
    const safe = getConfirmationResendError(new Error('provider token=secret-value'));
    expect(safe).toMatch(/gönderilemedi/);
    expect(safe).not.toContain('secret-value');
    expect(CONFIRMATION_RESEND_SUCCESS_MESSAGE).toMatch(/yeniden gönderildi/);
  });
});
