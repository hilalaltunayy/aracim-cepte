/* eslint-disable import/first */
import type { ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { authState, linkingState, routerMock } = vi.hoisted(() => ({
  authState: {
    establishRecovery: vi.fn(async () => true),
    updateRecoveredPassword: vi.fn(async () => true),
    busy: false,
    error: null as string | null,
    clearError: vi.fn(),
  },
  linkingState: {
    url: 'aracimcepte://auth/reset-password#access_token=redacted&refresh_token=redacted&type=recovery',
  },
  routerMock: { replace: vi.fn() },
}));

vi.mock('expo-router', () => ({ router: routerMock }));
vi.mock('expo-linking', () => ({
  useURL: () => linkingState.url,
  getInitialURL: vi.fn(async () => linkingState.url),
  createURL: (path: string) => `aracimcepte://${path}`,
  addEventListener: vi.fn(() => ({ remove: vi.fn() })),
}));
vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@/store/authStore', () => ({ useAuthStore: () => authState }));
vi.mock('@/shared/theme', () => {
  const theme = { colors: { navy: 'navy', muted: 'muted' } };
  return {
    spacing: { sm: 8, xl: 24 },
    typography: { body: {}, sectionTitle: {} },
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});
vi.mock('@/shared/components/ui', async () => {
  const React = await import('react');
  const host = (name: string) =>
    function Host({
      children,
      title,
      message,
      ...props
    }: Record<string, unknown> & {
      children?: ReactNode;
      title?: ReactNode;
      message?: ReactNode;
    }) {
      return React.createElement(name, { ...props, title, message }, title ?? message, children);
    };
  return {
    AppButton: host('AppButton'),
    ErrorBanner: host('ErrorBanner'),
    FormSection: host('FormSection'),
    LoadingScreen: host('LoadingScreen'),
    PasswordInput: host('PasswordInput'),
    Screen: host('Screen'),
  };
});

import ResetPasswordScreen from '@/app/auth/reset-password';

async function mount(): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<ResetPasswordScreen />);
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer!;
}

describe('password recovery route', () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
      .IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    authState.establishRecovery.mockReset().mockResolvedValue(true);
    authState.updateRecoveredPassword.mockReset().mockResolvedValue(true);
    authState.clearError.mockClear();
    authState.error = null;
    routerMock.replace.mockClear();
  });

  it('opens the dedicated form and completes new-password plus confirmation flow', async () => {
    const renderer = await mount();
    expect(authState.establishRecovery).toHaveBeenCalledWith(linkingState.url);
    const passwordInputs = renderer.root.findAll(
      (node) => (node.type as unknown) === 'PasswordInput',
    );
    expect(passwordInputs).toHaveLength(2);

    const password = passwordInputs[0]!;
    const confirmation = passwordInputs[1]!;
    await act(async () => {
      password.props.onChangeText('guvenli-123');
      confirmation.props.onChangeText('guvenli-123');
    });
    const submit = renderer.root.find(
      (node) => (node.type as unknown) === 'AppButton' && node.props.title === 'Şifreyi yenile',
    );
    await act(async () => submit.props.onPress());

    expect(authState.updateRecoveredPassword).toHaveBeenCalledWith('guvenli-123');
    expect(JSON.stringify(renderer.toJSON())).toContain('Şifreniz yenilendi');
    const login = renderer.root.find(
      (node) => (node.type as unknown) === 'AppButton' && node.props.title === 'Giriş ekranına dön',
    );
    act(() => login.props.onPress());
    expect(routerMock.replace).toHaveBeenCalledWith('/auth/login');
  });

  it('shows a safe recovery error when the callback cannot establish a session', async () => {
    authState.establishRecovery.mockResolvedValueOnce(false);
    authState.error = 'Şifre yenileme bağlantısının süresi dolmuş.';
    const renderer = await mount();
    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain('süresi dolmuş');
    expect(
      renderer.root.findAll((node) => (node.type as unknown) === 'PasswordInput'),
    ).toHaveLength(0);
  });
});
