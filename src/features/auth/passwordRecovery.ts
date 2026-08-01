import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export type RecoveryCallback =
  | { kind: 'pkce'; code: string; explicitlyRecovery: boolean }
  | { kind: 'token_hash'; tokenHash: string }
  | { kind: 'implicit'; accessToken: string; refreshToken: string }
  | { kind: 'error'; message: string };

export interface RecoveryAuthClient {
  exchangeCodeForSession: (
    code: string,
  ) => Promise<{ data: { session: Session | null }; error: Error | null }>;
  verifyOtp: (params: {
    token_hash: string;
    type: 'recovery';
  }) => Promise<{ data: { session: Session | null }; error: Error | null }>;
  setSession: (params: {
    access_token: string;
    refresh_token: string;
  }) => Promise<{ data: { session: Session | null }; error: Error | null }>;
  onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    data: { subscription: { unsubscribe: () => void } };
  };
}

export interface RecoverySessionResult {
  session: Session | null;
  error: string | null;
}

const invalidLinkMessage =
  'Şifre yenileme bağlantısı geçersiz veya eksik. Lütfen yeni bir bağlantı isteyin.';
const expiredLinkMessage =
  'Şifre yenileme bağlantısının süresi dolmuş veya bağlantı daha önce kullanılmış. Lütfen yeni bir bağlantı isteyin.';

function paramsFromUrl(input: string): URLSearchParams {
  const url = new URL(input);
  const params = new URLSearchParams(url.search);
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash);
  hashParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  return params;
}

export function parsePasswordRecoveryCallback(input: string | null | undefined): RecoveryCallback {
  if (!input) return { kind: 'error', message: invalidLinkMessage };
  try {
    const params = paramsFromUrl(input);
    const authError = params.get('error_description') ?? params.get('error');
    if (authError) return { kind: 'error', message: expiredLinkMessage };

    const type = params.get('type');
    const code = params.get('code');
    if (code) {
      return {
        kind: 'pkce',
        code,
        explicitlyRecovery: type === 'recovery',
      };
    }

    const tokenHash = params.get('token_hash');
    if (tokenHash && type === 'recovery') return { kind: 'token_hash', tokenHash };

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken && type === 'recovery') {
      return { kind: 'implicit', accessToken, refreshToken };
    }

    return { kind: 'error', message: invalidLinkMessage };
  } catch {
    return { kind: 'error', message: invalidLinkMessage };
  }
}

export async function establishPasswordRecoverySession(
  client: RecoveryAuthClient,
  input: string | null | undefined,
): Promise<RecoverySessionResult> {
  const callback = parsePasswordRecoveryCallback(input);
  if (callback.kind === 'error') return { session: null, error: callback.message };

  let recoveryEventSeen = false;
  const listener = client.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') recoveryEventSeen = true;
  });

  try {
    if (callback.kind === 'pkce') {
      const { data, error } = await client.exchangeCodeForSession(callback.code);
      if (error || !data.session) return { session: null, error: expiredLinkMessage };
      if (!callback.explicitlyRecovery && !recoveryEventSeen) {
        return { session: null, error: invalidLinkMessage };
      }
      return { session: data.session, error: null };
    }

    if (callback.kind === 'token_hash') {
      const { data, error } = await client.verifyOtp({
        token_hash: callback.tokenHash,
        type: 'recovery',
      });
      return error || !data.session
        ? { session: null, error: expiredLinkMessage }
        : { session: data.session, error: null };
    }

    const { data, error } = await client.setSession({
      access_token: callback.accessToken,
      refresh_token: callback.refreshToken,
    });
    return error || !data.session
      ? { session: null, error: expiredLinkMessage }
      : { session: data.session, error: null };
  } catch {
    return { session: null, error: expiredLinkMessage };
  } finally {
    listener.data.subscription.unsubscribe();
  }
}

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < 8) return 'Yeni şifre en az 8 karakter olmalıdır.';
  if (password.length > 72) return 'Yeni şifre en fazla 72 karakter olabilir.';
  if (password !== confirmation) return 'Şifreler eşleşmiyor.';
  return null;
}

export function buildRecoveryRedirectUrl(options: {
  platform: 'web' | 'native';
  webOrigin?: string;
  nativeUrl?: string;
}): string {
  if (options.platform === 'web') {
    if (!options.webOrigin) throw new Error('Web origin is required.');
    return new URL('/auth/reset-password', options.webOrigin).toString();
  }
  if (!options.nativeUrl) throw new Error('Native redirect URL is required.');
  return options.nativeUrl;
}
