/* eslint-disable import/first */
import type { ReactElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { sceneLifecycle } = vi.hoisted(() => ({
  sceneLifecycle: { mounts: 0, unmounts: 0 },
}));

vi.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));

vi.mock('@/shared/theme', () => {
  const colors = new Proxy({}, { get: (_target, key) => String(key) });
  const metrics = new Proxy({}, { get: () => 12 });
  const textStyles = new Proxy({}, { get: () => ({}) });
  const theme = { colors };
  return {
    radii: metrics,
    spacing: metrics,
    typography: textStyles,
    useAppTheme: () => theme,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});

vi.mock('./Sedan3DScene', async () => {
  const React = await import('react');
  function MockSedan3DScene({ vehicleColor }: { vehicleColor: string }) {
    React.useEffect(() => {
      sceneLifecycle.mounts += 1;
      return () => {
        sceneLifecycle.unmounts += 1;
      };
    }, []);
    return React.createElement('Sedan3DScene', { vehicleColor, testID: 'mock-sedan-scene' });
  }
  return {
    default: MockSedan3DScene,
  };
});

import { Vehicle3DErrorBoundary } from './Vehicle3DErrorBoundary';
import { Vehicle3DRegion } from './Vehicle3DRegion';
import { Vehicle3DViewportState } from './Vehicle3DViewportState';

async function mount(node: ReactElement): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(node);
  });
  return renderer!;
}

describe('isolated vehicle 3D region', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    sceneLifecycle.mounts = 0;
    sceneLifecycle.unmounts = 0;
  });

  it('renders nothing and never mounts the renderer when the flag is disabled', async () => {
    const renderer = await mount(
      <Vehicle3DRegion enabled={false} bodyType="sedan" colorId="red" />,
    );
    expect(renderer.toJSON()).toBeNull();
    expect(sceneLifecycle.mounts).toBe(0);
  });

  it('uses a calm fallback without mounting the renderer for unsupported and legacy bodies', async () => {
    const renderer = await mount(
      <Vehicle3DRegion enabled bodyType="suv_crossover" colorId="blue" />,
    );
    expect(renderer.root.findByProps({ testID: 'vehicle-3d-unsupported' })).toBeDefined();
    expect(sceneLifecycle.mounts).toBe(0);
  });

  it('lazy-mounts Sedan with TASK-018 color and neutral fallback color', async () => {
    const red = await mount(<Vehicle3DRegion enabled bodyType="sedan" colorId="red" />);
    expect(red.root.findByProps({ testID: 'mock-sedan-scene' }).props.vehicleColor).toBe('#C93B3B');
    await act(async () => red.unmount());

    const neutral = await mount(<Vehicle3DRegion enabled bodyType="sedan" colorId={null} />);
    expect(neutral.root.findByProps({ testID: 'mock-sedan-scene' }).props.vehicleColor).toBe(
      '#8A949C',
    );
    await act(async () => neutral.unmount());
  });

  it('keeps loading and rendering errors contained inside the viewport', async () => {
    const loading = await mount(<Vehicle3DViewportState state="loading" />);
    expect(loading.root.findByProps({ testID: 'vehicle-3d-loading' })).toBeDefined();

    function ThrowingScene(): never {
      throw new Error('sanitized-render-test');
    }
    const originalConsoleError = console.error;
    console.error = vi.fn();
    try {
      const failed = await mount(
        <Vehicle3DErrorBoundary>
          <ThrowingScene />
        </Vehicle3DErrorBoundary>,
      );
      expect(failed.root.findByProps({ testID: 'vehicle-3d-error' })).toBeDefined();
    } finally {
      console.error = originalConsoleError;
    }
  });

  it('cleans up every lazy scene across repeated mount and unmount cycles', async () => {
    for (let index = 0; index < 8; index += 1) {
      const renderer = await mount(<Vehicle3DRegion enabled bodyType="sedan" colorId="white" />);
      await act(async () => renderer.unmount());
    }
    expect(sceneLifecycle.mounts).toBe(8);
    expect(sceneLifecycle.unmounts).toBe(8);
  });
});
