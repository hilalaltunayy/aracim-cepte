/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { routerMock, loop, reducedMotion } = vi.hoisted(() => ({
  routerMock: { push: vi.fn() },
  loop: { start: vi.fn(), stop: vi.fn() },
  reducedMotion: { value: false },
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
  });

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
