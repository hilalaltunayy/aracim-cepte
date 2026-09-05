import * as Linking from 'expo-linking';
import {
  describeAuthCallbackUrl,
  logRecoveryTrace,
  type AuthCallbackDeliverySource,
} from './recoveryTrace';

/**
 * Auth-callback params we can act on. A deep link without any of these is a bare
 * launch/return and must not be treated as a used or invalid recovery link.
 */
const CALLBACK_PARAM_KEYS = [
  'code',
  'token_hash',
  'access_token',
  'refresh_token',
  'error',
  'error_description',
  'error_code',
] as const;

export function authCallbackUrlHasParams(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const search = new URLSearchParams(parsed.search);
    const hash = new URLSearchParams(
      parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash,
    );
    return CALLBACK_PARAM_KEYS.some((key) => Boolean(search.get(key) || hash.get(key)));
  } catch {
    return false;
  }
}

export interface AuthCallbackCaptureState {
  /** First URL seen that carries auth-callback params, else the settled bare URL. */
  url: string | null;
  /** True once we have either a param-bearing URL or exhausted the initial lookup. */
  settled: boolean;
  source: AuthCallbackDeliverySource | null;
}

const EMPTY: AuthCallbackCaptureState = { url: null, settled: false, source: null };

let state: AuthCallbackCaptureState = EMPTY;
let started = false;
let subscription: { remove: () => void } | null = null;
const listeners = new Set<() => void>();

function publish(next: AuthCallbackCaptureState): void {
  state = next;
  for (const listener of [...listeners]) listener();
}

function accept(
  candidate: string | null,
  source: AuthCallbackDeliverySource,
  settle: boolean,
): void {
  const shape = describeAuthCallbackUrl(candidate);
  const hasParams = authCallbackUrlHasParams(candidate);
  const alreadyBuffered = authCallbackUrlHasParams(state.url);
  // The SAME link delivered twice — typically getInitialURL resolving with the
  // intent the url event already reported — must not re-arm the screen, so the
  // token is never verified twice. A genuinely different callback (e.g. a
  // confirmation link earlier in the session, then a recovery link) still
  // replaces the buffer: it is a new intent the user just acted on.
  if (candidate && state.url === candidate) {
    logRecoveryTrace({
      stage: 'capture',
      source,
      hasInitialUrl: true,
      ...shape,
      callbackAccepted: false,
      duplicateSuppressed: true,
    });
    return;
  }
  if (hasParams && candidate) {
    logRecoveryTrace({
      stage: 'capture',
      source,
      hasInitialUrl: true,
      ...shape,
      callbackAccepted: true,
      duplicateSuppressed: false,
    });
    publish({ url: candidate, settled: true, source });
    return;
  }
  logRecoveryTrace({
    stage: 'capture',
    source,
    hasInitialUrl: Boolean(candidate),
    ...shape,
    callbackAccepted: false,
    duplicateSuppressed: false,
  });
  if (settle && !state.settled) {
    // A bare or absent launch URL must never clobber a real payload that a
    // url event already buffered (the warm-start ordering).
    publish(
      alreadyBuffered
        ? { url: state.url, settled: true, source: state.source }
        : { url: candidate ?? state.url, settled: true, source },
    );
  }
}

/**
 * Starts listening for auth deep links at APP LAUNCH, not at route mount.
 *
 * This is the fix for the physical password-reset failure. Capture used to live
 * inside the callback screen's own `useEffect`, so it only began once that route
 * had mounted. When the app is already running (or backgrounded) and the user
 * taps the recovery link, Android delivers the intent as a `url` event
 * immediately; Expo Router only then navigates to `/auth/reset-password`. The
 * event therefore fired with ZERO subscribers and was gone for good, and
 * `Linking.getInitialURL()` could not recover it because on a warm start it
 * still reflects the intent that originally launched the app. The screen landed
 * in `{ url: null, settled: true }`, never called `establishRecovery` (hence no
 * `/verify` request ever reaching Supabase) and rendered its "link unusable"
 * fallback. Starting capture here means the listener is always live before any
 * route can mount, and the payload is buffered until the screen consumes it.
 *
 * Idempotent: safe to call more than once.
 */
export function startAuthCallbackCapture(): void {
  if (started) return;
  started = true;
  subscription = Linking.addEventListener('url', (event) =>
    accept(event.url, 'urlEvent', false),
  );
  void Linking.getInitialURL()
    .then((initial) => accept(initial ?? null, 'initialURL', true))
    .catch(() => accept(null, 'initialURL', true));
}

export function getAuthCallbackState(): AuthCallbackCaptureState {
  return state;
}

export function subscribeAuthCallback(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only: clears the in-memory buffer and listener registration. */
export function resetAuthCallbackCaptureForTests(): void {
  subscription?.remove();
  subscription = null;
  started = false;
  listeners.clear();
  state = EMPTY;
}
