import { describe, expect, it } from 'vitest';
import { AppError, getFriendlyError, isSessionExpiredError } from './errors';

describe('safe session errors', () => {
  it('recognizes auth/session expiry without matching unrelated errors', () => {
    expect(isSessionExpiredError(new AppError('safe', 'AUTH'))).toBe(true);
    expect(isSessionExpiredError(new Error('JWT expired'))).toBe(true);
    expect(isSessionExpiredError(new Error('ordinary network failure'))).toBe(false);
  });

  it('uses the approved message without exposing token details', () => {
    const message = getFriendlyError(new Error('refresh token secret-value is invalid'));
    expect(message).toBe('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
    expect(message).not.toContain('secret-value');
  });
});
