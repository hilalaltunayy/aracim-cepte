export function nextVehicleMileage(currentMileage: number, recordMileage: number | null): number {
  if (!Number.isFinite(currentMileage) || currentMileage < 0) return 0;
  if (recordMileage === null || !Number.isFinite(recordMileage) || recordMileage < 0) {
    return currentMileage;
  }
  return Math.max(currentMileage, Math.round(recordMileage));
}

export const VEHICLE_MILEAGE_CORRECTION_MESSAGE =
  'Girdiğiniz kilometre mevcut değerden düşük. Bu işlemi yalnızca kilometre düzeltmesi yapıyorsanız onaylayın.';

export function requiresVehicleMileageCorrection(
  currentMileage: number,
  enteredMileage: number,
): boolean {
  return Number.isFinite(enteredMileage) && enteredMileage < currentMileage;
}

export type EntityRouteState = 'create' | 'loading' | 'found' | 'missing';

export function resolveEntityRoute<T extends { id: string }>(
  id: string | undefined,
  entities: T[],
  bootstrapped: boolean,
): EntityRouteState {
  if (!id) return 'create';
  if (!bootstrapped) return 'loading';
  return entities.some((entity) => entity.id === id) ? 'found' : 'missing';
}

export function canStartMutation(loading: boolean): boolean {
  return !loading;
}
