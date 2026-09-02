/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
vi.mock('@/shared/theme', () => {
  const colors = new Proxy({}, { get: (_target, key) => String(key) });
  const metrics = new Proxy({}, { get: () => 12 });
  const theme = { colors };
  return {
    fontFamilies: new Proxy({}, { get: () => 'Inter' }),
    radii: metrics,
    spacing: metrics,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});
vi.mock('@/shared/components/ui', async () => {
  const React = await import('react');
  const host = (name: string) =>
    function Host(props: Record<string, unknown>) {
      return React.createElement(name, props);
    };
  return {
    AppButton: host('AppButton'),
    AppInput: host('AppInput'),
    SelectField: host('SelectField'),
    confirmAction: vi.fn(),
  };
});

import { MaintenanceOperationsField } from './MaintenanceOperationsField';

async function mount(overrides: Record<string, unknown> = {}): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <MaintenanceOperationsField
        selectedItemIds={[]}
        selectedPackageKey="manual"
        templates={[
          {
            id: 'template-a',
            ownerId: 'owner-a',
            title: 'Paketim',
            itemDefinitions: ['air_filter'],
            createdAt: '2026-08-11T00:00:00.000Z',
            updatedAt: '2026-08-11T00:00:00.000Z',
          },
        ]}
        loading={false}
        onSelectionChange={vi.fn()}
        onPackageChange={vi.fn()}
        onCreateTemplate={vi.fn(async () => true)}
        onDeleteTemplate={vi.fn(async () => true)}
        {...overrides}
      />,
    );
  });
  return renderer!;
}

describe('MaintenanceOperationsField', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('applies default and user packages as copied form selections', async () => {
    const onPackageChange = vi.fn();
    const renderer = await mount({ onPackageChange });
    const select = renderer.root.find((node) => String(node.type) === 'SelectField');
    act(() => select.props.onChange('default:periodic_maintenance'));
    expect(onPackageChange).toHaveBeenCalledWith(
      'default:periodic_maintenance',
      'Periyodik bakım',
      ['engine_oil', 'oil_filter', 'air_filter', 'cabin_filter'],
    );
    const defaultItems = onPackageChange.mock.calls[0][2] as string[];
    defaultItems.pop();
    act(() => select.props.onChange('user:template-a'));
    expect(onPackageChange).toHaveBeenLastCalledWith('user:template-a', 'Paketim', ['air_filter']);
  });

  it('emits a new array when a single operation is selected manually', async () => {
    const onSelectionChange = vi.fn();
    const renderer = await mount({ onSelectionChange });
    act(() => renderer.root.findByProps({ testID: 'maintenance-item-air_filter' }).props.onPress());
    expect(onSelectionChange).toHaveBeenCalledWith(['air_filter']);
  });

  it('creates a reusable user package from a copied operation selection', async () => {
    const onCreateTemplate = vi.fn(async () => true);
    const renderer = await mount({
      selectedItemIds: ['engine_oil', 'oil_filter'],
      onCreateTemplate,
    });
    act(() => renderer.root.findByProps({ title: 'Yeni paket oluştur' }).props.onPress());
    act(() =>
      renderer.root.findByProps({ label: 'Paket adı' }).props.onChangeText('10.000 km bakımım'),
    );
    await act(async () => {
      await renderer.root.findByProps({ title: 'Paketi kaydet' }).props.onPress();
    });
    expect(onCreateTemplate).toHaveBeenCalledWith('10.000 km bakımım', [
      'engine_oil',
      'oil_filter',
    ]);
  });

  it('adds, deduplicates and removes a custom operation before saving the package', async () => {
    const onCreateTemplate = vi.fn(async () => true);
    const renderer = await mount({ onCreateTemplate });
    act(() => renderer.root.findByProps({ title: 'Yeni paket oluştur' }).props.onPress());
    const customInput = renderer.root.findByProps({ label: 'Özel işlem' });
    act(() => customInput.props.onChangeText('  Klima gazı kontrolü  '));
    act(() => renderer.root.findByProps({ title: 'Özel işlemi ekle' }).props.onPress());
    const custom = renderer.root.findAll(
      (node) =>
        String(node.type) === 'Pressable' &&
        String(node.props.testID).startsWith('template-item-custom:'),
    );
    expect(custom).toHaveLength(1);
    act(() => custom[0].props.onPress());
    expect(
      renderer.root.findAll(
        (node) =>
          String(node.type) === 'Pressable' &&
          String(node.props.testID).startsWith('template-item-custom:'),
      ),
    ).toHaveLength(0);
  });
});
