/* eslint-disable import/first */
import { act, create } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@react-native-community/datetimepicker', () => ({ default: 'DateTimePicker' }));
vi.mock('@expo/vector-icons', async () => {
  const React = await import('react');
  return { Ionicons: (props: object) => React.createElement('Ionicons', props) };
});
vi.mock('@/shared/components/ui', async () => {
  const React = await import('react');
  function BottomSheet({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) {
    return React.createElement('BottomSheet', props, children);
  }
  return { BottomSheet };
});
vi.mock('@/shared/theme', () => {
  const theme = { colors: new Proxy({}, { get: (_target, key) => String(key) }) };
  return {
    radii: new Proxy({}, { get: () => 12 }),
    spacing: new Proxy({}, { get: () => 12 }),
    typography: new Proxy({}, { get: () => ({}) }),
    useAppTheme: () => theme,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});

import { ReminderScheduleFields } from './ReminderScheduleFields';

describe('ReminderScheduleFields', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  async function mount(canCustomizeTime: boolean, onTimeChange = vi.fn()) {
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(
        <ReminderScheduleFields
          date="2040-08-20"
          time="09:00"
          onDateChange={vi.fn()}
          onTimeChange={onTimeChange}
          canCustomizeTime={canCustomizeTime}
        />,
      );
    });
    return { renderer: renderer!, onTimeChange };
  }

  it('shows a complete fixed 09:00 state for Free users', async () => {
    const { renderer } = await mount(false);
    const values = renderer.root
      .findAll((node) => String(node.type) === 'Text')
      .map((node) => node.children.join(''));
    expect(values).toContain('Ücretsiz planda bildirimler 09:00’da gönderilir.');
    expect(
      renderer.root
        .findAll((node) => node.props.accessibilityLabel?.startsWith('Bildirim saati:'))
        .at(0)?.props.accessibilityState,
    ).toEqual({ disabled: true });
  });

  it('opens the quick month/year selector and lets Premium choose a new time', async () => {
    const { renderer, onTimeChange } = await mount(true);
    const header = renderer.root.find((node) =>
      node.props.accessibilityLabel?.includes('ay ve yıl seç'),
    );
    await act(async () => {
      header.props.onPress();
    });
    expect(renderer.root.find((node) => String(node.type) === 'BottomSheet').props.visible).toBe(
      true,
    );
    const time = renderer.root.find(
      (node) => node.props.accessibilityLabel === 'Bildirim saati: 09:00',
    );
    await act(async () => {
      time.props.onPress();
    });
    const picker = renderer.root.find((node) => String(node.type) === 'DateTimePicker');
    await act(async () => {
      picker.props.onChange({ type: 'set' }, new Date(2040, 7, 20, 14, 30));
    });
    expect(onTimeChange).toHaveBeenCalledWith('14:30');
  });
});
