import { describe, expect, it } from 'vitest';
import { FREE_ENTITLEMENTS, PLAN_ENTITLEMENTS } from '@/features/entitlements/domain/entitlements';
import { getVehiclePhotoCapacity, orderVehiclePhotos } from './vehiclePhotoGallery';

describe('vehicle photo entitlement capacity', () => {
  it('keeps Free at one and Premium at five centralized photo slots', () => {
    expect(getVehiclePhotoCapacity(0, FREE_ENTITLEMENTS)).toMatchObject({ maximum: 1, canAdd: true });
    expect(getVehiclePhotoCapacity(1, FREE_ENTITLEMENTS)).toMatchObject({ maximum: 1, canAdd: false });
    expect(getVehiclePhotoCapacity(4, PLAN_ENTITLEMENTS.premium)).toMatchObject({ maximum: 5, canAdd: true });
    expect(getVehiclePhotoCapacity(5, PLAN_ENTITLEMENTS.premium)).toMatchObject({ maximum: 5, canAdd: false });
  });

  it('retains over-limit downgrade data while blocking only a new addition', () => {
    expect(getVehiclePhotoCapacity(5, FREE_ENTITLEMENTS)).toMatchObject({
      current: 5,
      maximum: 1,
      canAdd: false,
      isOverCapacity: true,
    });
  });

  it('keeps the selected primary photo first without mutable shared state', () => {
    const ordered = orderVehiclePhotos([
      { id: 'later', isPrimary: false, sortOrder: 1, createdAt: '2026-08-13T11:00:00.000Z' },
      { id: 'primary', isPrimary: true, sortOrder: 3, createdAt: '2026-08-13T12:00:00.000Z' },
      { id: 'first', isPrimary: false, sortOrder: 0, createdAt: '2026-08-13T10:00:00.000Z' },
    ] as never);
    expect(ordered.map((item) => item.id)).toEqual(['primary', 'first', 'later']);
  });
});
