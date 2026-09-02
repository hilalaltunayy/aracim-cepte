import { useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';

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

export interface IncomingAuthUrlState {
  /** First URL seen that carries auth-callback params, else the settled bare URL. */
  url: string | null;
  /** True once we have either a param-bearing URL or exhausted the initial lookup. */
  settled: boolean;
}

/**
 * Resolves the deep link that opened (or re-entered) an auth callback screen.
 *
 * Covers every Android delivery path that the previous single-shot
 * `Linking.getInitialURL()` read missed:
 *  - cold start -> `Linking.getInitialURL()`
 *  - warm start -> `Linking.addEventListener('url')`
 *
 * A param-bearing URL always wins and is latched; a bare URL only settles the
 * state so the screen can show its "request a new link" fallback. All state
 * updates happen inside async or event callbacks, never synchronously in render.
 */
export function useIncomingAuthCallbackUrl(): IncomingAuthUrlState {
  const [state, setState] = useState<IncomingAuthUrlState>({ url: null, settled: false });
  const latched = useRef(false);

  useEffect(() => {
    let active = true;

    const accept = (candidate: string | null, settle: boolean) => {
      if (!active || latched.current) return;
      if (candidate && authCallbackUrlHasParams(candidate)) {
        latched.current = true;
        setState({ url: candidate, settled: true });
        return;
      }
      if (settle) {
        setState((prev) => (prev.settled ? prev : { url: candidate ?? prev.url, settled: true }));
      }
    };

    const subscription = Linking.addEventListener('url', (event) => accept(event.url, false));
    void Linking.getInitialURL().then((initial) => accept(initial ?? null, true));

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return state;
}
