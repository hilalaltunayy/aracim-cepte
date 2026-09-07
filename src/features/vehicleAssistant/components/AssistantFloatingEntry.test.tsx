/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { routerMock, loop, reducedMotion, windowSize } = vi.hoisted(() => ({
  routerMock: { push: vi.fn() },
  loop: { start: vi.fn(), stop: vi.fn() },
  reducedMotion: { value: false },
  windowSize: { width: 390, height: 844 },
}));

vi.mock('react-native', () => {
  class AnimatedValue {
    setValue = vi.fn();
    stopAnimation = vi.fn();
    interpolate = ({ outputRange }: { outputRange: unknown[] }) => ({
      __interp: true,
      value: outputRange[0],
    });
  }
  const runnable = { start: vi.fn(), stop: vi.fn() };
  return {
    Platform: { select: (spec: Record<string, unknown>) => spec.default ?? {} },
    Pressable: 'Pressable',
    StyleSheet: { create: <T,>(s: T) => s, absoluteFill: { position: 'absolute' } },
    View: 'View',
    useWindowDimensions: () => windowSize,
    Easing: {
      inOut: () => () => 0,
      out: () => () => 0,
      in: () => () => 0,
      sin: () => 0,
      quad: () => 0,
    },
    Animated: {
      Value: AnimatedValue,
      View: 'Animated.View',
      timing: () => runnable,
      sequence: () => runnable,
      delay: () => runnable,
      loop: () => loop,
    },
  };
});
vi.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
vi.mock('expo-router', () => ({ router: routerMock }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 34 }) }));
vi.mock('@/shared/hooks/useReducedMotion', () => ({
  useReducedMotion: () => reducedMotion.value,
}));
vi.mock('@/shared/theme', () => {
  const colors = new Proxy(
    { assistantGlass: new Proxy({}, { get: (_t, k) => `glass.${String(k)}` }) },
    { get: (target, key) => (key in target ? (target as never)[key] : String(key)) },
  );
  return {
    spacing: { md: 12, xl: 24 },
    useAppTheme: () => ({ colors }),
    useThemedStyles: (factory: (t: { colors: typeof colors }) => unknown) => factory({ colors }),
  };
});

import { AssistantFloatingEntry } from './AssistantFloatingEntry';

async function mount(): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<AssistantFloatingEntry />);
  });
  return renderer!;
}

const button = (renderer: ReactTestRenderer) =>
  renderer.root.findByProps({ testID: 'dashboard-assistant-entry' });
const anchor = (renderer: ReactTestRenderer) =>
  renderer.root.find(
    (node) =>
      String(node.type) === 'Animated.View' &&
      Array.isArray(node.props.style) &&
      node.props.style.some((s: unknown) => s && typeof s === 'object' && 'bottom' in (s as object)),
  );

describe('AssistantFloatingEntry', () => {
  beforeEach(() => {
    routerMock.push.mockClear();
    loop.start.mockClear();
    loop.stop.mockClear();
    reducedMotion.value = false;
    windowSize.width = 390;
    windowSize.height = 844;
  });

  const anchorStyle = (renderer: ReactTestRenderer) =>
    anchor(renderer).props.style.find(
      (s: unknown) => s && typeof s === 'object' && 'bottom' in (s as object),
    );

  it('renders unconditionally — no plan prop, no entitlement branch', async () => {
    const renderer = await mount();
    const control = button(renderer);
    expect(control).toBeDefined();
    expect(control.props.accessibilityRole).toBe('button');
    expect(control.props.accessibilityLabel).toBe('Araç Asistanını aç');
    expect(control.props.hitSlop).toBe(10);
  });

  it('navigates straight to the existing Vehicle Assistant route', async () => {
    const renderer = await mount();
    await act(async () => button(renderer).props.onPress());
    expect(routerMock.push).toHaveBeenCalledWith('/vehicle-assistant');
  });

  it('anchors above the tab bar from the real tab layout, not a fixed pixel', async () => {
    const renderer = await mount();
    const style = anchor(renderer).props.style.find(
      (s: unknown) => s && typeof s === 'object' && 'bottom' in (s as object),
    );
    // getBottomTabLayout(34): bottomOffset 34 + height (61 + 14) + spacing.md 12
    expect(style.bottom).toBe(121);
  });

  it('on a narrow phone, sits just inside the right edge — not a fixed right: 24', async () => {
    windowSize.width = 390;
    const renderer = await mount();
    // tabWidth (390-24)/5 = 73.2; boundary from right edge = 12 + 73.2 = 85.2;
    // right = max(24, 85.2 - 56/2) = 57.2
    expect(anchorStyle(renderer).right).toBeCloseTo(57.2);
  });

  it('on a wide/tablet layout, moves further in as the tabs spread out', async () => {
    windowSize.width = 800;
    const renderer = await mount();
    // tabWidth (800-24)/5 = 155.2; boundary from right edge = 12 + 155.2 = 167.2;
    // right = max(24, 167.2 - 28) = 139.2
    const style = anchorStyle(renderer);
    expect(style.right).toBeCloseTo(139.2);
    // The circle's centre (right + SIZE/2) lands on the last-two-tabs boundary,
    // one full tab-width in from the edge — never over the Settings tab.
    expect(style.right + 28).toBeCloseTo((800 - 24) / 5 + 12);
    expect(style.right).toBeGreaterThan(24);
  });

  it('runs the ambient float and glint loops, and stops them on unmount', async () => {
    const renderer = await mount();
    expect(loop.start).toHaveBeenCalled();
    await act(async () => renderer.unmount());
    expect(loop.stop).toHaveBeenCalled();
  });

  it('starts no animation loop when reduce-motion is on but stays fully usable', async () => {
    reducedMotion.value = true;
    const renderer = await mount();
    expect(loop.start).not.toHaveBeenCalled();
    await act(async () => button(renderer).props.onPress());
    expect(routerMock.push).toHaveBeenCalledWith('/vehicle-assistant');
  });
});
