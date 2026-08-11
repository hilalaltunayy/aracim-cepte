import type { BodyType } from '@/domain/entities';

export type Vehicle3DMode = 'disabled' | 'ready' | 'unsupported';

export function getVehicle3DMode(enabled: boolean, bodyType?: BodyType | null): Vehicle3DMode {
  if (!enabled) return 'disabled';
  return bodyType === 'sedan' ? 'ready' : 'unsupported';
}
