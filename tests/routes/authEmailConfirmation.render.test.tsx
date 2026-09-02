/* eslint-disable import/first */
import type { ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { linkingState, routerMock } = vi.hoisted(() => ({
  linkingState: { url: null as string | null },
  routerMock: { replace: vi.fn() },
}));

vi.mock('expo-router', () => ({ router: routerMock }));
vi.mock('expo-linking', () => ({
  useURL: () => linkingState.url,
  getInitialURL: vi.fn(async () => linkingState.url),
  addEventListener: vi.fn(() => ({ remove: vi.fn() })),
}));
vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
}));
vi.mock('@/shared/theme', () => {
  const theme = { colors: { textSecondary: 'textSecondary' } };
  return {
    spacing: { xl: 24 },
    typography: { body: {} },
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
    Screen: host('Screen'),
  };
});

import ConfirmEmailScreen from '@/app/auth/confirm-email';

async function mount(): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<ConfirmEmailScreen />);
    await Promise.resolve();
  });
  return renderer!;
}

describe('email confirmation route', () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
      .IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    routerMock.replace.mockClear();
  });

  it('renders the verified state and returns to login', async () => {
    linkingState.url =
      'aracimcepte://auth/confirm-email#access_token=redacted&refresh_token=redacted&type=signup';
    const renderer = await mount();
    expect(JSON.stringify(renderer.toJSON())).toContain('E-posta adresiniz doğrulandı');
    const login = renderer.root.find(
      (node) => node.type === 'AppButton' && node.props.title === 'Giriş ekranına dön',
    );
    act(() => login.props.onPress());
    expect(routerMock.replace).toHaveBeenCalledWith('/auth/login');
  });

  it('renders a safe error for an invalid callback', async () => {
    linkingState.url =
      'aracimcepte://auth/confirm-email?error=access_denied&error_description=raw-provider-detail';
    const renderer = await mount();
    const output = JSON.stringify(renderer.toJSON());
    expect(output).toContain('Doğrulama bağlantısı geçersiz');
    expect(output).not.toContain('raw-provider-detail');
  });
});
