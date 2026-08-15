/* eslint-disable import/first */
import type { ReactElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Alert: { alert: vi.fn() },
  Animated: {
    View: 'AnimatedView',
    Value: class {
      addListener = vi.fn();
      interpolate = vi.fn();
      removeListener = vi.fn();
      setValue = vi.fn();
    },
    parallel: () => ({ start: vi.fn() }),
    timing: () => ({ start: vi.fn() }),
  },
  AppState: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Modal: 'Modal',
  Platform: { OS: 'android' },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: <T,>(styles: T) => styles, hairlineWidth: 1 },
  Text: 'Text',
  TextInput: 'TextInput',
  View: 'View',
  useWindowDimensions: () => ({ height: 800 }),
}));
vi.mock('@expo/vector-icons', async () => {
  const React = await import('react');
  return { Ionicons: (props: object) => React.createElement('Ionicons', props) };
});
vi.mock('@react-native-community/datetimepicker', () => ({ default: 'DateTimePicker' }));
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));
vi.mock('@/shared/theme', () => {
  const values = new Proxy({}, { get: (_target, key) => String(key) });
  const metrics = new Proxy({}, { get: () => 12 });
  const theme = { colors: values, shadows: new Proxy({}, { get: () => ({}) }) };
  return {
    fontFamilies: new Proxy({}, { get: () => 'Inter' }),
    getButtonLoadingIndicatorColor: () => 'disabledText',
    layout: { screenGutter: 20, sectionGap: 20, cardPadding: 18, minimumTouchTarget: 48 },
    radii: metrics,
    spacing: metrics,
    typography: new Proxy({}, { get: () => ({}) }),
    useAppTheme: () => theme,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});
vi.mock('@/features/auth/passwordVisibility', () => ({ isPasswordVisibleAfter: () => false }));
vi.mock('@/shared/utils/accessibility', () => ({
  getButtonAccessibility: (label: string) => ({ label, state: {} }),
  getSelectionAccessibilityState: (selected: boolean) => ({ selected }),
}));
vi.mock('@/shared/utils/bottomTabLayout', () => ({
  getBottomTabLayout: () => ({ screenContentPaddingBottom: 0 }),
}));
vi.mock('@/shared/utils/format', () => ({
  formatDate: (value: string) => value,
  parseDateOnly: () => new Date(),
  parseTimeOnly: () => new Date(),
  todayDateOnly: () => '2026-08-15',
  toDateOnly: () => '2026-08-15',
  toTimeOnly: () => '09:00',
}));
vi.mock('@/shared/utils/formLabels', () => ({ withoutOptionalSuffix: (value: string) => value }));
vi.mock('@/shared/utils/selectionModalLayout', () => ({
  getSelectionModalLayout: () => ({
    paddingTop: 0,
    paddingBottom: 0,
    maxHeight: 600,
    listPaddingBottom: 0,
  }),
}));

import { EmptyState, ErrorBanner, LoadingScreen } from './ui';

async function mount(children: ReactElement): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(children);
  });
  return renderer!;
}

describe('shared UI polish states', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('uses a stable, non-shimmering layout-shaped loading state', async () => {
    const renderer = await mount(<LoadingScreen />);
    expect(renderer.root.findByProps({ accessibilityRole: 'progressbar' })).toBeDefined();
    expect(renderer.root.findAll((node) => String(node.type) === 'ActivityIndicator')).toHaveLength(
      0,
    );
  });

  it('keeps an empty-state CTA explicit and reachable when a screen supplies one', async () => {
    const onAction = vi.fn();
    const renderer = await mount(
      <EmptyState
        title="Henüz bakım kaydı yok"
        message="İlk kaydı ekleyerek araç geçmişini oluşturun."
        actionLabel="Bakım ekle"
        onAction={onAction}
      />,
    );
    const button = renderer.root.findByProps({ title: 'Bakım ekle' });
    await act(async () => button.props.onPress());
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('keeps retry actions in the calm shared error surface', async () => {
    const onRetry = vi.fn();
    const renderer = await mount(<ErrorBanner message="Bağlantı kurulamadı." onRetry={onRetry} />);
    const retry = renderer.root.findByProps({ accessibilityLabel: 'Tekrar dene' });
    await act(async () => retry.props.onPress());
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
