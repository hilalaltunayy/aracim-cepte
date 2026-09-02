/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { appState, camera, gestureCallbacks, invalidate } = vi.hoisted(() => ({
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
    const builder = {
      maxPointers: () => builder,
      minDistance: () => builder,
      averageTouches: () => builder,
      onChange: (callback: (event: { changeX: number; changeY: number }) => void) => {
        if (kind === 'pan') gestureCallbacks.panChange = callback;
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
    camera.position.set.mockClear();
    camera.lookAt.mockClear();
    camera.updateProjectionMatrix.mockClear();
    invalidate.mockClear();
  });

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
