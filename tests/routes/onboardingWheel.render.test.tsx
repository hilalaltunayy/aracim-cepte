/* eslint-disable import/first */
import type { ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Regression guard for the fresh-install startup crash:
 *
 *   java.lang.ClassCastException: java.lang.String cannot be cast to
 *   java.lang.Double  at BaseViewManagerDelegate.setProperty(:126)
 *
 * The onboarding wheel animation fed a "…deg" string interpolation to the
 * react-native-svg <G rotation> prop. Under the New Architecture, RNSVG's
 * codegen delegate forwards `rotation` to BaseViewManagerDelegate, which
 * hard-casts to Double — so a degree string crashes at first render, and
 * `/onboarding` is the first screen on every fresh install.
 *
 * This test renders the real onboarding screen and asserts that whatever the
 * wheel groups receive for `rotation` resolves to a number.
 */

const { routerMock } = vi.hoisted(() => ({
  routerMock: { replace: vi.fn(), push: vi.fn(), back: vi.fn() },
}));

vi.mock('react-native', () => {
  class AnimatedValue {
    constructor(public _value: number) {}
    setValue = vi.fn((v: number) => {
      this._value = v;
    });
    stopAnimation = vi.fn();
    interpolate = ({ outputRange }: { inputRange: number[]; outputRange: unknown[] }) => ({
      __isInterpolation: true,
      outputRange,
      __getValue: () => outputRange[0],
    });
  }
  const timing = () => ({ start: (cb?: () => void) => cb?.() });
  return {
    AccessibilityInfo: { isReduceMotionEnabled: vi.fn(async () => true) },
    Animated: {
      Value: AnimatedValue,
      View: 'Animated.View',
      timing,
      sequence: () => ({ start: (cb?: () => void) => cb?.() }),
      parallel: () => ({ start: (cb?: () => void) => cb?.() }),
      stagger: () => ({ start: (cb?: () => void) => cb?.() }),
      createAnimatedComponent: (c: unknown) => c,
    },
    StyleSheet: { create: <T,>(s: T) => s, absoluteFill: {} },
    Text: 'Text',
    View: 'View',
  };
});
vi.mock('react-native-svg', () => ({
  default: 'Svg',
  Svg: 'Svg',
  Circle: 'Circle',
  G: 'G',
  Line: 'Line',
  Path: 'Path',
  Rect: 'Rect',
}));
vi.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
vi.mock('expo-router', () => ({ router: routerMock }));
vi.mock('@/shared/components/ui', () => ({
  AppButton: 'AppButton',
  Screen: ({ children }: { children?: ReactNode }) => children,
}));
vi.mock('@/shared/theme', () => ({
  fontFamilies: new Proxy({}, { get: () => 'Inter' }),
  radii: new Proxy({}, { get: () => 8 }),
  spacing: new Proxy({}, { get: () => 8 }),
  typography: new Proxy({}, { get: () => ({}) }),
  useAppTheme: () => ({ colors: new Proxy({}, { get: (_t, k) => String(k) }) }),
  useThemedStyles: (f: (t: unknown) => unknown) =>
    f({ colors: new Proxy({}, { get: (_t, k) => String(k) }) }),
}));
vi.mock('@/store/dataStore', () => ({
  useDataStore: () => ({ markOnboardingSeen: vi.fn() }),
}));

import OnboardingScreen from '@/app/onboarding';

describe('onboarding wheel rotation prop', () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  it('never hands a string to <G rotation> (would ClassCastException on device)', async () => {
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(<OnboardingScreen />);
    });

    const groups = renderer!.root.findAll(
      (n) => String(n.type) === 'G' && n.props.rotation !== undefined,
    );
    expect(groups.length).toBeGreaterThan(0);

    for (const g of groups) {
      const rotation = g.props.rotation as
        | number
        | string
        | { __isInterpolation?: boolean; outputRange?: unknown[] };
      if (rotation && typeof rotation === 'object' && rotation.__isInterpolation) {
        for (const value of rotation.outputRange ?? []) {
          expect(typeof value).toBe('number');
        }
      } else {
        expect(typeof rotation).toBe('number');
      }
    }
  });
});
