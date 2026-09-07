import { describe, expect, it } from 'vitest';
import {
  getVehicleWriteTargetError,
  isVehicleWriteTargetOwned,
  LOST_VEHICLE_TARGET_MESSAGE,
  MISSING_VEHICLE_TARGET_MESSAGE,
  resolveVehicleWriteTarget,
} from './vehicleWriteTarget';

const vehicles = [{ id: 'vehicle-a' }, { id: 'vehicle-b' }];

describe('vehicle write target resolution', () => {
  it('keeps an existing record on its own vehicle, whatever is active', () => {
    // The reminder-edit P0: reminder belongs to A, B is active at submit time.
    expect(resolveVehicleWriteTarget('vehicle-a', 'vehicle-b')).toBe('vehicle-a');
  });

  it('uses the captured active vehicle for a new record', () => {
    expect(resolveVehicleWriteTarget(undefined, 'vehicle-a')).toBe('vehicle-a');
    expect(resolveVehicleWriteTarget(null, 'vehicle-a')).toBe('vehicle-a');
  });

  it('never invents a target when neither source has one', () => {
    expect(resolveVehicleWriteTarget(null, null)).toBeNull();
  });
});

describe('vehicle write target ownership', () => {
  it('accepts a vehicle this account still owns', () => {
    expect(isVehicleWriteTargetOwned('vehicle-a', vehicles)).toBe(true);
    expect(getVehicleWriteTargetError('vehicle-a', vehicles)).toBeNull();
  });

  it('rejects a target that is gone from the list rather than falling back', () => {
    // Deleted vehicle, or a stale capture after a switch away and back.
    expect(isVehicleWriteTargetOwned('vehicle-z', vehicles)).toBe(false);
    expect(getVehicleWriteTargetError('vehicle-z', vehicles)).toBe(LOST_VEHICLE_TARGET_MESSAGE);
  });

  it('rejects every target once the account signs out and the list empties', () => {
    for (const target of ['vehicle-a', 'vehicle-b']) {
      expect(getVehicleWriteTargetError(target, [])).toBe(LOST_VEHICLE_TARGET_MESSAGE);
    }
  });

  it('reports a missing target distinctly from a lost one', () => {
    expect(getVehicleWriteTargetError(null, vehicles)).toBe(MISSING_VEHICLE_TARGET_MESSAGE);
    expect(MISSING_VEHICLE_TARGET_MESSAGE).not.toBe(LOST_VEHICLE_TARGET_MESSAGE);
  });

  it('does not leak the vehicle identity in the lost-target message', () => {
    // After a sign-out the target belonged to the previous account.
    expect(LOST_VEHICLE_TARGET_MESSAGE).not.toContain('vehicle-');
  });
});
