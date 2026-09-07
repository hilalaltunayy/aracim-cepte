/* eslint-disable import/first */
import { act, create } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({}));

import { useSingleFlight } from './useSingleFlight';

/** Exposes the hook's runner so a test can fire it twice in the same tick. */
function Harness({ onReady }: { onReady: (run: (a: () => Promise<void>) => Promise<void>) => void }) {
  onReady(useSingleFlight());
  return null;
}

describe('useSingleFlight', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('runs one action for a double tap that lands before the first re-render', async () => {
    let run!: (action: () => Promise<void>) => Promise<void>;
    await act(async () => {
      create(<Harness onReady={(value) => (run = value)} />);
    });

    let started = 0;
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => (release = resolve));
    const action = async () => {
      started += 1;
      await blocked;
    };

    // Both taps happen while the first action is still in flight — exactly the
    // window where a `useState` busy flag has not been applied yet.
    const first = run(action);
    const second = run(action);
    expect(started).toBe(1);

    release();
    await act(async () => {
      await Promise.all([first, second]);
    });
    expect(started).toBe(1);
  });

  it('allows the next action once the previous one settles, including on failure', async () => {
    let run!: (action: () => Promise<void>) => Promise<void>;
    await act(async () => {
      create(<Harness onReady={(value) => (run = value)} />);
    });

    let started = 0;
    await act(async () => {
      await run(async () => {
        started += 1;
        throw new Error('boom');
      }).catch(() => undefined);
    });
    await act(async () => {
      await run(async () => {
        started += 1;
      });
    });
    expect(started).toBe(2);
  });
});
