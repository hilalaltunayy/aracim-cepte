/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const { createPrivateAttachmentUrl } = vi.hoisted(() => ({ createPrivateAttachmentUrl: vi.fn() }));

vi.mock('react-native', () => ({
  Image: 'Image',
  StyleSheet: { create: <T,>(styles: T) => styles },
  View: 'View',
}));
vi.mock('@expo/vector-icons', async () => {
  const React = await import('react');
  return { Ionicons: (props: object) => React.createElement('Ionicons', props) };
});
vi.mock('@/data/storage/attachments', () => ({ createPrivateAttachmentUrl }));
vi.mock('@/shared/theme', () => ({
  radii: { md: 12 },
  useAppTheme: () => ({ colors: { paleAqua: '#eef', primary: '#08c' } }),
}));

import { VehiclePhotoImage } from './VehiclePhotoImage';

describe('vehicle photo image', () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('uses a transient private signed URL only after it resolves', async () => {
    createPrivateAttachmentUrl.mockResolvedValueOnce('https://signed.example/photo');
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <VehiclePhotoImage storagePath="owner/vehicle/photo.jpg" style={{ width: 1 }} accessibilityLabel="Araç fotoğrafı" />,
      );
    });
    expect(renderer!.root.find((node) => node.type as unknown === 'Image').props.source).toEqual({
      uri: 'https://signed.example/photo',
    });
  });

  it('keeps a safe fallback when a signed URL cannot be created', async () => {
    createPrivateAttachmentUrl.mockResolvedValueOnce(null);
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <VehiclePhotoImage storagePath="owner/vehicle/photo.jpg" style={{ width: 1 }} accessibilityLabel="Araç fotoğrafı" />,
      );
    });
    expect(renderer!.root.findAll((node) => node.type as unknown === 'Image')).toHaveLength(0);
    expect(renderer!.root.findByProps({ accessibilityLabel: 'Araç fotoğrafı' })).toBeTruthy();
  });
});
