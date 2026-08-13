/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const { alert } = vi.hoisted(() => ({ alert: vi.fn() }));

vi.mock('react-native', () => ({
  Alert: { alert },
  Modal: 'Modal',
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('@expo/vector-icons', async () => {
  const React = await import('react');
  return { Ionicons: (props: object) => React.createElement('Ionicons', props) };
});
vi.mock('@/shared/components/ui', async () => {
  const React = await import('react');
  return {
    ActionSheet: (props: object) => React.createElement('ActionSheet', props),
    AppButton: (props: object) => React.createElement('AppButton', props),
    Card: (props: object) => React.createElement('Card', props),
    ErrorBanner: (props: object) => React.createElement('ErrorBanner', props),
  };
});
vi.mock('@/shared/theme', () => {
  const colors = new Proxy({}, { get: (_target, key) => String(key) });
  const values = new Proxy({}, { get: () => 12 });
  const theme = { colors };
  return {
    fontFamilies: { semibold: 'semibold' },
    radii: values,
    spacing: values,
    typography: new Proxy({}, { get: () => ({}) }),
    useAppTheme: () => theme,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});
vi.mock('@/features/attachments/services/attachmentPicker', () => ({
  pickAttachmentFromGallery: vi.fn(),
  takeAttachmentPhoto: vi.fn(),
}));
vi.mock('./VehiclePhotoImage', async () => {
  const React = await import('react');
  return { VehiclePhotoImage: (props: object) => React.createElement('VehiclePhotoImage', props) };
});

import { VehiclePhotoGallery } from './VehiclePhotoGallery';

const photo = {
  id: 'photo-a',
  ownerId: 'owner-a',
  vehicleId: 'vehicle-a',
  attachmentId: 'attachment-a',
  storagePath: 'owner-a/vehicle-a/vehicle_photo/photo-a/attachment-a.jpg',
  isPrimary: true,
  sortOrder: 0,
  createdAt: '2026-08-13T12:00:00.000Z',
  updatedAt: '2026-08-13T12:00:00.000Z',
  attachment: {} as never,
} as const;

function renderGallery(photos: readonly typeof photo[], maxVehiclePhotos: 1 | 5) {
  return create(
    <VehiclePhotoGallery
      vehicleName="Kia Sportage"
      photos={photos as never}
      entitlements={{ maxVehiclePhotos }}
      onSave={vi.fn(async () => true)}
      onSetPrimary={vi.fn(async () => true)}
      onDelete={vi.fn(async () => true)}
    />,
  );
}

describe('vehicle photo gallery render', () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('keeps the no-photo Free state quiet and exposes a clear add action', async () => {
    let renderer: ReactTestRenderer | undefined;
    await act(async () => { renderer = renderGallery([], 1); });
    expect(renderer!.root.findByProps({ accessibilityLabel: 'Araç fotoğrafı ekle' })).toBeTruthy();
    expect(renderer!.root.findAll((node) => node.type as unknown === 'VehiclePhotoImage')).toHaveLength(0);
  });

  it('explains the Free one-photo limit without a fake purchase flow', async () => {
    alert.mockClear();
    let renderer: ReactTestRenderer | undefined;
    await act(async () => { renderer = renderGallery([photo], 1); });
    const add = renderer!.root.findByProps({ title: 'Fotoğraf ekle' });
    await act(async () => { add.props.onPress(); });
    expect(alert).toHaveBeenCalledWith(
      'Fotoğraf sınırı',
      expect.stringContaining('Premium ile küçük araç galerisi'),
    );
  });

  it('renders a restrained Premium gallery capacity and focused viewer entry point', async () => {
    let renderer: ReactTestRenderer | undefined;
    await act(async () => { renderer = renderGallery([photo], 5); });
    expect(renderer!.root.findByProps({ accessibilityLabel: 'Kia Sportage araç fotoğraflarını görüntüle' })).toBeTruthy();
    expect(renderer!.root.findByProps({ title: 'Fotoğraf ekle' })).toBeTruthy();
    expect(renderer!.root.findAll((node) => node.type as unknown === 'VehiclePhotoImage')).toHaveLength(1);
    expect(renderer!.root.find((node) => node.type as unknown === 'Modal').props.visible).toBe(false);
  });
});
