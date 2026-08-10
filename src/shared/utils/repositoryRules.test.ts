import { describe, expect, it } from 'vitest';
import {
  canStartMutation,
  nextVehicleMileage,
  requiresVehicleMileageCorrection,
  resolveEntityRoute,
} from './repositoryRules';

describe('vehicle record mileage update rule', () => {
  it('raises current mileage only for a larger valid record mileage', () => {
    expect(nextVehicleMileage(50_000, 51_250)).toBe(51_250);
    expect(nextVehicleMileage(50_000, 49_000)).toBe(50_000);
    expect(nextVehicleMileage(50_000, null)).toBe(50_000);
    expect(nextVehicleMileage(50_000, -1)).toBe(50_000);
    expect(nextVehicleMileage(50_000, Number.NaN)).toBe(50_000);
  });

  it('requires explicit correction approval before lowering vehicle mileage', () => {
    expect(requiresVehicleMileageCorrection(50_000, 49_999)).toBe(true);
    expect(requiresVehicleMileageCorrection(50_000, 50_000)).toBe(false);
    expect(requiresVehicleMileageCorrection(50_000, 51_000)).toBe(false);
  });
});

describe('stale and invalid entity route IDs', () => {
  const entities = [{ id: 'known-id' }];

  it('distinguishes create, loading, found and deleted entities', () => {
    expect(resolveEntityRoute(undefined, entities, true)).toBe('create');
    expect(resolveEntityRoute('known-id', entities, false)).toBe('loading');
    expect(resolveEntityRoute('known-id', entities, true)).toBe('found');
    expect(resolveEntityRoute('deleted-id', entities, true)).toBe('missing');
  });
});

describe('duplicate submission guard', () => {
  it('allows the first mutation and rejects taps while a mutation is loading', () => {
    expect(canStartMutation(false)).toBe(true);
    expect(canStartMutation(true)).toBe(false);
  });
});
