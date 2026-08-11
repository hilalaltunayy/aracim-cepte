import { describe, expect, it } from 'vitest';
import type { Vehicle } from '@/domain/entities';
import { resolveActiveVehicleId, resolveVehicleScreenState } from './vehicleState';

const vehicle = (id: string): Vehicle => ({
  id,
  ownerId: 'owner',
  brand: 'Test',
  model: 'Araç',
  year: null,
  plate: null,
  currentKm: 0,
  fuelType: 'gasoline',
  bodyType: 'sedan_hatchback',
  colorId: null,
  color: null,
  createdAt: '',
  updatedAt: '',
  archivedAt: null,
});

describe('vehicle state recovery', () => {
  it('keeps a valid active vehicle and replaces a deleted id', () => {
    const vehicles = [vehicle('first'), vehicle('second')];
    expect(resolveActiveVehicleId(vehicles, 'second')).toBe('second');
    expect(resolveActiveVehicleId(vehicles, 'deleted')).toBe('first');
    expect(resolveActiveVehicleId([], 'deleted')).toBeNull();
  });

  it('never represents a completed no-vehicle bootstrap as a blank screen', () => {
    expect(resolveVehicleScreenState({ bootstrapped: false, vehicleFound: false })).toBe('loading');
    expect(resolveVehicleScreenState({ bootstrapped: true, vehicleFound: false })).toBe('empty');
    expect(resolveVehicleScreenState({ bootstrapped: true, vehicleFound: true })).toBe('ready');
  });
});
