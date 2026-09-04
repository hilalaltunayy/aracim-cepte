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

  it('accepts a PKCE code exchange on the reset route even without a type param or event', async () => {
    // Android drops `type=recovery` on the browser->app redirect and a cold
    // start can deliver PASSWORD_RECOVERY a tick late; a successful exchange on
    // the dedicated reset route is the recovery flow.
    const accepted = await establishPasswordRecoverySession(
      authClient({ event: 'SIGNED_IN' }),
      'http://localhost:8082/auth/reset-password?code=recovery-code',
    );
    expect(accepted.session?.user.id).toBe('qa-user');
    expect(accepted.error).toBeNull();
  });

  it('accepts a token_hash callback with no explicit type param', () => {
    expect(
      parsePasswordRecoveryCallback('aracimcepte://auth/reset-password?token_hash=hash'),
    ).toEqual({ kind: 'token_hash', tokenHash: 'hash' });
  });

  it('accepts exactly what the HTTPS email bridge forwards to the app scheme', () => {
    // https://aracimcepte.hilalaltunay.com/auth/reset-password?token_hash=…&type=recovery
    // is handed to the app as the custom-scheme URL below (see web/README.md).
    expect(
      parsePasswordRecoveryCallback(
        'aracimcepte://auth/reset-password?token_hash=pkce_abc123&type=recovery',
      ),
    ).toEqual({ kind: 'token_hash', tokenHash: 'pkce_abc123' });
    // The bridge refuses non-recovery types, and so does the app.
    expect(
      parsePasswordRecoveryCallback(
        'aracimcepte://auth/reset-password?token_hash=pkce_abc123&type=signup',
      ).kind,
    ).toBe('error');
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
  it('enforces the strength policy, then the confirmation match', () => {
    expect(validateNewPassword('Guv-1a', 'Guv-1a')).toMatch(/8 karakter/);
    expect(validateNewPassword('guvenli123!', 'guvenli123!')).toMatch(/büyük harf/);
    expect(validateNewPassword('Guvenlixx!', 'Guvenlixx!')).toMatch(/rakam/);
    expect(validateNewPassword('Guvenli123', 'Guvenli123')).toMatch(/özel karakter/);
    expect(validateNewPassword('Guvenli-123!', 'Farkli-123!')).toMatch(/eşleşmiyor/);
    expect(validateNewPassword('Guvenli-123!', 'Guvenli-123!')).toBeNull();
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
