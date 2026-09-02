/* eslint-disable import/first */
import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-linking', () => ({
  useURL: () => null,
  getInitialURL: vi.fn(async () => null),
  addEventListener: vi.fn(() => ({ remove: vi.fn() })),
}));

import { authCallbackUrlHasParams } from './incomingAuthUrl';

describe('authCallbackUrlHasParams', () => {
  it('detects query and fragment auth-callback material', () => {
    expect(authCallbackUrlHasParams('aracimcepte://auth/reset-password?code=abc')).toBe(true);
    expect(
      authCallbackUrlHasParams('aracimcepte://auth/reset-password?token_hash=h&type=recovery'),
    ).toBe(true);
    expect(
      authCallbackUrlHasParams('aracimcepte://auth/confirm-email#access_token=a&refresh_token=r'),
    ).toBe(true);
    expect(
      authCallbackUrlHasParams('aracimcepte://auth/reset-password?error=access_denied'),
    ).toBe(true);
  });

  it('treats bare launches and unparseable input as non-callbacks', () => {
    expect(authCallbackUrlHasParams(null)).toBe(false);
    expect(authCallbackUrlHasParams(undefined)).toBe(false);
    expect(authCallbackUrlHasParams('aracimcepte://auth/reset-password')).toBe(false);
    expect(authCallbackUrlHasParams('not-a-url')).toBe(false);
  });
});
