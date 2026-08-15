/* eslint-disable import/first */
import type { ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VehicleDocument } from '@/domain/entities';

const { dataState, routerMock } = vi.hoisted(() => ({
  dataState: { documents: [] as VehicleDocument[] },
  routerMock: { push: vi.fn() },
}));

vi.mock('expo-router', () => ({ router: routerMock }));
vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles, hairlineWidth: 1 },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@/shared/theme', () => {
  const colors = new Proxy({}, { get: (_target, key) => String(key) });
  const theme = { colors };
  return {
    spacing: new Proxy({}, { get: () => 8 }),
    typography: new Proxy({}, { get: () => ({}) }),
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
    }: {
      children?: ReactNode;
      title?: ReactNode;
      message?: ReactNode;
      [key: string]: unknown;
    }) {
      return React.createElement(name, { ...props, title, message }, children ?? title ?? message);
    };
  return {
    AppButton: host('AppButton'),
    EmptyState: host('EmptyState'),
    Screen: host('Screen'),
    StatusBadge: host('StatusBadge'),
  };
});
vi.mock('@/shared/components/entityCards', async () => {
  const React = await import('react');
  return {
    DocumentCard: ({ document, onPress }: { document: VehicleDocument; onPress: () => void }) =>
      React.createElement('DocumentCard', { document, onPress }, document.title),
  };
});
vi.mock('@/store/dataStore', () => ({
  useDataStore: (selector: (state: typeof dataState) => unknown) => selector(dataState),
}));

import DocumentsListScreen from './index';

const document = (id: string, expiryDate: string | null): VehicleDocument => ({
  id,
  vehicleId: 'vehicle-1',
  ownerId: 'owner-1',
  documentType: 'custom',
  title: `Belge ${id}`,
  documentNumber: null,
  issuerName: null,
  startDate: null,
  eventDate: null,
  issueDate: null,
  expiryDate,
  note: null,
  attachmentPath: null,
  attachments: [],
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
});

async function mount(): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<DocumentsListScreen />);
  });
  return renderer!;
}

describe('DocumentsListScreen archive UX', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    dataState.documents = [
      document('active', '2027-01-01'),
      document('soon', '2026-08-20'),
      document('expired', '2026-07-01'),
      document('neutral', null),
    ];
    routerMock.push.mockClear();
  });

  it('defaults to Active, keeps no-expiry visible and exposes Add Document', async () => {
    const renderer = await mount();
    expect(
      renderer.root.findAllByType('DocumentCard' as never).map((item) => item.props.document.id),
    ).toEqual(['active', 'neutral']);
    expect(renderer.root.findByProps({ title: 'Yeni belge' })).toBeDefined();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Aktif, 2 belge' })).toBeDefined();
  });

  it('switches to Archive and opens an expired document without changing its route', async () => {
    const renderer = await mount();
    await act(async () => {
      renderer!.root.findByProps({ accessibilityLabel: 'Arşiv, 1 belge' }).props.onPress();
    });
    const archiveRow = renderer.root.findByType('DocumentCard' as never);
    expect(archiveRow.props.document.id).toBe('expired');
    await act(async () => archiveRow.props.onPress());
    expect(routerMock.push).toHaveBeenLastCalledWith({
      pathname: '/documents/edit',
      params: { id: 'expired' },
    });
  });

  it('shows a focused empty state for an empty Expiring Soon filter', async () => {
    dataState.documents = [document('active', '2027-01-01')];
    const renderer = await mount();
    await act(async () => {
      renderer!.root.findByProps({ accessibilityLabel: 'Yaklaşan, 0 belge' }).props.onPress();
    });
    expect(
      renderer.root.findByProps({ title: 'Yakında süresi dolacak belge bulunmuyor.' }),
    ).toBeDefined();
  });
});
