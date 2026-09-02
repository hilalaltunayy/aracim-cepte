/* eslint-disable import/first */
import type { ReactNode } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { authState, openLegalLinkMock, routerMock } = vi.hoisted(() => ({
  routerMock: { push: vi.fn(), replace: vi.fn() },
  openLegalLinkMock: vi.fn(async () => 'external' as const),
  authState: {
    signUp: vi.fn(async () => true),
    resendConfirmation: vi.fn(async () => true),
    busy: false,
    error: null as string | null,
    clearError: vi.fn(),
  },
}));

vi.mock('expo-router', async () => {
  const React = await import('react');
  return {
    router: routerMock,
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, [callback]),
  };
});

vi.mock('expo-linking', () => ({
  canOpenURL: vi.fn(async () => true),
  openURL: vi.fn(async () => true),
}));

vi.mock('react-native', () => ({
  Alert: { alert: vi.fn() },
  Animated: { View: 'Animated.View', Value: class {}, timing: () => ({ start: vi.fn(), stop: vi.fn() }) },
  AccessibilityInfo: {
    isReduceMotionEnabled: vi.fn(async () => true),
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles, hairlineWidth: 1 },
  Text: 'Text',
  View: 'View',
}));

vi.mock('@/shared/components/AutomotiveBackdrop', () => ({ AutomotiveBackdrop: () => null }));
vi.mock('@/shared/components/BrandLogo', () => ({ BrandLogo: () => null }));
vi.mock('@/shared/components/Reveal', async () => {
  const React = await import('react');
  return { Reveal: ({ children }: { children: ReactNode }) => React.createElement('Reveal', null, children) };
});

vi.mock('@/shared/theme', () => {
  const colors = new Proxy({}, { get: (_target, key) => String(key) });
  const metrics = new Proxy({}, { get: () => 12 });
  const textStyles = new Proxy({}, { get: () => ({}) });
  const theme = { colors };
  return {
    spacing: metrics,
    typography: textStyles,
    fontFamilies: new Proxy({}, { get: () => 'Inter' }),
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});

vi.mock('@/shared/components/ui', async () => {
  const React = await import('react');
  const host = (name: string) =>
    function Host({
      children,
      title,
      label,
      message,
      subtitle,
      ...props
    }: Record<string, unknown> & {
      children?: ReactNode;
      title?: ReactNode;
      label?: ReactNode;
      message?: ReactNode;
      subtitle?: ReactNode;
    }) {
      return React.createElement(
        name,
        { ...props, title, label, message, subtitle },
        title ?? label ?? message ?? subtitle,
        children,
      );
    };
  return {
    AppButton: host('AppButton'),
    AppHeader: host('AppHeader'),
    AppInput: host('AppInput'),
    Card: host('Card'),
    ErrorBanner: host('ErrorBanner'),
    FeedbackBanner: host('FeedbackBanner'),
    FloatingField: host('FloatingField'),
    FormSection: host('FormSection'),
    PasswordInput: host('PasswordInput'),
    Screen: host('Screen'),
  };
});

vi.mock('@/features/legal/LegalNavigationRow', async () => {
  const React = await import('react');
  return {
    LegalNavigationRow: ({ title, onPress }: { title: string; onPress: () => void }) =>
      React.createElement('LegalNavigationRow', { title, onPress }, title),
  };
});

vi.mock('@/features/legal/legalLinkOpener', () => ({ openLegalLink: openLegalLinkMock }));

vi.mock('@/store/authStore', () => ({ useAuthStore: () => authState }));
vi.mock('@/data/supabase/client', () => ({ isSupabaseConfigured: true }));

import RegisterScreen from '@/app/auth/register';
import LegalIndexScreen from '@/app/legal/index';
import { LEGAL_LINKS } from '@/features/legal/legalLinks';

async function mount(Component: () => React.JSX.Element): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<Component />);
  });
  return renderer!;
}

function findHost(root: ReactTestInstance, type: string): ReactTestInstance[] {
  return root.findAll((node) => node.type === type);
}

describe('live-first legal route behavior', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    routerMock.push.mockClear();
    openLegalLinkMock.mockClear().mockResolvedValue('external');
  });

  it('routes both registration links through the shared live-first opener', async () => {
    const renderer = await mount(RegisterScreen);
    const legalPressables = findHost(renderer.root, 'Pressable').filter(
      (node) => node.props.accessibilityRole === 'link',
    );
    expect(legalPressables).toHaveLength(2);

    legalPressables.forEach((pressable, index) => {
      act(() => pressable.props.onPress());
      const [link, fallback] = openLegalLinkMock.mock.calls[index] as unknown as [(typeof LEGAL_LINKS)[number], () => void];
      expect(link).toMatchObject(LEGAL_LINKS[index]);
      act(() => fallback());
      expect(routerMock.push).toHaveBeenLastCalledWith(LEGAL_LINKS[index].href);
    });
  });

  it('routes all settings legal-list items through the same opener and in-app fallback', async () => {
    const renderer = await mount(LegalIndexScreen);
    const rows = findHost(renderer.root, 'LegalNavigationRow');
    expect(rows).toHaveLength(5);

    rows.forEach((row, index) => {
      act(() => row.props.onPress());
      const [link, fallback] = openLegalLinkMock.mock.calls[index] as unknown as [(typeof LEGAL_LINKS)[number], () => void];
      expect(link).toEqual(LEGAL_LINKS[index]);
      act(() => fallback());
      expect(routerMock.push).toHaveBeenLastCalledWith(LEGAL_LINKS[index].href);
    });
  });
});
