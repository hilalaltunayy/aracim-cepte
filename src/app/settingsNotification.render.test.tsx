/* eslint-disable import/first */
import type { ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { alertMock, appState, dataState, linkingMock, notificationState } = vi.hoisted(() => ({
  alertMock: vi.fn(),
  appState: { onChange: null as null | ((state: string) => void) },
  notificationState: { status: 'denied' },
  linkingMock: { openSettings: vi.fn(async () => undefined) },
  dataState: {} as Record<string, unknown>,
}));

vi.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Alert: { alert: alertMock },
  AppState: {
    addEventListener: vi.fn((_event: string, callback: (state: string) => void) => {
      appState.onChange = callback;
      return { remove: vi.fn() };
    }),
  },
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));

vi.mock('expo-router', () => ({
  router: { push: vi.fn(), replace: vi.fn() },
}));
vi.mock('expo-notifications', () => ({
  getPermissionsAsync: vi.fn(async () => ({ status: notificationState.status })),
  requestPermissionsAsync: vi.fn(async () => ({ status: notificationState.status })),
}));
vi.mock('expo-linking', () => linkingMock);
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '1.0.0' } } }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

vi.mock('@/shared/theme', () => {
  const colors = new Proxy({}, { get: (_target, key) => String(key) });
  const metrics = new Proxy({}, { get: () => 12 });
  const theme = {
    colors,
    preference: 'system',
    setPreference: vi.fn(async () => undefined),
  };
  return {
    fontFamilies: new Proxy({}, { get: () => 'Inter' }),
    radii: metrics,
    spacing: metrics,
    typography: new Proxy({}, { get: () => ({}) }),
    useAppTheme: () => theme,
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
      subtitle,
      ...props
    }: Record<string, unknown> & {
      children?: ReactNode;
      title?: ReactNode;
      message?: ReactNode;
      subtitle?: ReactNode;
    }) {
      return React.createElement(
        name,
        { ...props, title, message, subtitle },
        title ?? message ?? subtitle,
        children,
      );
    };
  return {
    AppHeader: host('AppHeader'),
    Card: host('Card'),
    ErrorBanner: host('ErrorBanner'),
    Screen: host('Screen'),
    SectionHeader: host('SectionHeader'),
    confirmAction: vi.fn(),
  };
});

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    session: { user: { email: 'synthetic@example.invalid' } },
    signOut: vi.fn(async () => undefined),
    deleteAccount: vi.fn(async () => true),
    busy: false,
    error: null,
  }),
}));

vi.mock('@/store/dataStore', () => {
  const useDataStore = () => dataState;
  return { useDataStore };
});

import SettingsScreen from './(tabs)/settings';

async function mount(): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<SettingsScreen />);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return renderer!;
}

describe('notification system settings row', () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  beforeEach(() => {
    notificationState.status = 'denied';
    linkingMock.openSettings.mockReset().mockResolvedValue(undefined);
    alertMock.mockClear();
    Object.assign(dataState, {
      vehicles: [],
      activeVehicleId: null,
      clearSection: vi.fn(async () => true),
      deleteVehicle: vi.fn(async () => true),
      clear: vi.fn(),
      loading: false,
      refresh: vi.fn(async () => undefined),
      error: null,
    });
  });

  it('is pressable, opens Android app settings and refreshes permission on resume', async () => {
    const renderer = await mount();
    const row = renderer.root.find(
      (node) => String(node.type) === 'Pressable' && node.props.accessibilityLabel === 'Bildirim izni',
    );
    expect(row.props.disabled).toBe(false);
    expect(renderer.toJSON()).toBeTruthy();
    await act(async () => row.props.onPress());
    expect(linkingMock.openSettings).toHaveBeenCalledOnce();

    notificationState.status = 'granted';
    await act(async () => {
      appState.onChange?.('active');
      await Promise.resolve();
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('İzin verildi');
  });

  it('maps openSettings rejection to a safe Turkish alert', async () => {
    linkingMock.openSettings.mockRejectedValueOnce(new Error('native provider detail'));
    const renderer = await mount();
    const row = renderer.root.find(
      (node) => String(node.type) === 'Pressable' && node.props.accessibilityLabel === 'Bildirim izni',
    );
    await act(async () => row.props.onPress());
    expect(alertMock).toHaveBeenCalledWith(
      'Ayarlar açılamadı',
      expect.stringContaining('cihaz ayarlarından'),
    );
    expect(JSON.stringify(alertMock.mock.calls)).not.toContain('native provider detail');
  });
});
