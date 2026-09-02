/* eslint-disable import/first */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => {
  class AnimatedValue {
    constructor(readonly value: number) {}
  }
  return {
    Animated: {
      Value: AnimatedValue,
      View: 'AnimatedView',
      timing: vi.fn(() => ({ start: vi.fn() })),
    },
    Pressable: 'Pressable',
    StyleSheet: {
      absoluteFill: { position: 'absolute' },
      create: <T,>(styles: T) => styles,
    },
    Text: 'Text',
    View: 'View',
  };
});

vi.mock('react-native-svg', () => ({
  default: 'Svg',
  Circle: 'Circle',
  G: 'G',
  Path: 'Path',
  Rect: 'Rect',
}));

vi.mock('@/shared/theme', () => {
  const colors = new Proxy(
    { bodyCondition: new Proxy({}, { get: (_target, key) => String(key) }) },
    { get: (target, key) => Reflect.get(target, key) ?? String(key) },
  );
  const metrics = new Proxy({}, { get: () => 12 });
  const textStyles = new Proxy({}, { get: () => ({}) });
  const theme = { colors };
  return {
    fontFamilies: new Proxy({}, { get: () => 'Inter' }),
    radii: metrics,
    spacing: metrics,
    typography: textStyles,
    useAppTheme: () => theme,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});

import { BodyDiagram } from '@/features/bodyCondition/BodyDiagram';
import { MiniBarChart } from '@/shared/components/MiniBarChart';

async function mount(element: React.JSX.Element): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(element);
  });
  return renderer!;
}

function findText(root: ReactTestInstance, value: string) {
  return root.find(
    (node) => String(node.type) === 'Text' && node.children.map(String).join('') === value,
  );
}

describe('TASK-012 narrow dashboard and body-header polish', () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
      .IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('allows the six-month caption to wrap inside a bounded flexible header', async () => {
    const renderer = await mount(
      <MiniBarChart
        data={[
          { key: '2026-03', label: 'Mar', total: 0 },
          { key: '2026-04', label: 'Nis', total: 100 },
          { key: '2026-05', label: 'May', total: 0 },
          { key: '2026-06', label: 'Haz', total: 200 },
          { key: '2026-07', label: 'Tem', total: 300 },
          { key: '2026-08', label: 'Ağu', total: 400 },
        ]}
      />,
    );
    const caption = findText(renderer.root, 'Aylık gider');
    expect(caption.props.style).toMatchObject({
      flexShrink: 1,
      maxWidth: '46%',
      textAlign: 'right',
    });
    expect(caption.parent?.props.style).toMatchObject({ flexDirection: 'row' });
  });

  it('renders the body tap hint with bounded centered narrow-screen styles', async () => {
    const renderer = await mount(
      <BodyDiagram
        bodyType="sedan_hatchback"
        conditions={[]}
        selectedPart="front_bumper"
        onSelect={vi.fn()}
      />,
    );
    const hint = findText(renderer.root, 'Parçaya dokunun');
    expect(hint.props.style).toMatchObject({ textAlign: 'center' });
    expect(hint.parent?.props.style).toMatchObject({
      alignItems: 'center',
      flexShrink: 1,
      maxWidth: '46%',
    });
  });
});
