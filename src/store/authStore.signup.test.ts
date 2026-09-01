/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock } = vi.hoisted(() => ({
  authMock: {
    signUp: vi.fn(),
    signOut: vi.fn(async () => ({ error: null })),
  },
}));

vi.mock('@/data/supabase/client', () => ({
  isSupabaseConfigured: true,
  getSupabaseClient: () => ({ auth: authMock }),
}));
vi.mock('@/features/auth/recoveryRedirect', () => ({
  getEmailConfirmationRedirectUrl: () => 'aracimcepte://auth/confirm-email',
  getPasswordRecoveryRedirectUrl: () => 'aracimcepte://auth/reset-password',
}));
vi.mock('@/features/auth/returningUser', () => ({
  markHasSignedInBefore: vi.fn(async () => undefined),
  readHasSignedInBefore: vi.fn(async () => false),
}));

import { useAuthStore } from './authStore';

describe('auth store signup confirmation boundary', () => {
  beforeEach(() => {
    authMock.signUp.mockReset();
    authMock.signOut.mockClear();
    useAuthStore.setState({ busy: false, error: null, session: null });
  });

  it('accepts only a user created in verification-pending state', async () => {
    authMock.signUp.mockResolvedValueOnce({
      data: { user: { id: 'synthetic-user' }, session: null },
      error: null,
    });

    await expect(
      useAuthStore.getState().signUp(' Test@Example.com ', 'guvenli-123', ' Test '),
    ).resolves.toBe(true);
    expect(authMock.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'guvenli-123',
      options: {
        emailRedirectTo: 'aracimcepte://auth/confirm-email',
        data: { display_name: 'Test' },
      },
    });
    expect(authMock.signOut).not.toHaveBeenCalled();
  });

  it('fails closed and clears a session when email confirmation is disabled', async () => {
    authMock.signUp.mockResolvedValueOnce({
      data: { user: { id: 'synthetic-user' }, session: { access_token: 'redacted' } },
      error: null,
    });

    await expect(
      useAuthStore.getState().signUp('test@example.com', 'guvenli-123', 'Test'),
    ).resolves.toBe(false);
    expect(authMock.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(useAuthStore.getState().error).toContain('E-posta doğrulaması');
  });
});
