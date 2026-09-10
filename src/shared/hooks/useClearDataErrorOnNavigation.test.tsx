/* eslint-disable import/first */
import { act, create } from 'react-test-renderer';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const clearError = vi.fn();
let focusEffect: (() => undefined | (() => void)) | null = null;

vi.mock('react-native', () => ({}));
vi.mock('expo-router', () => ({
  // Mirrors React Navigation: run the effect on focus, keep its cleanup for blur.
  useFocusEffect: (callback: () => undefined | (() => void)) => {
    focusEffect = callback;
  },
}));
vi.mock('@/store/dataStore', () => ({
  useDataStore: (selector: (state: { clearError: () => void }) => unknown) =>
    selector({ clearError }),
}));

import { useClearDataErrorOnNavigation } from './useClearDataErrorOnNavigation';

function Harness() {
  useClearDataErrorOnNavigation();
  return null;
}

describe('useClearDataErrorOnNavigation', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    clearError.mockClear();
    focusEffect = null;
  });

  it('clears the data store error on focus and again on leave', async () => {
    await act(async () => {
      create(<Harness />);
    });

    // Entering the screen: never inherit another screen's stale error.
    const cleanup = focusEffect?.();
    expect(clearError).toHaveBeenCalledTimes(1);

    // Leaving the screen: do not carry this screen's error out to Settings.
    cleanup?.();
    expect(clearError).toHaveBeenCalledTimes(2);
  });
});
