/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { linking } = vi.hoisted(() => ({
  linking: {
    initialUrl: null as string | null,
    listener: null as null | ((event: { url: string }) => void),
    removed: 0,
    subscribeCount: 0,
  },
}));

vi.mock('expo-linking', () => ({
  getInitialURL: () => Promise.resolve(linking.initialUrl),
  addEventListener: (_event: string, callback: (event: { url: string }) => void) => {
    linking.subscribeCount += 1;
    linking.listener = callback;
    return { remove: () => (linking.removed += 1) };
  },
}));

import {
  authCallbackUrlHasParams,
  getAuthCallbackState,
  resetAuthCallbackCaptureForTests,
  startAuthCallbackCapture,
  subscribeAuthCallback,
} from './authCallbackCapture';

const RECOVERY_URL =
  'aracimcepte://auth/reset-password?token_hash=real-recovery-token&type=recovery';

describe('auth callback capture (app-launch buffering)', () => {
  beforeEach(() => {
    resetAuthCallbackCaptureForTests();
    linking.initialUrl = null;
    linking.listener = null;
    linking.removed = 0;
    linking.subscribeCount = 0;
  });

  it('COLD START: latches the launch URL from getInitialURL', async () => {
    linking.initialUrl = RECOVERY_URL;
    startAuthCallbackCapture();
    await vi.waitFor(() => expect(getAuthCallbackState().url).toBe(RECOVERY_URL));
    expect(getAuthCallbackState()).toEqual({
      url: RECOVERY_URL,
      settled: true,
      source: 'initialURL',
    });
  });

  it('WARM START: buffers a url event that arrives BEFORE any screen mounts', async () => {
    // This is the exact production failure: the app is already running, the
    // link is delivered as a `url` event, and no callback screen exists yet.
    startAuthCallbackCapture();
    linking.listener?.({ url: RECOVERY_URL });
    expect(getAuthCallbackState().url).toBe(RECOVERY_URL);
    expect(getAuthCallbackState().source).toBe('urlEvent');

    // A later getInitialURL resolving null (warm start reflects the ORIGINAL
    // launch intent) must not wipe the buffered payload.
    await vi.waitFor(() => expect(getAuthCallbackState().settled).toBe(true));
    expect(getAuthCallbackState().url).toBe(RECOVERY_URL);
  });

  it('notifies subscribers that mount after the payload already arrived', async () => {
    startAuthCallbackCapture();
    linking.listener?.({ url: RECOVERY_URL });
    // A screen mounting later reads the buffer directly — nothing is lost.
    expect(getAuthCallbackState().url).toBe(RECOVERY_URL);

    const seen: string[] = [];
    const unsubscribe = subscribeAuthCallback(() => seen.push(getAuthCallbackState().url ?? ''));
    linking.listener?.({ url: RECOVERY_URL });
    // Duplicate delivery must not re-notify with a fresh payload.
    expect(seen).toHaveLength(0);
    unsubscribe();
  });

  it('suppresses re-delivery of the SAME link so the token is never verified twice', async () => {
    linking.initialUrl = RECOVERY_URL;
    startAuthCallbackCapture();
    await vi.waitFor(() => expect(getAuthCallbackState().url).toBe(RECOVERY_URL));
    const notified: number[] = [];
    const unsubscribe = subscribeAuthCallback(() => notified.push(1));

    linking.listener?.({ url: RECOVERY_URL });

    expect(notified).toHaveLength(0);
    expect(getAuthCallbackState().url).toBe(RECOVERY_URL);
    unsubscribe();
  });

  it('a genuinely different callback later in the same session replaces the buffer', async () => {
    // Confirmation link first, then the user asks for a password reset without
    // ever killing the app: the recovery link must not be swallowed.
    linking.initialUrl = 'aracimcepte://auth/confirm-email#access_token=a&refresh_token=r';
    startAuthCallbackCapture();
    await vi.waitFor(() => expect(getAuthCallbackState().settled).toBe(true));

    linking.listener?.({ url: RECOVERY_URL });

    expect(getAuthCallbackState().url).toBe(RECOVERY_URL);
    expect(getAuthCallbackState().source).toBe('urlEvent');
  });

  it('settles without a URL when the app was launched normally', async () => {
    startAuthCallbackCapture();
    await vi.waitFor(() => expect(getAuthCallbackState().settled).toBe(true));
    expect(getAuthCallbackState().url).toBeNull();
  });

  it('a bare launch URL never masks a real callback that arrives afterwards', async () => {
    linking.initialUrl = 'aracimcepte://auth/reset-password';
    startAuthCallbackCapture();
    await vi.waitFor(() => expect(getAuthCallbackState().settled).toBe(true));
    linking.listener?.({ url: RECOVERY_URL });
    expect(getAuthCallbackState().url).toBe(RECOVERY_URL);
  });

  it('subscribes exactly once no matter how many screens ask for capture', () => {
    startAuthCallbackCapture();
    startAuthCallbackCapture();
    startAuthCallbackCapture();
    expect(linking.subscribeCount).toBe(1);
  });

  it('recognises every callback param shape, and rejects bare or malformed links', () => {
    expect(authCallbackUrlHasParams(RECOVERY_URL)).toBe(true);
    expect(authCallbackUrlHasParams('aracimcepte://auth/reset-password?code=abc')).toBe(true);
    expect(
      authCallbackUrlHasParams('aracimcepte://auth/confirm-email#access_token=a&refresh_token=r'),
    ).toBe(true);
    expect(authCallbackUrlHasParams('aracimcepte://auth/reset-password?error=access_denied')).toBe(
      true,
    );
    expect(authCallbackUrlHasParams('aracimcepte://auth/reset-password')).toBe(false);
    expect(authCallbackUrlHasParams('not-a-url')).toBe(false);
    expect(authCallbackUrlHasParams(null)).toBe(false);
  });
});
