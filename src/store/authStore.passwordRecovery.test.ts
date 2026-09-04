/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock } = vi.hoisted(() => ({
  authMock: {
    verifyOtp: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    setSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    updateUser: vi.fn(),
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

const session = {
  access_token: 'redacted-access',
  refresh_token: 'redacted-refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: 'recovery-user' },
};

describe('auth store password recovery boundary', () => {
  beforeEach(() => {
    authMock.verifyOtp.mockReset();
    authMock.exchangeCodeForSession.mockReset();
    authMock.setSession.mockReset();
    authMock.updateUser.mockReset();
    authMock.signOut.mockClear().mockResolvedValue({ error: null });
    useAuthStore.setState({ busy: false, error: null, session: null, recoveryMode: false });
  });

  it('establishes a session from a valid token_hash callback and enters recovery mode', async () => {
    authMock.verifyOtp.mockResolvedValueOnce({ data: { session }, error: null });

    const ok = await useAuthStore
      .getState()
      .establishRecovery('aracimcepte://auth/reset-password?token_hash=real-token&type=recovery');

    expect(ok).toBe(true);
    expect(authMock.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'real-token',
      type: 'recovery',
    });
    expect(useAuthStore.getState().recoveryMode).toBe(true);
    expect(useAuthStore.getState().session?.user.id).toBe('recovery-user');
  });

  it('rejects an expired/used token_hash without entering recovery mode', async () => {
    authMock.verifyOtp.mockResolvedValueOnce({
      data: { session: null },
      error: new Error('Token has expired or is invalid'),
    });

    const ok = await useAuthStore
      .getState()
      .establishRecovery('aracimcepte://auth/reset-password?token_hash=stale&type=recovery');

    expect(ok).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().error).toMatch(/süresi dolmuş|kullanılmış/);
  });

  it('updates the password on the session established by recovery, then ends it', async () => {
    authMock.verifyOtp.mockResolvedValueOnce({ data: { session }, error: null });
    await useAuthStore
      .getState()
      .establishRecovery('aracimcepte://auth/reset-password?token_hash=real-token&type=recovery');

    authMock.updateUser.mockResolvedValueOnce({ data: { user: session.user }, error: null });
    const ok = await useAuthStore.getState().updateRecoveredPassword('Guvenli-123!');

    expect(ok).toBe(true);
    // updateUser runs against the client whose active session verifyOtp just
    // established for THIS token — supabase-js keeps that session current
    // internally, so this always targets the account the recovery link named.
    expect(authMock.updateUser).toHaveBeenCalledWith({ password: 'Guvenli-123!' });
    // The one-time recovery session must not remain usable afterward.
    expect(authMock.signOut).toHaveBeenCalledWith({ scope: 'global' });
    expect(useAuthStore.getState().recoveryMode).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('keeps recovery mode active and reports an error when updateUser fails', async () => {
    authMock.verifyOtp.mockResolvedValueOnce({ data: { session }, error: null });
    await useAuthStore
      .getState()
      .establishRecovery('aracimcepte://auth/reset-password?token_hash=real-token&type=recovery');

    authMock.updateUser.mockRejectedValueOnce(new Error('weak_password'));
    const ok = await useAuthStore.getState().updateRecoveredPassword('Guvenli-123!');

    expect(ok).toBe(false);
    expect(authMock.signOut).not.toHaveBeenCalled();
    expect(useAuthStore.getState().error).toBeTruthy();
  });
});
