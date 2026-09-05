/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * End-to-end coverage for the exact physical flow: HTTPS bridge -> custom
 * scheme -> cold app launch -> reset-password route -> verifyOtp -> password
 * form -> updateUser -> success -> session cleanup.
 *
 * This is the flow that a stale installed APK (built from the
 * v1.0.0-closed-test-b2 source) showed "Şifre yenileme bağlantısı
 * kullanılamıyor" for, even with a correctly-forwarded token_hash: that old
 * source read the incoming URL with `Linking.useURL()` and cached the
 * *first* render's value (often `null` on a cold start, before the native
 * module resolves the real launch URL) via `processing.current ??= ...`,
 * permanently ignoring the real URL that arrived a tick later. The current
 * source (`useIncomingAuthCallbackUrl`, awaiting `Linking.getInitialURL()`
 * and only latching once real auth params are present) replaces that
 * mechanism entirely. These tests exercise the REAL current source.
 */

const { authMock, linkingMock, routerMock } = vi.hoisted(() => ({
  authMock: {
    verifyOtp: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    setSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
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
    useAuthStore.setState({ busy: false, error: null, session: null, recoveryMode: false });
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

  it('token_hash missing entirely: shows the invalid-link state, never calls verifyOtp', async () => {
    linkingMock.initialUrl = 'aracimcepte://auth/reset-password';
    const renderer = await mount();
    expect(authMock.verifyOtp).not.toHaveBeenCalled();
    const errorBanner = renderer.root.findAll(
      (node) => node.type === 'ErrorBanner' && typeof node.props.message === 'string',
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
      (node) => node.type === 'ErrorBanner' && typeof node.props.message === 'string',
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
