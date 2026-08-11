/* eslint-disable import/first */
import type { ReactNode } from 'react';
import { act, create } from 'react-test-renderer';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const pickerMocks = vi.hoisted(() => ({
  camera: vi.fn(),
  gallery: vi.fn(),
  document: vi.fn(),
}));

vi.mock('../services/attachmentPicker', () => ({
  takeAttachmentPhoto: pickerMocks.camera,
  pickAttachmentFromGallery: pickerMocks.gallery,
  pickAttachmentDocument: pickerMocks.document,
}));
vi.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Image: 'Image',
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
vi.mock('@/shared/utils/errors', () => ({
  getFriendlyError: () => 'Dosya eklenemedi. Lütfen tekrar deneyin.',
}));
vi.mock('@/shared/components/ui', async () => {
  const React = await import('react');
  return {
    ActionSheet: (props: Record<string, unknown>) => React.createElement('ActionSheet', props),
    AppButton: ({ title, ...props }: Record<string, unknown> & { title?: ReactNode }) =>
      React.createElement('AppButton', { ...props, title }, title),
    Card: ({ children, ...props }: Record<string, unknown> & { children?: ReactNode }) =>
      React.createElement('Card', props, children),
    ErrorBanner: (props: Record<string, unknown>) => React.createElement('ErrorBanner', props),
  };
});
vi.mock('@/shared/theme', () => {
  const colors = new Proxy({}, { get: (_target, key) => String(key) });
  const theme = { colors };
  return {
    radii: { sm: 8 },
    spacing: { sm: 8, md: 12 },
    typography: { label: {}, caption: {}, bodyMedium: {} },
    useAppTheme: () => theme,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});

import { UnifiedAttachmentField } from './UnifiedAttachmentField';
import type { AttachmentListItem, PendingAttachment } from '../domain/types';

const candidate = (source: PendingAttachment['source'], id: string): PendingAttachment => ({
  id,
  requestId: `${id}-request`,
  uri: `file:///${id}`,
  originalName: `${id}.jpg`,
  mimeType: 'image/jpeg',
  sizeBytes: 100,
  source,
});

describe('UnifiedAttachmentField', () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  beforeEach(() => vi.clearAllMocks());

  it('exposes camera, gallery and file actions and feeds one shared list', async () => {
    const current: AttachmentListItem[] = [];
    const onChange = vi.fn((items: AttachmentListItem[]) => {
      current.splice(0, current.length, ...items);
    });
    pickerMocks.camera.mockResolvedValue(candidate('camera', 'camera'));
    pickerMocks.gallery.mockResolvedValue(candidate('gallery', 'gallery'));
    pickerMocks.document.mockResolvedValue(candidate('document', 'document'));

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<UnifiedAttachmentField items={current} onChange={onChange} />);
    });
    const sheet = renderer!.root.findByType('ActionSheet' as never);
    expect(sheet.props.options.map((option: { label: string }) => option.label)).toEqual([
      'Fotoğraf çek',
      'Galeriden seç',
      'Dosya seç',
    ]);

    for (const source of ['camera', 'gallery', 'document'] as const) {
      await act(async () => sheet.props.onSelect(source));
      await act(async () => renderer!.update(<UnifiedAttachmentField items={[...current]} onChange={onChange} />));
    }
    expect(current.map((item) => item.source)).toEqual(['camera', 'gallery', 'document']);
  });

  it('keeps cancellation local and removes only the selected item', async () => {
    pickerMocks.camera.mockResolvedValue(null);
    const items = [candidate('camera', 'one'), candidate('gallery', 'two')];
    const onChange = vi.fn();
    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<UnifiedAttachmentField items={items} onChange={onChange} />);
    });
    await act(async () =>
      renderer!.root.findByType('ActionSheet' as never).props.onSelect('camera'),
    );
    expect(onChange).not.toHaveBeenCalled();
    const remove = renderer!.root.findByProps({ accessibilityLabel: 'one.jpg dosyasını kaldır' });
    await act(async () => remove.props.onPress());
    expect(onChange).toHaveBeenCalledWith([items[1]]);
  });

  it('contains picker failures in a safe local error state', async () => {
    pickerMocks.camera.mockRejectedValue(
      new Error('native camera provider path=/private/user-photo.jpg'),
    );
    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<UnifiedAttachmentField items={[]} onChange={vi.fn()} />);
    });
    await act(async () =>
      renderer!.root.findByType('ActionSheet' as never).props.onSelect('camera'),
    );
    const serialized = JSON.stringify(renderer!.toJSON());
    expect(serialized).toContain('Dosya eklenemedi. Lütfen tekrar deneyin.');
    expect(serialized).not.toContain('private/user-photo');
  });

  it('sanitizes persisted-file open failures and always clears the busy state', async () => {
    const persisted: AttachmentListItem = {
      id: 'persisted',
      ownerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      vehicleId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      parentType: 'expertise_report',
      parentId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      source: 'document',
      originalName: 'rapor.pdf',
      storagePath: 'owner/vehicle/random.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      createdAt: '2026-08-11T00:00:00Z',
    };
    const onOpen = vi.fn().mockRejectedValue(
      new Error('provider signed_url=https://secret.example/object'),
    );
    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        <UnifiedAttachmentField items={[persisted]} onChange={vi.fn()} onOpen={onOpen} />,
      );
    });
    const openButton = renderer!.root.findByProps({
      accessibilityLabel: 'rapor.pdf dosyasını aç',
    });
    await act(async () => openButton.props.onPress());
    expect(onOpen).toHaveBeenCalledWith(persisted);
    const serialized = JSON.stringify(renderer!.toJSON());
    expect(serialized).toContain(
      'Dosya açılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.',
    );
    expect(serialized).not.toContain('secret.example');
    expect(
      renderer!.root.findByProps({ accessibilityLabel: 'rapor.pdf dosyasını aç' }).props
        .accessibilityState,
    ).toEqual({ busy: false });
  });
});
