import { useRef } from 'react';

/**
 * Runs an async action at most once at a time.
 *
 * A `useState` busy flag cannot protect a quota reservation: the state update is
 * asynchronous, so a second tap that lands before the first re-render still sees
 * `busy === false` and reserves a second slot. This flips a ref synchronously,
 * inside the same tick as the tap, so a double tap consumes one reservation.
 */
export function useSingleFlight() {
  const inFlight = useRef(false);

  return async function run(action: () => Promise<void>): Promise<void> {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await action();
    } finally {
      inFlight.current = false;
    }
  };
}
