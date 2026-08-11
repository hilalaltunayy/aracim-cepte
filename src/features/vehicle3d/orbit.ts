import { VEHICLE_3D_CONFIG, type Vehicle3DConfig } from './config';

export interface OrbitState {
  horizontalDegrees: number;
  verticalDegrees: number;
  cameraDistance: number;
}

export interface CameraPosition {
  x: number;
  y: number;
  z: number;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeDegrees(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return ((value % 360) + 360) % 360;
}

export function createInitialOrbit(config: Vehicle3DConfig = VEHICLE_3D_CONFIG): OrbitState {
  return {
    horizontalDegrees: config.initialHorizontalDegrees,
    verticalDegrees: config.initialVerticalDegrees,
    cameraDistance: config.initialCameraDistance,
  };
}

export function applyOrbitPan(
  current: OrbitState,
  changeX: number,
  changeY: number,
  config: Vehicle3DConfig = VEHICLE_3D_CONFIG,
): OrbitState {
  return {
    ...current,
    horizontalDegrees: normalizeDegrees(
      current.horizontalDegrees - changeX * config.horizontalSensitivity,
    ),
    verticalDegrees: clamp(
      current.verticalDegrees + changeY * config.verticalSensitivity,
      config.minimumVerticalDegrees,
      config.maximumVerticalDegrees,
    ),
  };
}

export function applyOrbitPinch(
  current: OrbitState,
  scaleChange: number,
  config: Vehicle3DConfig = VEHICLE_3D_CONFIG,
): OrbitState {
  const safeScale = Number.isFinite(scaleChange)
    ? Math.max(config.minimumPinchScale, scaleChange)
    : 1;
  return {
    ...current,
    cameraDistance: clamp(
      current.cameraDistance / safeScale,
      config.minimumCameraDistance,
      config.maximumCameraDistance,
    ),
  };
}

export function getOrbitCameraPosition(
  orbit: OrbitState,
  config: Vehicle3DConfig = VEHICLE_3D_CONFIG,
): CameraPosition {
  const horizontalRadians = (orbit.horizontalDegrees * Math.PI) / 180;
  const verticalRadians = (orbit.verticalDegrees * Math.PI) / 180;
  const horizontalDistance = orbit.cameraDistance * Math.cos(verticalRadians);
  return {
    x: horizontalDistance * Math.sin(horizontalRadians),
    y: config.cameraTargetY + orbit.cameraDistance * Math.sin(verticalRadians),
    z: horizontalDistance * Math.cos(horizontalRadians),
  };
}
