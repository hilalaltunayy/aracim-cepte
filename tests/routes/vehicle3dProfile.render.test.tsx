/* eslint-disable import/first */
import type { ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const { storeState } = vi.hoisted(() => ({
  storeState: {
    vehicles: [
      {
        id: 'vehicle-a',
        ownerId: 'user-a',
        brand: 'Test',
        model: 'Sedan',
        year: 2026,
        plate: null,
        currentKm: 12_000,
        fuelType: 'gasoline',
        bodyType: 'sedan',
        colorId: 'red',
        color: 'Kırmızı',
        createdAt: '2026-08-11T00:00:00.000Z',
        updatedAt: '2026-08-11T00:00:00.000Z',
        archivedAt: null,
      },
    ],
    activeVehicleId: 'vehicle-a',
    bodyConditions: [],
    expertiseReports: [],
    notes: [],
    documents: [],
    bootstrapped: true,
  },
}));

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));

vi.mock('expo-router', () => ({ router: { navigate: vi.fn(), push: vi.fn() } }));
vi.mock('@expo/vector-icons', async () => {
  const React = await import('react');
  return { Ionicons: (props: object) => React.createElement('Ionicons', props) };
});
vi.mock('@/store/dataStore', () => ({ useDataStore: () => storeState }));
vi.mock('@/shared/theme', () => {
  const colors = new Proxy({}, { get: (_target, key) => String(key) });
  const metrics = new Proxy({}, { get: () => 12 });
  const textStyles = new Proxy({}, { get: () => ({}) });
  const theme = { colors };
  return {
    fontFamilies: { bold: 'bold' },
    radii: metrics,
    spacing: metrics,
    typography: textStyles,
    useAppTheme: () => theme,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});
vi.mock('@/shared/components/ui', async () => {
  const React = await import('react');
  const host = (name: string) =>
    function Host({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) {
      return React.createElement(name, { ...props, testID: props.testID ?? name }, children);
    };
  return {
    AppHeader: host('AppHeader'),
    Card: host('Card'),
    LoadingScreen: host('LoadingScreen'),
    NoVehicleState: host('NoVehicleState'),
    Screen: host('Screen'),
    SectionHeader: host('SectionHeader'),
  };
});
vi.mock('@/features/vehicle3d/Vehicle3DRegion', async () => {
  const React = await import('react');
  return {
    Vehicle3DRegion: (props: object) =>
      React.createElement('Vehicle3DRegion', { ...props, testID: 'vehicle-3d-profile-region' }),
  };
});
vi.mock('@/features/vehicles/components/VehicleSwitcherSheet', async () => {
  const React = await import('react');
  return {
    VehicleSwitcherSheet: (props: object) =>
      React.createElement('VehicleSwitcherSheet', { ...props, testID: 'vehicle-switcher-sheet' }),
  };
});

import VehicleScreen from '@/app/(tabs)/vehicle';

async function mount(): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<VehicleScreen />);
  });
  return renderer!;
}

describe('vehicle profile 3D integration', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('keeps the existing profile and forwards normalized TASK-018 fields to the isolated region', async () => {
    const renderer = await mount();
    expect(renderer.root.findByProps({ testID: 'Screen' })).toBeDefined();
    const region = renderer.root.findByProps({ testID: 'vehicle-3d-profile-region' });
    expect(region.props.bodyType).toBe('sedan');
    expect(region.props.colorId).toBe('red');
    expect(
      renderer.root.findAll((node) => node.props.accessibilityLabel === 'Yeni araç ekle'),
    ).toHaveLength(1);
  });

  it('adds a compact switch affordance only when multiple owned vehicles exist', async () => {
    storeState.vehicles.push({
      ...storeState.vehicles[0],
      id: 'vehicle-b',
      brand: 'Toyota',
      model: 'Corolla',
      plate: null,
    });
    const renderer = await mount();
    expect(
      renderer.root.findAll((node) => node.props.accessibilityLabel === 'Aktif aracı değiştir'),
    ).toHaveLength(1);
  });
});
