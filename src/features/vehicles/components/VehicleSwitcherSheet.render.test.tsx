/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Modal: 'Modal',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
  useWindowDimensions: () => ({ height: 800 }),
}));
vi.mock('@expo/vector-icons', async () => {
  const React = await import('react');
  return { Ionicons: (props: object) => React.createElement('Ionicons', props) };
});
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 24 }) }));
vi.mock('./VehiclePhotoImage', async () => {
  const React = await import('react');
  return { VehiclePhotoImage: (props: object) => React.createElement('VehiclePhotoImage', props) };
});
vi.mock('@/shared/theme', () => {
  const colors = new Proxy({}, { get: (_target, key) => String(key) });
  const values = new Proxy({}, { get: () => 12 });
  const theme = { colors, shadows: { floating: {} } };
  return {
    fontFamilies: { semibold: 'semibold' },
    radii: values,
    spacing: values,
    typography: new Proxy({}, { get: () => ({}) }),
    useAppTheme: () => theme,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});

import { VehicleSwitcherSheet } from './VehicleSwitcherSheet';

const vehicles = [
  {
    id: 'vehicle-a', ownerId: 'owner', brand: 'Kia', model: 'Sportage', year: 2024,
    plate: '42 ABC 123', currentKm: 10000, fuelType: 'gasoline' as const, bodyType: 'suv' as const,
    colorId: 'white' as const, color: 'Beyaz', createdAt: '', updatedAt: '', archivedAt: null,
  },
  {
    id: 'vehicle-b', ownerId: 'owner', brand: 'Toyota', model: 'Corolla', year: 2023,
    plate: null, currentKm: 20000, fuelType: 'gasoline' as const, bodyType: 'sedan' as const,
    colorId: 'red' as const, color: 'Kırmızı', createdAt: '', updatedAt: '', archivedAt: null,
  },
];

describe('vehicle switcher sheet', () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('presents concise vehicles with a non-color selected state and a safe-area-bounded sheet', async () => {
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <VehicleSwitcherSheet
          visible
          vehicles={vehicles}
          activeVehicleId="vehicle-a"
          capacityLabel="2 / 3 araç"
          onSelect={vi.fn()}
          onAddVehicle={vi.fn()}
          onClose={vi.fn()}
        />,
      );
    });
    const selected = renderer!.root.findAll(
      (node) => node.props.accessibilityRole === 'radio' && node.props.accessibilityState?.checked,
    );
    expect(selected).toHaveLength(1);
    expect(selected[0].props.accessibilityLabel).toContain('Kia Sportage');
    expect(renderer!.root.findByProps({ testID: 'vehicle-switcher-modal' }).props.visible).toBe(true);
  });
});
