/**
 * Structural-only trace for the password-recovery deep-link chain.
 *
 * Everything here is deliberately shape-only: booleans, stage names and the
 * `type` param (which is always a fixed keyword such as `recovery`). It never
 * carries token_hash, code, access/refresh tokens, the email, the password or
 * the full incoming URL — so it is safe to read off a physical device.
 */
export type AuthCallbackDeliverySource = 'initialURL' | 'urlEvent' | 'route';

export interface RecoveryTraceEvent {
  stage: 'capture' | 'route' | 'parse' | 'verify' | 'result';
  source?: AuthCallbackDeliverySource;
  hasInitialUrl?: boolean;
  receivedUrlHasTokenHash?: boolean;
  receivedUrlHasCode?: boolean;
  /** Fixed keyword only (`recovery`, `signup`, …), never a secret. */
  receivedType?: string | null;
  routeMounted?: boolean;
  callbackAccepted?: boolean;
  verifyOtpAttempted?: boolean;
  verifyOtpSucceeded?: boolean;
  duplicateSuppressed?: boolean;
  recoveryEventSeen?: boolean;
}

/** Shape of an incoming callback URL, with no part of the URL itself. */
export interface AuthCallbackUrlShape {
  receivedUrlHasTokenHash: boolean;
  receivedUrlHasCode: boolean;
  receivedType: string | null;
}

const SAFE_TYPE = /^[a-z_]{1,32}$/i;

/** Reads only the structural facts we are allowed to log out of a callback URL. */
export function describeAuthCallbackUrl(url: string | null | undefined): AuthCallbackUrlShape {
  const empty: AuthCallbackUrlShape = {
    receivedUrlHasTokenHash: false,
    receivedUrlHasCode: false,
    receivedType: null,
  };
  if (!url) return empty;
  try {
    const parsed = new URL(url);
    const search = new URLSearchParams(parsed.search);
    const hash = new URLSearchParams(
      parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash,
    );
    const read = (key: string) => search.get(key) ?? hash.get(key);
    const type = read('type');
    return {
      receivedUrlHasTokenHash: Boolean(read('token_hash')),
      receivedUrlHasCode: Boolean(read('code')),
      // Guard against echoing anything unexpected back into the log.
      receivedType: type && SAFE_TYPE.test(type) ? type : type ? 'unexpected' : null,
    };
  } catch {
    return empty;
  }
}

export const RECOVERY_TRACE_PREFIX = '[auth:recovery:trace]';

/** Dev-only. Production builds log nothing at all from the recovery chain. */
export function logRecoveryTrace(event: RecoveryTraceEvent): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.warn(RECOVERY_TRACE_PREFIX, event);
}
