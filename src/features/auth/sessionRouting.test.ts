import { describe, expect, it } from 'vitest';
import {
  SESSION_EXPIRED_MESSAGE,
  isProtectedRoute,
  shouldRedirectExpiredSession,
} from './sessionRouting';

describe('protected route session handling', () => {
  it('keeps onboarding, auth and legal routes public', () => {
    expect(isProtectedRoute([])).toBe(false);
    expect(isProtectedRoute(['onboarding'])).toBe(false);
    expect(isProtectedRoute(['auth', 'login'])).toBe(false);
    expect(isProtectedRoute(['legal', 'privacy-policy'])).toBe(false);
  });

  it('redirects unauthenticated protected routes only after auth is ready', () => {
    const protectedInput = {
      authReady: true,
      authenticated: false,
      recoveryMode: false,
      segments: ['(tabs)', 'settings'],
    };
    expect(shouldRedirectExpiredSession(protectedInput)).toBe(true);
    expect(shouldRedirectExpiredSession({ ...protectedInput, authReady: false })).toBe(false);
    expect(shouldRedirectExpiredSession({ ...protectedInput, authenticated: true })).toBe(false);
    expect(shouldRedirectExpiredSession({ ...protectedInput, recoveryMode: true })).toBe(false);
  });

  it('uses the approved Turkish expiry message', () => {
    expect(SESSION_EXPIRED_MESSAGE).toBe('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
  });
});
