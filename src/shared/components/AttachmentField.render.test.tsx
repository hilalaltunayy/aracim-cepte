/* eslint-disable import/first */
import type { ReactNode } from 'react';
import { act, create } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const pickerMocks = vi.hoisted(() => ({
  pickDocument: vi.fn(async () => null),
  pickImage: vi.fn(async () => null),
}));

vi.mock('react-native', () => ({
  Alert: { alert: vi.fn() },
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
vi.mock('@/data/storage/attachments', () => pickerMocks);
vi.mock('./ui', async () => {
  const React = await import('react');
  return {
    AppButton: ({ title, ...props }: Record<string, unknown> & { title?: ReactNode }) =>
      React.createElement('AppButton', { ...props, title }, title),
    Card: ({ children, ...props }: Record<string, unknown> & { children?: ReactNode }) =>
      React.createElement('Card', props, children),
  };
});
vi.mock('@/shared/theme', () => {
  const colors = new Proxy({}, { get: (_target, key) => String(key) });
  const theme = { colors };
  return {
    spacing: { sm: 8 },
    typography: { label: {} },
    useAppTheme: () => theme,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});

import { AttachmentField } from './AttachmentField';

describe('attachment picker route state', () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  it('opens both supported pickers and treats cancellation as a safe no-op', async () => {
    const onPick = vi.fn();
    let renderer: ReturnType<typeof create> | undefined;
    await act(async () => {
      renderer = create(
        <AttachmentField picked={null} existingPath={null} onPick={onPick} onRemove={vi.fn()} />,
      );
    });
    for (const title of ['Fotoğraf seç', 'Belge seç']) {
      const button = renderer!.root.findByProps({ title });
      await act(async () => button.props.onPress());
    }
    expect(pickerMocks.pickImage).toHaveBeenCalledOnce();
    expect(pickerMocks.pickDocument).toHaveBeenCalledOnce();
    expect(onPick).not.toHaveBeenCalled();
  });
});
