export const VEHICLE_3D_CONFIG = {
  viewportHeight: 260,
  initialHorizontalDegrees: 32,
  initialVerticalDegrees: 18,
  minimumVerticalDegrees: -12,
  maximumVerticalDegrees: 72,
  initialCameraDistance: 6.2,
  minimumCameraDistance: 4.2,
  maximumCameraDistance: 8.4,
  horizontalSensitivity: 0.42,
  verticalSensitivity: 0.32,
  minimumPinchScale: 0.01,
  cameraTargetY: 0.35,
} as const;

export type Vehicle3DConfig = typeof VEHICLE_3D_CONFIG;
