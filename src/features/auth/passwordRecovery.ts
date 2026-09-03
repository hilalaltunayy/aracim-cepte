import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { evaluatePasswordPolicy } from '@/shared/utils/passwordPolicy';

export type RecoveryCallback =
  | { kind: 'pkce'; code: string; explicitlyRecovery: boolean }
  | { kind: 'token_hash'; tokenHash: string }
  | { kind: 'implicit'; accessToken: string; refreshToken: string }
  | { kind: 'error'; message: string };

/** Dev-only redacted trace of which recovery branch ran; never receives a token. */
export type RecoveryDiagnostic =
  | { stage: 'parse'; kind: RecoveryCallback['kind']; hasType: boolean }
  | { stage: 'exchange'; kind: 'pkce' | 'token_hash' | 'implicit'; ok: boolean }
  | { stage: 'result'; ok: boolean; recoveryEventSeen: boolean };

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
    // A `type` that is explicitly something other than recovery (e.g. `signup`)
    // is not a password-recovery callback.
    if (type && type !== 'recovery') return { kind: 'error', message: invalidLinkMessage };

    const code = params.get('code');
    if (code) {
      return {
        kind: 'pkce',
        code,
        explicitlyRecovery: type === 'recovery',
      };
    }

    // `token_hash` is the most reliable native flow (direct app open, no browser
    // redirect that can strip query params). Accept it when `type` is recovery
    // or absent — some Supabase email templates omit `type`.
    const tokenHash = params.get('token_hash');
    if (tokenHash) return { kind: 'token_hash', tokenHash };

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
  onDiagnostic?: (diagnostic: RecoveryDiagnostic) => void,
): Promise<RecoverySessionResult> {
  const callback = parsePasswordRecoveryCallback(input);
  onDiagnostic?.({
    stage: 'parse',
    kind: callback.kind,
    hasType: /(?:[?#&]|^)type=/.test(input ?? ''),
  });
  if (callback.kind === 'error') return { session: null, error: callback.message };

  let recoveryEventSeen = false;
  const listener = client.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') recoveryEventSeen = true;
  });

  const finish = (result: RecoverySessionResult): RecoverySessionResult => {
    onDiagnostic?.({ stage: 'result', ok: Boolean(result.session), recoveryEventSeen });
    return result;
  };

  try {
    if (callback.kind === 'pkce') {
      const { data, error } = await client.exchangeCodeForSession(callback.code);
      onDiagnostic?.({ stage: 'exchange', kind: 'pkce', ok: Boolean(data.session && !error) });
      // A successful code exchange on the dedicated reset route is the recovery
      // flow: the code came from the recovery email and the resulting session is
      // only used to call updateUser({password}). The PASSWORD_RECOVERY event and
      // an explicit `type=recovery` param are positive signals but must not be a
      // hard gate — on Android the browser->app redirect can drop `type`, and a
      // cold-start race can deliver the event a tick late.
      return finish(
        error || !data.session
          ? { session: null, error: expiredLinkMessage }
          : { session: data.session, error: null },
      );
    }

    if (callback.kind === 'token_hash') {
      const { data, error } = await client.verifyOtp({
        token_hash: callback.tokenHash,
        type: 'recovery',
      });
      onDiagnostic?.({
        stage: 'exchange',
        kind: 'token_hash',
        ok: Boolean(data.session && !error),
      });
      return finish(
        error || !data.session
          ? { session: null, error: expiredLinkMessage }
          : { session: data.session, error: null },
      );
    }

    const { data, error } = await client.setSession({
      access_token: callback.accessToken,
      refresh_token: callback.refreshToken,
    });
    onDiagnostic?.({ stage: 'exchange', kind: 'implicit', ok: Boolean(data.session && !error) });
    return finish(
      error || !data.session
        ? { session: null, error: expiredLinkMessage }
        : { session: data.session, error: null },
    );
  } catch {
    return finish({ session: null, error: expiredLinkMessage });
  } finally {
    listener.data.subscription.unsubscribe();
  }
}

export function validateNewPassword(password: string, confirmation: string): string | null {
  const policy = evaluatePasswordPolicy(password);
  if (!policy.valid) return policy.message;
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
