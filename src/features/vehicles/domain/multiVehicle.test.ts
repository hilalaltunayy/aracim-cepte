import { describe, expect, it } from 'vitest';
import { PLAN_ENTITLEMENTS } from '@/features/entitlements/domain/entitlements';
import {
  canApplyVehicleData,
  getVehicleCapacity,
  getVehicleDisplayName,
  getVehicleLimitMessage,
} from './multiVehicle';

describe('multi-vehicle domain rules', () => {
  it('uses centralized Free and Premium capacity limits', () => {
    expect(getVehicleCapacity(0)).toMatchObject({ current: 0, maximum: 1, canAdd: true });
    expect(getVehicleCapacity(1)).toMatchObject({ current: 1, maximum: 1, canAdd: false });
    expect(
      [0, 1, 2].every((count) => getVehicleCapacity(count, PLAN_ENTITLEMENTS.premium).canAdd),
    ).toBe(true);
    expect(getVehicleCapacity(2, PLAN_ENTITLEMENTS.premium)).toMatchObject({
      current: 2,
      maximum: 3,
    });
    expect(getVehicleCapacity(3, PLAN_ENTITLEMENTS.premium).canAdd).toBe(false);
  });

  it('keeps downgrade vehicles readable while blocking only a new create', () => {
    const downgradedCapacity = getVehicleCapacity(3);
    expect(downgradedCapacity).toMatchObject({ current: 3, maximum: 1, canAdd: false });
  });

  it('fails closed when an entitlement snapshot is unavailable', () => {
    expect(getVehicleCapacity(1, undefined).canAdd).toBe(false);
  });

  it('keeps display names concise and exposes a capacity-safe message', () => {
    expect(getVehicleDisplayName({ brand: ' Kia ', model: ' Sportage ' })).toBe('Kia Sportage');
    expect(getVehicleLimitMessage({ maximum: 3 })).toContain('3 araç');
  });

  it('rejects stale vehicle bundle responses after an A to B switch', () => {
    expect(canApplyVehicleData('vehicle-b', 'vehicle-a', 1, 2)).toBe(false);
    expect(canApplyVehicleData('vehicle-b', 'vehicle-b', 2, 2)).toBe(true);
  });
});
