/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * End-to-end coverage for the exact physical flow: HTTPS bridge -> custom
 * scheme -> app -> reset-password route -> verifyOtp -> password form ->
 * updateUser -> success -> session cleanup, in BOTH cold and warm start.
 *
 * Proven production failure: URL capture used to start only when this route
 * mounted, so a link tapped while the app was already running was delivered as
 * a `url` event with no subscriber and lost for good — the screen settled at
 * `{ url: null, settled: true }`, never called establishRecovery (so Supabase
 * saw /recover but never /verify) and rendered its "link unusable" fallback.
 * The WARM START case below fails against that implementation and passes with
 * launch-time capture (see authCallbackCapture.ts).
 */

const { authMock, linkingMock, routerMock } = vi.hoisted(() => ({
  authMock: {
    verifyOtp: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    setSession: vi.fn(),
    onAuthStateChange: vi.fn(
      (_callback: (event: string, session: unknown) => void) => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    ),
    updateUser: vi.fn(),
    signOut: vi.fn(async () => ({ error: null })),
    getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
  },
  linkingMock: {
    initialUrl: null as string | null,
    urlListener: null as null | ((event: { url: string }) => void),
  },
  routerMock: { replace: vi.fn() },
}));

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('expo-router', () => ({ router: routerMock }));
vi.mock('expo-linking', () => ({
  getInitialURL: () => Promise.resolve(linkingMock.initialUrl),
  addEventListener: (_event: string, callback: (event: { url: string }) => void) => {
    linkingMock.urlListener = callback;
    return { remove: vi.fn() };
  },
}));
vi.mock('@/data/supabase/client', () => ({
  isSupabaseConfigured: true,
  getSupabaseClient: () => ({ auth: authMock }),
}));
vi.mock('@/features/auth/recoveryRedirect', () => ({
  getEmailConfirmationRedirectUrl: () => 'aracimcepte://auth/confirm-email',
  getPasswordRecoveryRedirectUrl: () => 'aracimcepte://auth/reset-password',
}));
vi.mock('@/features/auth/returningUser', () => ({
  markHasSignedInBefore: vi.fn(async () => undefined),
  readHasSignedInBefore: vi.fn(async () => false),
}));
vi.mock('@/shared/theme', () => ({
  spacing: new Proxy({}, { get: () => 8 }),
  typography: new Proxy({}, { get: () => ({}) }),
  useThemedStyles: (factory: (theme: unknown) => unknown) =>
    factory({ colors: new Proxy({}, { get: (_t, key) => String(key) }) }),
}));
vi.mock('@/shared/components/ui', () => ({
  AppButton: 'AppButton',
  ErrorBanner: 'ErrorBanner',
  FormSection: 'FormSection',
  LoadingScreen: 'LoadingScreen',
  PasswordInput: 'PasswordInput',
  Screen: 'Screen',
}));

import { useAuthStore } from '@/store/authStore';
import {
  getAuthCallbackState,
  resetAuthCallbackCaptureForTests,
  startAuthCallbackCapture,
} from '@/features/auth/authCallbackCapture';
import ResetPasswordScreen from '@/app/auth/reset-password';

const REAL_TOKEN_URL = 'aracimcepte://auth/reset-password?token_hash=real-recovery-token&type=recovery';
const session = {
  access_token: 'redacted-access',
  refresh_token: 'redacted-refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: 'recovery-user' },
};

function findByLabel(renderer: ReactTestRenderer, label: string) {
  return renderer.root.findByProps({ label });
}

function findByTitle(renderer: ReactTestRenderer, title: string) {
  return renderer.root.findAllByProps({ title }).find((node) => typeof node.type === 'string')!;
}

async function mount(): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(React.createElement(ResetPasswordScreen));
  });
  return renderer!;
}

describe('password recovery route: HTTPS bridge -> app -> new password', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    authMock.verifyOtp.mockReset();
    authMock.exchangeCodeForSession.mockReset();
    authMock.setSession.mockReset();
    authMock.updateUser.mockReset();
    authMock.signOut.mockClear().mockResolvedValue({ error: null });
    authMock.onAuthStateChange.mockClear().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    routerMock.replace.mockClear();
    linkingMock.initialUrl = null;
    linkingMock.urlListener = null;
    resetAuthCallbackCaptureForTests();
    useAuthStore.setState({ busy: false, error: null, session: null, recoveryMode: false });
  });

  it('WARM START: a url event that lands BEFORE the route mounts still verifies once and shows the form', async () => {
    // The proven production failure. The app is already running, so Android
    // delivers the recovery link as a `url` event and Expo Router only then
    // navigates to this screen. Capture now runs from app launch, so the
    // payload is buffered and the screen consumes it on mount instead of
    // rendering the "link unusable" fallback with no /verify ever sent.
    startAuthCallbackCapture();
    linkingMock.urlListener?.({ url: REAL_TOKEN_URL });
    authMock.verifyOtp.mockResolvedValueOnce({ data: { session }, error: null });

    const renderer = await mount();

    expect(authMock.verifyOtp).toHaveBeenCalledTimes(1);
    expect(authMock.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'real-recovery-token',
      type: 'recovery',
    });
    expect(findByLabel(renderer, 'Yeni şifre')).toBeDefined();
    expect(
      renderer.root.findAll((node) => String(node.type) === 'ErrorBanner'),
    ).toHaveLength(0);
  });

  it('expired link then a FRESH link while the screen stays mounted: the new token is verified', async () => {
    // The tester never leaves this screen between attempts, so the second link
    // arrives on a mounted route. A plain "already processed" flag would drop
    // it and leave the stale error on screen.
    const expiredUrl = 'aracimcepte://auth/reset-password?token_hash=expired-token&type=recovery';
    startAuthCallbackCapture();
    linkingMock.urlListener?.({ url: expiredUrl });
    authMock.verifyOtp.mockResolvedValueOnce({
      data: { session: null },
      error: new Error('expired'),
    });
    const renderer = await mount();
    expect(authMock.verifyOtp).toHaveBeenCalledTimes(1);

    authMock.verifyOtp.mockResolvedValueOnce({ data: { session }, error: null });
    await act(async () => linkingMock.urlListener?.({ url: REAL_TOKEN_URL }));

    expect(authMock.verifyOtp).toHaveBeenCalledTimes(2);
    expect(authMock.verifyOtp).toHaveBeenLastCalledWith({
      token_hash: 'real-recovery-token',
      type: 'recovery',
    });
    expect(findByLabel(renderer, 'Yeni şifre')).toBeDefined();
  });

  it('a spent token is dropped from the buffer, so a remount cannot resubmit it', async () => {
    linkingMock.initialUrl = REAL_TOKEN_URL;
    authMock.verifyOtp.mockResolvedValueOnce({ data: { session }, error: null });
    await mount();
    expect(authMock.verifyOtp).toHaveBeenCalledTimes(1);
    expect(getAuthCallbackState().url).toBeNull();

    // Navigating away and back must not re-verify the consumed token.
    useAuthStore.setState({ recoveryMode: false, session: null });
    await mount();
    expect(authMock.verifyOtp).toHaveBeenCalledTimes(1);
  });

  it('a confirmation callback is never consumed by the recovery screen', async () => {
    // A PKCE confirmation link is `?code=`, exactly the shape this screen's
    // parser would otherwise try to exchange.
    startAuthCallbackCapture();
    linkingMock.urlListener?.({ url: 'aracimcepte://auth/confirm-email?code=signup-code' });

    await mount();

    expect(authMock.verifyOtp).not.toHaveBeenCalled();
    expect(authMock.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('confirmation first, then recovery in the same process: recovery still works', async () => {
    startAuthCallbackCapture();
    linkingMock.urlListener?.({ url: 'aracimcepte://auth/confirm-email?code=signup-code' });
    linkingMock.urlListener?.({ url: REAL_TOKEN_URL });
    authMock.verifyOtp.mockResolvedValueOnce({ data: { session }, error: null });

    const renderer = await mount();

    expect(authMock.verifyOtp).toHaveBeenCalledTimes(1);
    expect(findByLabel(renderer, 'Yeni şifre')).toBeDefined();
  });

  it('route already mounted when the url event arrives: consumes it and verifies exactly once', async () => {
    // App open on the reset screen with nothing to verify yet.
    const renderer = await mount();
    expect(authMock.verifyOtp).not.toHaveBeenCalled();

    authMock.verifyOtp.mockResolvedValueOnce({ data: { session }, error: null });
    await act(async () => linkingMock.urlListener?.({ url: REAL_TOKEN_URL }));

    expect(authMock.verifyOtp).toHaveBeenCalledTimes(1);
    expect(findByLabel(renderer, 'Yeni şifre')).toBeDefined();
  });

  it('valid token_hash + type=recovery: verifyOtp once, form appears, updateUser, success, session cleaned up', async () => {
    linkingMock.initialUrl = REAL_TOKEN_URL;
    authMock.verifyOtp.mockResolvedValueOnce({ data: { session }, error: null });

    const renderer = await mount();
    // Route received the payload and verified it exactly once, with recovery.
    expect(authMock.verifyOtp).toHaveBeenCalledTimes(1);
    expect(authMock.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'real-recovery-token',
      type: 'recovery',
    });
    // The invalid-link state must not be showing, and the form must be visible.
    expect(renderer.root.findAllByProps({ message: expect.stringContaining('kullanılamıyor') }))
      .toHaveLength(0);
    expect(findByLabel(renderer, 'Yeni şifre')).toBeDefined();
    expect(findByLabel(renderer, 'Yeni şifre tekrar')).toBeDefined();

    act(() => findByLabel(renderer, 'Yeni şifre').props.onChangeText('Guvenli-123!'));
    act(() => findByLabel(renderer, 'Yeni şifre tekrar').props.onChangeText('Guvenli-123!'));

    authMock.updateUser.mockResolvedValueOnce({ data: { user: session.user }, error: null });
    await act(async () => findByTitle(renderer, 'Şifreyi yenile').props.onPress());

    expect(authMock.updateUser).toHaveBeenCalledWith({ password: 'Guvenli-123!' });
    expect(authMock.signOut).toHaveBeenCalledWith({ scope: 'global' });
    expect(
      renderer.root.findAll(
        (node) =>
          typeof node.props.children === 'string' &&
          node.props.children.includes('Şifreniz yenilendi. Yeni şifrenizle giriş yapabilirsiniz.'),
      ),
    ).not.toHaveLength(0);
    expect(useAuthStore.getState().recoveryMode).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('shows the requirement helper text exactly as specified', async () => {
    linkingMock.initialUrl = REAL_TOKEN_URL;
    authMock.verifyOtp.mockResolvedValueOnce({ data: { session }, error: null });
    const renderer = await mount();

    expect(
      renderer.root.findAll(
        (node) =>
          typeof node.props.children === 'string' &&
          node.props.children ===
            'Şifre en az 8 karakter olmalıdır ve içerisinde en az bir büyük harf, bir rakam ve bir özel karakter bulunmalıdır.',
      ),
    ).toHaveLength(1);
  });

  it('same-as-old-password backend error shows the exact required Turkish message, not a policy error', async () => {
    linkingMock.initialUrl = REAL_TOKEN_URL;
    authMock.verifyOtp.mockResolvedValueOnce({ data: { session }, error: null });
    const renderer = await mount();

    act(() => findByLabel(renderer, 'Yeni şifre').props.onChangeText('Guvenli-123!'));
    act(() => findByLabel(renderer, 'Yeni şifre tekrar').props.onChangeText('Guvenli-123!'));

    authMock.updateUser.mockResolvedValueOnce({
      data: { user: null },
      error: Object.assign(new Error('New password should be different from the old password.'), {
        code: 'same_password',
      }),
    });
    await act(async () => findByTitle(renderer, 'Şifreyi yenile').props.onPress());

    // Never let the raw backend/updateUser call fail silently into commit.
    expect(authMock.signOut).not.toHaveBeenCalled();
    const errorBanner = renderer.root.findAll(
      (node) => String(node.type) === 'ErrorBanner' && typeof node.props.message === 'string',
    )[0];
    expect(errorBanner.props.message).toBe('Yeni belirleyeceğiniz şifre eski şifrenizle aynı olamaz.');
    expect(errorBanner.props.message).not.toContain('New password should be');
  });

  it('token_hash missing entirely: shows the invalid-link state, never calls verifyOtp', async () => {
    linkingMock.initialUrl = 'aracimcepte://auth/reset-password';
    const renderer = await mount();
    expect(authMock.verifyOtp).not.toHaveBeenCalled();
    const errorBanner = renderer.root.findAll(
      (node) => String(node.type) === 'ErrorBanner' && typeof node.props.message === 'string',
    )[0];
    expect(errorBanner).toBeDefined();
    expect(errorBanner.props.message).toMatch(/geçersiz|eksik|kullanılamıyor/);
    expect(renderer.root.findAllByProps({ label: 'Yeni şifre' })).toHaveLength(0);
  });

  it('type != recovery: rejected before calling verifyOtp', async () => {
    linkingMock.initialUrl =
      'aracimcepte://auth/reset-password?token_hash=real-recovery-token&type=signup';
    const renderer = await mount();
    expect(authMock.verifyOtp).not.toHaveBeenCalled();
    expect(renderer.root.findAllByProps({ label: 'Yeni şifre' })).toHaveLength(0);
  });

  it('verifyOtp failure (expired/used token): safe Turkish error, no raw provider message', async () => {
    linkingMock.initialUrl = REAL_TOKEN_URL;
    authMock.verifyOtp.mockResolvedValueOnce({
      data: { session: null },
      error: new Error('Token has expired or is invalid'),
    });
    const renderer = await mount();
    const errorBanner = renderer.root.findAll(
      (node) => String(node.type) === 'ErrorBanner' && typeof node.props.message === 'string',
    )[0];
    expect(errorBanner.props.message).toMatch(/süresi dolmuş|kullanılmış/);
    expect(errorBanner.props.message).not.toContain('Token has expired');
  });

  it('duplicate incoming URL delivery (warm-start event fires again): verifyOtp still called only once', async () => {
    linkingMock.initialUrl = REAL_TOKEN_URL;
    authMock.verifyOtp.mockResolvedValue({ data: { session }, error: null });
    await mount();
    expect(authMock.verifyOtp).toHaveBeenCalledTimes(1);
    // A second delivery of the exact same URL over the 'url' event listener.
    await act(async () => linkingMock.urlListener?.({ url: REAL_TOKEN_URL }));
    expect(authMock.verifyOtp).toHaveBeenCalledTimes(1);
  });

  it('a delayed PASSWORD_RECOVERY event still unlocks the form via the global auth listener', async () => {
    // establishRecovery resolves false (e.g. a transient hiccup), but the
    // global onAuthStateChange listener (wired by initialize(), same as the
    // app root) later reports PASSWORD_RECOVERY — recoveryMode must win.
    // establishPasswordRecoverySession registers its OWN short-lived listener
    // too (for a redacted diagnostic only, unsubscribed immediately after),
    // so every registration is captured and the first (initialize()'s,
    // global, long-lived) one is the one that actually flips the store.
    linkingMock.initialUrl = REAL_TOKEN_URL;
    authMock.verifyOtp.mockResolvedValueOnce({
      data: { session: null },
      error: new Error('temporary'),
    });
    const registered: ((event: string, session: unknown) => void)[] = [];
    authMock.onAuthStateChange.mockImplementation((callback) => {
      registered.push(callback);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    await act(async () => {
      await useAuthStore.getState().initialize();
    });

    const renderer = await mount();
    expect(useAuthStore.getState().recoveryMode).toBe(false);
    expect(registered.length).toBeGreaterThanOrEqual(2);

    await act(async () => registered[0]?.('PASSWORD_RECOVERY', session));
    expect(useAuthStore.getState().recoveryMode).toBe(true);
    expect(findByLabel(renderer, 'Yeni şifre')).toBeDefined();
  });

  it('never logs the token anywhere reachable from the recovery flow', async () => {
    const originalWarn = console.warn;
    const logs: unknown[][] = [];
    console.warn = (...args: unknown[]) => logs.push(args);
    try {
      linkingMock.initialUrl = REAL_TOKEN_URL;
      authMock.verifyOtp.mockResolvedValueOnce({ data: { session }, error: null });
      await mount();
    } finally {
      console.warn = originalWarn;
    }
    const blob = JSON.stringify(logs);
    expect(blob.includes('real-recovery-token')).toBe(false);
  });
});
