import { describe, expect, it, vi } from 'vitest';
import { markHasSignedInBefore, readHasSignedInBefore } from './returningUser';

describe('returning user preference', () => {
  it('stores only a boolean marker and tolerates local storage failure', async () => {
    const storage = {
      getItem: vi.fn(async () => null),
      setItem: vi.fn(async () => undefined),
    };
    expect(await readHasSignedInBefore(storage)).toBe(false);
    await markHasSignedInBefore(storage);
    expect(storage.setItem).toHaveBeenCalledWith('aracim-cepte-has-signed-in-before', 'true');
    expect(JSON.stringify(storage.setItem.mock.calls)).not.toContain('@');
    expect(
      await readHasSignedInBefore({
        getItem: vi.fn(async () => {
          throw new Error('storage');
        }),
        setItem: vi.fn(async () => undefined),
      }),
    ).toBe(false);
  });
});
