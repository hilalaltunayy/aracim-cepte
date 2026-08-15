/* eslint-disable import/first */
import type { ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { VehicleDocument } from '@/domain/entities';

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@expo/vector-icons', async () => {
  const React = await import('react');
  return { Ionicons: (props: object) => React.createElement('Ionicons', props) };
});
vi.mock('@/shared/theme', () => {
  const theme = { colors: new Proxy({}, { get: (_target, key) => String(key) }) };
  return {
    fontFamilies: new Proxy({}, { get: () => 'Inter_600SemiBold' }),
    radii: new Proxy({}, { get: () => 12 }),
    spacing: new Proxy({}, { get: () => 8 }),
    typography: new Proxy({}, { get: () => ({}) }),
    useAppTheme: () => theme,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});
vi.mock('./ui', async () => {
  const React = await import('react');
  const host = (name: string) =>
    function Host({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) {
      return React.createElement(name, props, children);
    };
  return { Card: host('Card'), StatusBadge: host('StatusBadge') };
});

import { DocumentCard } from './entityCards';

const document = (overrides: Partial<VehicleDocument> = {}): VehicleDocument => ({
  id: 'document-1',
  vehicleId: 'vehicle-1',
  ownerId: 'owner-1',
  documentType: 'traffic_insurance',
  title: 'Trafik sigortası',
  documentNumber: null,
  issuerName: null,
  startDate: null,
  eventDate: null,
  issueDate: null,
  expiryDate: null,
  note: null,
  attachmentPath: null,
  attachments: [],
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  ...overrides,
});

async function mount(value: VehicleDocument): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<DocumentCard document={value} onPress={vi.fn()} />);
  });
  return renderer!;
}

const texts = (renderer: ReactTestRenderer) =>
  renderer.root
    .findAll((node) => String(node.type) === 'Text')
    .map((node) => node.children.join(''));

describe('DocumentCard polish', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('keeps legacy no-expiry documents readable without inventing a date or issuer', async () => {
    const renderer = await mount(document());
    expect(texts(renderer)).toContain('Trafik sigortası');
    expect(texts(renderer)).toContain('Trafik sigortası');
    expect(texts(renderer).join(' ')).not.toContain('Bitiş:');
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Trafik sigortası belgesini aç' }),
    ).toBeDefined();
  });

  it('shows concise issuer and attachment context for populated documents', async () => {
    const renderer = await mount(
      document({
        issuerName: 'Güven Sigorta',
        expiryDate: '2030-01-01',
        attachmentPath: 'private/path',
      }),
    );
    expect(texts(renderer).join(' ')).toContain('Trafik sigortası · Güven Sigorta');
    expect(renderer.root.findByProps({ name: 'attach-outline' })).toBeDefined();
    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Trafik sigortası belgesini aç, ekli dosya var',
      }),
    ).toBeDefined();
  });
});
