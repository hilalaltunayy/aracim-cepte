import { describe, expect, it } from 'vitest';
import { VEHICLE_BODY_TYPES } from '@/features/vehicles/config/bodyTypes';
import { getVehicle3DBodyFamily, getVehicle3DBodyProfile } from './bodyFamilies';

describe('vehicle 3D body families', () => {
  it('maps every supported body type to an optimized family', () => {
    for (const bodyType of VEHICLE_BODY_TYPES) {
      expect(getVehicle3DBodyFamily(bodyType.id), bodyType.id).not.toBeNull();
      expect(getVehicle3DBodyProfile(bodyType.id)?.length).toBeGreaterThan(4);
    }
  });

  it('keeps convertible families open and commercial proportions distinct', () => {
    expect(getVehicle3DBodyProfile('cabrio')).toMatchObject({ family: 'sport', openRoof: true });
    expect(getVehicle3DBodyProfile('pickup')).toMatchObject({ family: 'pickup', pickupBed: true });
    expect(getVehicle3DBodyProfile('van')!.roofHeight).toBeGreaterThan(
      getVehicle3DBodyProfile('sedan')!.roofHeight,
    );
  });
});
