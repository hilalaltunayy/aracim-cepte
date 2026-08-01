import type { Vehicle } from '@/domain/entities';

export function resolveActiveVehicleId(
  vehicles: readonly Vehicle[],
  preferredId: string | null,
): string | null {
  if (preferredId && vehicles.some((vehicle) => vehicle.id === preferredId)) return preferredId;
  return vehicles[0]?.id ?? null;
}

export type VehicleScreenState = 'loading' | 'ready' | 'empty';

export function resolveVehicleScreenState(input: {
  bootstrapped: boolean;
  vehicleFound: boolean;
}): VehicleScreenState {
  if (!input.bootstrapped) return 'loading';
  return input.vehicleFound ? 'ready' : 'empty';
}
