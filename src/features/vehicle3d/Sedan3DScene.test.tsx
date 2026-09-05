/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { appState, camera, gestureCallbacks, invalidate, gestureConfig } = vi.hoisted(() => ({
  appState: { added: 0, removed: 0, callback: null as null | ((state: string) => void) },
  camera: {
    position: { set: vi.fn() },
    lookAt: vi.fn(),
    updateProjectionMatrix: vi.fn(),
  },
  invalidate: vi.fn(),
  gestureCallbacks: {
    panChange: null as null | ((event: { changeX: number; changeY: number }) => void),
    pinchBegin: null as null | (() => void),
    pinchUpdate: null as null | ((event: { scale: number }) => void),
  },
  gestureConfig: {
    pan: {} as Record<string, unknown[]>,
    pinch: {} as Record<string, unknown[]>,
  },
}));

vi.mock('react-native', () => ({
  AppState: {
    addEventListener: (_event: string, callback: (state: string) => void) => {
      appState.added += 1;
      appState.callback = callback;
      return { remove: () => (appState.removed += 1) };
    },
  },
  StyleSheet: { create: <T,>(styles: T) => styles },
  View: 'View',
}));

vi.mock('@react-three/fiber/native', async () => {
  const React = await import('react');
  return {
    Canvas: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement('Canvas', { ...props, testID: 'mock-canvas' }, children),
    useThree: () => ({ camera, invalidate }),
  };
});

vi.mock('react-native-gesture-handler', async () => {
  const React = await import('react');
  const createGesture = (kind: 'pan' | 'pinch') => {
    const record =
      (method: string) =>
      (...args: unknown[]) => {
        gestureConfig[kind][method] = args;
        return builder;
      };
    const builder = {
      maxPointers: record('maxPointers'),
      minDistance: record('minDistance'),
      averageTouches: record('averageTouches'),
      activeOffsetX: record('activeOffsetX'),
      activeOffsetY: record('activeOffsetY'),
      shouldCancelWhenOutside: record('shouldCancelWhenOutside'),
      onChange: (callback: (event: never) => void) => {
        if (kind === 'pan') {
          gestureCallbacks.panChange = callback as (event: {
            changeX: number;
            changeY: number;
          }) => void;
        } else {
          gestureCallbacks.pinchUpdate = callback as (event: { scale: number }) => void;
        }
        return builder;
      },
      onBegin: (callback: () => void) => {
        if (kind === 'pinch') gestureCallbacks.pinchBegin = callback;
        return builder;
      },
      onFinalize: () => builder,
      onUpdate: (callback: (event: { scale: number }) => void) => {
        if (kind === 'pinch') gestureCallbacks.pinchUpdate = callback;
        return builder;
      },
      runOnJS: () => builder,
    };
    return builder;
  };
  return {
    Gesture: {
      Pan: () => createGesture('pan'),
      Pinch: () => createGesture('pinch'),
      Simultaneous: (...gestures: unknown[]) => gestures,
    },
    GestureDetector: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('GestureDetector', null, children),
  };
});

vi.mock('@/shared/theme', () => ({
  useAppTheme: () => ({
    colors: { diagramBackground: '#F8FBFC', neutralSurface: '#EFF3F4' },
  }),
}));

import Sedan3DScene from './Sedan3DScene';
import { getVehicle3DBodyProfile } from './bodyFamilies';

async function mount(): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <Sedan3DScene vehicleColor="#C93B3B" profile={getVehicle3DBodyProfile('sedan')!} />,
    );
  });
  return renderer!;
}

describe('procedural Sedan 3D scene lifecycle', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    appState.added = 0;
    appState.removed = 0;
    appState.callback = null;
    gestureCallbacks.panChange = null;
    gestureCallbacks.pinchBegin = null;
    gestureCallbacks.pinchUpdate = null;
    gestureConfig.pan = {};
    gestureConfig.pinch = {};
    camera.position.set.mockClear();
    camera.lookAt.mockClear();
    camera.updateProjectionMatrix.mockClear();
    invalidate.mockClear();
  });

  it(
    'configures reliable one-finger orbit and two-finger pinch: neither gesture ' +
      'cancels when a finger briefly leaves the small viewport bounds',
    async () => {
      await mount();
      // A single finger must claim the drag on a small, quick movement in any
      // direction (predictable, near-immediate activation).
      expect(gestureConfig.pan.maxPointers).toEqual([1]);
      expect(gestureConfig.pan.activeOffsetX).toEqual([[-6, 6]]);
      expect(gestureConfig.pan.activeOffsetY).toEqual([[-6, 6]]);
      // Neither gesture may cancel just because a finger crosses the (short)
      // viewport edge — a real one-finger drag or two-finger pinch does this
      // constantly on a 260px-tall region.
      expect(gestureConfig.pan.shouldCancelWhenOutside).toEqual([false]);
      expect(gestureConfig.pinch.shouldCancelWhenOutside).toEqual([false]);
    },
  );

  it('mounts a static demand-render scene and drives the camera locally through gestures', async () => {
    const renderer = await mount();
    const canvas = renderer.root.findByProps({ testID: 'mock-canvas' });
    expect(canvas.props.frameloop).toBe('demand');
    expect(renderer.root.findByProps({ testID: 'vehicle-3d-scene' })).toBeDefined();
    expect(camera.position.set).toHaveBeenCalled();

    act(() => {
      gestureCallbacks.panChange?.({ changeX: 15, changeY: -8 });
      gestureCallbacks.pinchBegin?.();
      gestureCallbacks.pinchUpdate?.({ scale: 1.2 });
      appState.callback?.('active');
    });
    expect(camera.position.set.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(invalidate).toHaveBeenCalled();
    await act(async () => renderer.unmount());
    expect(appState.removed).toBe(1);
  });

  it('detaches AppState listeners on every repeated unmount', async () => {
    for (let index = 0; index < 5; index += 1) {
      const renderer = await mount();
      await act(async () => renderer.unmount());
    }
    expect(appState.added).toBe(5);
    expect(appState.removed).toBe(5);
  });
});
