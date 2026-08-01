import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  buildRecoveryRedirectUrl,
  establishPasswordRecoverySession,
  parsePasswordRecoveryCallback,
  RecoveryAuthClient,
  validateNewPassword,
} from './passwordRecovery';

const session = {
  access_token: 'redacted-access',
  refresh_token: 'redacted-refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: 'qa-user' },
} as Session;

function authClient(options?: {
  event?: AuthChangeEvent;
  exchangeError?: Error;
}): RecoveryAuthClient {
  let callback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;
  return {
    exchangeCodeForSession: vi.fn(async () => {
      if (options?.event && callback) callback(options.event, session);
      return {
        data: { session: options?.exchangeError ? null : session },
        error: options?.exchangeError ?? null,
      };
    }),
    verifyOtp: vi.fn(async () => ({ data: { session }, error: null })),
    setSession: vi.fn(async () => ({ data: { session }, error: null })),
    onAuthStateChange: (next) => {
      callback = next;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
  };
}

describe('password recovery callback parsing', () => {
  it('parses PKCE, token hash and implicit recovery formats', () => {
    expect(
      parsePasswordRecoveryCallback(
        'http://localhost:8082/auth/reset-password?code=pkce-code&type=recovery',
      ),
    ).toEqual({ kind: 'pkce', code: 'pkce-code', explicitlyRecovery: true });
    expect(
      parsePasswordRecoveryCallback(
        'aracimcepte://auth/reset-password?token_hash=hash&type=recovery',
      ),
    ).toEqual({ kind: 'token_hash', tokenHash: 'hash' });
    expect(
      parsePasswordRecoveryCallback(
        'aracimcepte://auth/reset-password#access_token=a&refresh_token=r&type=recovery',
      ),
    ).toEqual({ kind: 'implicit', accessToken: 'a', refreshToken: 'r' });
  });

  it('rejects missing, malformed, expired and ordinary sign-in callbacks', () => {
    expect(parsePasswordRecoveryCallback(null).kind).toBe('error');
    expect(parsePasswordRecoveryCallback('not-a-url').kind).toBe('error');
    expect(
      parsePasswordRecoveryCallback('http://localhost:8082/auth/reset-password?error=access_denied')
        .kind,
    ).toBe('error');
    expect(
      parsePasswordRecoveryCallback(
        'http://localhost:8082/auth/reset-password#access_token=a&refresh_token=r&type=signup',
      ).kind,
    ).toBe('error');
  });

  it('requires a PASSWORD_RECOVERY event for an untyped PKCE callback', async () => {
    const rejected = await establishPasswordRecoverySession(
      authClient({ event: 'SIGNED_IN' }),
      'http://localhost:8082/auth/reset-password?code=ordinary-code',
    );
    expect(rejected.session).toBeNull();
    expect(rejected.error).toMatch(/geçersiz|eksik/);

    const accepted = await establishPasswordRecoverySession(
      authClient({ event: 'PASSWORD_RECOVERY' }),
      'http://localhost:8082/auth/reset-password?code=recovery-code',
    );
    expect(accepted.session?.user.id).toBe('qa-user');
    expect(accepted.error).toBeNull();
  });

  it('maps used or expired exchanges to a safe Turkish error', async () => {
    const result = await establishPasswordRecoverySession(
      authClient({ exchangeError: new Error('raw server token error') }),
      'http://localhost:8082/auth/reset-password?code=expired&type=recovery',
    );
    expect(result.session).toBeNull();
    expect(result.error).toMatch(/süresi dolmuş|kullanılmış/);
    expect(result.error).not.toContain('raw server');
  });
});

describe('password recovery validation and redirect URLs', () => {
  it('validates length, confirmation and a valid password', () => {
    expect(validateNewPassword('short', 'short')).toMatch(/8 karakter/);
    expect(validateNewPassword('guvenli-123', 'farkli-123')).toMatch(/eşleşmiyor/);
    expect(validateNewPassword('guvenli-123', 'guvenli-123')).toBeNull();
  });

  it('builds deterministic web and native recovery routes', () => {
    expect(buildRecoveryRedirectUrl({ platform: 'web', webOrigin: 'http://localhost:8083' })).toBe(
      'http://localhost:8083/auth/reset-password',
    );
    expect(
      buildRecoveryRedirectUrl({
        platform: 'native',
        nativeUrl: 'aracimcepte://auth/reset-password',
      }),
    ).toBe('aracimcepte://auth/reset-password');
  });
});
