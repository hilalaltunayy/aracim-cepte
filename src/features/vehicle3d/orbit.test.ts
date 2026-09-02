import { describe, expect, it } from 'vitest';
import { VEHICLE_3D_CONFIG } from './config';
import {
  applyOrbitPan,
  applyOrbitPinch,
  createInitialOrbit,
  getOrbitCameraPosition,
  normalizeDegrees,
} from './orbit';
import { getVehicle3DMode } from './vehicle3dMode';

describe('vehicle 3D feature gating', () => {
  it('initializes every supported normalized or legacy body when enabled', () => {
    expect(getVehicle3DMode(false, 'sedan')).toBe('disabled');
    expect(getVehicle3DMode(true, 'sedan')).toBe('ready');
    expect(getVehicle3DMode(true, 'suv')).toBe('ready');
    expect(getVehicle3DMode(true, 'sedan_hatchback')).toBe('ready');
    expect(getVehicle3DMode(true, null)).toBe('unsupported');
  });
});

describe('bounded vehicle orbit', () => {
  it('wraps horizontal orbit continuously through 360 degrees', () => {
    expect(normalizeDegrees(721)).toBe(1);
    expect(normalizeDegrees(-1)).toBe(359);
    const rotated = applyOrbitPan(createInitialOrbit(), -1_000, 0);
    expect(rotated.horizontalDegrees).toBeGreaterThanOrEqual(0);
    expect(rotated.horizontalDegrees).toBeLessThan(360);
  });

  it('updates horizontal and vertical angles together for a diagonal drag', () => {
    const initial = createInitialOrbit();
    const next = applyOrbitPan(initial, 20, 20);
    expect(next.horizontalDegrees).not.toBe(initial.horizontalDegrees);
    expect(next.verticalDegrees).not.toBe(initial.verticalDegrees);
  });

  it('clamps vertical orbit without flipping the camera', () => {
    const initial = createInitialOrbit();
    expect(applyOrbitPan(initial, 0, -10_000).verticalDegrees).toBe(
      VEHICLE_3D_CONFIG.minimumVerticalDegrees,
    );
    expect(applyOrbitPan(initial, 0, 10_000).verticalDegrees).toBe(
      VEHICLE_3D_CONFIG.maximumVerticalDegrees,
    );
  });

  it('clamps pinch zoom to safe minimum and maximum distances', () => {
    const initial = createInitialOrbit();
    expect(applyOrbitPinch(initial, 100).cameraDistance).toBe(
      VEHICLE_3D_CONFIG.minimumCameraDistance,
    );
    expect(applyOrbitPinch(initial, 0).cameraDistance).toBe(
      VEHICLE_3D_CONFIG.maximumCameraDistance,
    );
  });

  it('always produces finite camera coordinates for bounded interaction', () => {
    const orbit = applyOrbitPinch(applyOrbitPan(createInitialOrbit(), 500, -800), 0.5);
    const position = getOrbitCameraPosition(orbit);
    expect(Object.values(position).every(Number.isFinite)).toBe(true);
  });
});
