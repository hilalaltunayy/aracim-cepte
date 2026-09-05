import { useEffect, useState } from 'react';
import {
  getAuthCallbackState,
  startAuthCallbackCapture,
  subscribeAuthCallback,
} from './authCallbackCapture';

export { authCallbackUrlHasParams } from './authCallbackCapture';

export interface IncomingAuthUrlState {
  /** First URL seen that carries auth-callback params, else the settled bare URL. */
  url: string | null;
  /** True once we have either a param-bearing URL or exhausted the initial lookup. */
  settled: boolean;
}

/**
 * Resolves the deep link that opened (or re-entered) an auth callback screen.
 *
 * The subscription itself lives in {@link startAuthCallbackCapture}, which the
 * root layout starts at app launch — so a link that arrives while the app is
 * already running is buffered even though this screen has not mounted yet. This
 * hook only reads that buffer, which keeps its previous public contract
 * (`{ url, settled }`) exactly as the callback screens already expect.
 *
 * `startAuthCallbackCapture()` is also called here as a safety net for any
 * entry point that renders a callback screen without the root layout.
 */
export function useIncomingAuthCallbackUrl(): IncomingAuthUrlState {
  const [state, setState] = useState(() => {
    startAuthCallbackCapture();
    return getAuthCallbackState();
  });

  useEffect(() => {
    startAuthCallbackCapture();
    const sync = () => setState(getAuthCallbackState());
    const unsubscribe = subscribeAuthCallback(sync);
    // A payload may have landed between the initial render and this effect.
    sync();
    return unsubscribe;
  }, []);

  return { url: state.url, settled: state.settled };
}
