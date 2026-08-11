/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Alert: { alert: vi.fn() },
  Animated: { View: 'AnimatedView', Value: vi.fn(), timing: vi.fn() },
  AppState: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Modal: 'Modal',
  Platform: { OS: 'android', select: (value: Record<string, unknown>) => value.android },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: <T,>(styles: T) => styles, hairlineWidth: 1 },
  Text: 'Text',
  TextInput: 'TextInput',
  View: 'View',
  useWindowDimensions: () => ({ width: 360, height: 640 }),
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 48, left: 0 }),
}));
vi.mock('@react-native-community/datetimepicker', () => ({ default: 'DateTimePicker' }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
vi.mock('@/shared/theme', () => {
  const colors = new Proxy({}, { get: (_target, key) => String(key) });
  const metrics = new Proxy({}, { get: () => 12 });
  const shadows = new Proxy({}, { get: () => ({}) });
  const theme = { colors, shadows };
  return {
    fontFamilies: new Proxy({}, { get: () => 'Inter' }),
    getButtonLoadingIndicatorColor: vi.fn(() => 'white'),
    radii: metrics,
    shadows,
    spacing: metrics,
    typography: new Proxy({}, { get: () => ({}) }),
    useAppTheme: () => theme,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});

import { ActionSheet, SelectField, TimeField } from './ui';

async function mount(): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <SelectField<string>
        label="Yakıt türü"
        value="gasoline"
        onChange={vi.fn()}
        options={Array.from({ length: 12 }, (_, index) => ({
          value: index === 0 ? 'gasoline' : `option-${index}`,
          label: index === 0 ? 'Benzin' : `Seçenek ${index}`,
        }))}
      />,
    );
  });
  return renderer!;
}

describe('shared SelectField Android safe area', () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  it('opens a scrollable, height-bounded option surface above the system bar', async () => {
    const renderer = await mount();
    const trigger = renderer.root.findByProps({ accessibilityLabel: 'Yakıt türü: Benzin' });
    act(() => trigger.props.onPress());

    expect(renderer.root.find((node) => String(node.type) === 'Modal').props.visible).toBe(true);
    const card = renderer.root.findByProps({ testID: 'selection-modal-card' });
    expect(card.props.style).toContainEqual({ maxHeight: 548 });
    const list = renderer.root.findByProps({ testID: 'selection-modal-options' });
    expect(list.type).toBe('ScrollView');
    expect(list.props.contentContainerStyle).toEqual({ paddingBottom: 48 });
    const backdrop = renderer.root.findAll((node) => String(node.type) === 'Pressable').find((node) =>
      Array.isArray(node.props.style),
    );
    expect(backdrop?.props.style).toContainEqual({ paddingTop: 24, paddingBottom: 48 });
  });
});

describe('shared ActionSheet Android safe area', () => {
  it('keeps unified attachment actions scrollable above the system bar', async () => {
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <ActionSheet
          visible
          title="Dosya ekle"
          options={[
            { value: 'camera', label: 'Fotoğraf çek' },
            { value: 'gallery', label: 'Galeriden seç' },
            { value: 'document', label: 'Dosya seç' },
          ]}
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />,
      );
    });
    const card = renderer!.root.findByProps({ testID: 'action-sheet-card' });
    expect(card.props.style).toContainEqual({ maxHeight: 548 });
    const list = renderer!.root.findByProps({ testID: 'action-sheet-options' });
    expect(list.type).toBe('ScrollView');
    expect(list.props.contentContainerStyle).toEqual({ paddingBottom: 48 });
  });
});

describe('shared TimeField', () => {
  it('opens the native 24-hour time picker and returns a normalized local time', async () => {
    const onChange = vi.fn();
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(<TimeField label="Hatırlatma saati" value="09:00" onChange={onChange} />);
    });
    const trigger = renderer!.root.findByProps({ accessibilityLabel: 'Hatırlatma saati: 09:00' });
    act(() => trigger.props.onPress());
    const picker = renderer!.root.find((node) => String(node.type) === 'DateTimePicker');
    expect(picker.props).toMatchObject({ mode: 'time', is24Hour: true });
    act(() => picker.props.onChange({ type: 'set' }, new Date(2026, 7, 11, 18, 30)));
    expect(onChange).toHaveBeenCalledWith('18:30');
  });
});
