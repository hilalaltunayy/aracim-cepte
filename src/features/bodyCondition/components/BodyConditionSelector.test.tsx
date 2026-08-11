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
  const colors = new Proxy(
    { bodyCondition: new Proxy({}, { get: (_target, key) => String(key) }) },
    { get: (target, key) => Reflect.get(target, key) ?? String(key) },
  );
  const metrics = new Proxy({}, { get: () => 12 });
  const theme = { colors };
  return {
    fontFamilies: new Proxy({}, { get: () => 'Inter' }),
    radii: metrics,
    spacing: metrics,
    useAppTheme: () => theme,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});

import { BodyConditionSelector } from './BodyConditionSelector';

async function mount(
  selected: Parameters<typeof BodyConditionSelector>[0]['selected'],
  onChange = vi.fn(),
): Promise<{ renderer: ReactTestRenderer; onChange: typeof onChange }> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<BodyConditionSelector selected={selected} onChange={onChange} />);
  });
  return { renderer: renderer!, onChange };
}

describe('BodyConditionSelector', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('renders all conditions with accessible checkbox state', async () => {
    const { renderer } = await mount(['painted', 'damaged']);
    expect(renderer.root.findAllByProps({ accessibilityRole: 'checkbox' })).toHaveLength(6);
    expect(
      renderer.root.findByProps({ testID: 'body-condition-painted' }).props.accessibilityState,
    ).toEqual({ checked: true, disabled: false });
    expect(
      renderer.root.findByProps({ testID: 'body-condition-original' }).props.accessibilityState,
    ).toEqual({ checked: false, disabled: false });
  });

  it('replaces the primary condition and preserves damaged', async () => {
    const { renderer, onChange } = await mount(['original', 'damaged']);
    act(() => renderer.root.findByProps({ testID: 'body-condition-painted' }).props.onPress());
    expect(onChange).toHaveBeenCalledWith(['painted', 'damaged']);
  });

  it('clears other values when unknown is selected and supports clearing all', async () => {
    const known = await mount(['painted', 'damaged']);
    act(() =>
      known.renderer.root.findByProps({ testID: 'body-condition-unknown' }).props.onPress(),
    );
    expect(known.onChange).toHaveBeenCalledWith(['unknown']);

    const unknown = await mount(['unknown']);
    act(() =>
      unknown.renderer.root.findByProps({ testID: 'body-condition-unknown' }).props.onPress(),
    );
    expect(unknown.onChange).toHaveBeenCalledWith([]);
  });
});
