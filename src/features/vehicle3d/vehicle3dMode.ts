import type { BodyType } from '@/domain/entities';
import { getVehicle3DBodyFamily } from './bodyFamilies';

export type Vehicle3DMode = 'disabled' | 'ready' | 'unsupported';

export function getVehicle3DMode(enabled: boolean, bodyType?: BodyType | null): Vehicle3DMode {
  if (!enabled) return 'disabled';
  return getVehicle3DBodyFamily(bodyType) ? 'ready' : 'unsupported';
}
