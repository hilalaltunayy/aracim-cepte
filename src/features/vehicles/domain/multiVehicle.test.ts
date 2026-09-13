import { describe, expect, it, vi } from 'vitest';
import type { Vehicle } from '@/domain/entities';
import { PLAN_ENTITLEMENTS } from '@/features/entitlements/domain/entitlements';
import {
  canApplyVehicleData,
  getVehicleCapacity,
  getVehicleCreationGate,
  getVehicleDeletionOutcome,
  getVehicleAddBlockedDialog,
  getVehicleDisplayName,
  getVehicleLimitDialogButtons,
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

  it('keeps unknown entitlement out of the definitive Free-limit state', () => {
    expect(getVehicleCreationGate(1, 'unknown', undefined)).toMatchObject({
      status: 'verifying',
      reason: 'resolving',
    });
    expect(getVehicleCreationGate(1, 'free', undefined)).toMatchObject({
      status: 'limit_reached',
      capacity: { maximum: 1 },
    });
    expect(getVehicleCreationGate(2, 'premium', PLAN_ENTITLEMENTS.premium)).toMatchObject({
      status: 'allowed',
      capacity: { maximum: 3 },
    });
  });

  it('does not show a Free limit for store-only Premium the server has not confirmed', () => {
    // RevenueCat says Premium, the trusted mirror has not caught up: the server
    // create gate would still reject at the Free limit, so hold verifying rather
    // than open a form the server bounces with a false "limit reached".
    expect(getVehicleCreationGate(1, 'premium', PLAN_ENTITLEMENTS.premium, false)).toMatchObject({
      status: 'verifying',
      reason: 'server_confirmation',
    });
    // First vehicle is still within the Free limit, so it stays allowed.
    expect(getVehicleCreationGate(0, 'premium', PLAN_ENTITLEMENTS.premium, false)).toMatchObject({
      status: 'allowed',
    });
    // Once the mirror confirms Premium, the full capacity opens.
    expect(getVehicleCreationGate(1, 'premium', PLAN_ENTITLEMENTS.premium, true)).toMatchObject({
      status: 'allowed',
      capacity: { maximum: 3 },
    });
    expect(getVehicleCreationGate(2, 'premium', PLAN_ENTITLEMENTS.premium, true)).toMatchObject({
      status: 'allowed',
    });
    // Server-confirmed Premium at 3 vehicles is a real limit.
    expect(getVehicleCreationGate(3, 'premium', PLAN_ENTITLEMENTS.premium, true)).toMatchObject({
      status: 'limit_reached',
    });
  });

  it('still asserts the Free limit definitively once the store itself says Free', () => {
    expect(getVehicleCreationGate(1, 'free', undefined, false)).toMatchObject({
      status: 'limit_reached',
      capacity: { maximum: 1 },
    });
  });

  it('keeps display names concise and exposes a capacity-safe message', () => {
    expect(getVehicleDisplayName({ brand: ' Kia ', model: ' Sportage ' })).toBe('Kia Sportage');
    expect(getVehicleLimitMessage({ maximum: 3 })).toContain('3 araç');
  });

  describe('Add Vehicle limit dialog (TASK-014)', () => {
    it('lets the add through when there is room, so no dialog is shown', () => {
      expect(getVehicleAddBlockedDialog(0, 'free', PLAN_ENTITLEMENTS.free)).toBeNull();
      expect(getVehicleAddBlockedDialog(2, 'premium', PLAN_ENTITLEMENTS.premium)).toBeNull();
    });

    it('Free at 1/1 keeps the upgrade path, and the CTA routes to Premium', () => {
      const dialog = getVehicleAddBlockedDialog(1, 'free', PLAN_ENTITLEMENTS.free);
      expect(dialog).toMatchObject({ title: 'Araç sınırı', offerUpgrade: true });
      expect(dialog?.message).toContain('en fazla 1 araç');

      const onUpgrade = vi.fn();
      const buttons = getVehicleLimitDialogButtons(dialog!, onUpgrade);
      expect(buttons.map((button) => button.text)).toEqual(['Daha sonra', 'Premium’u incele']);
      buttons.find((button) => button.text === 'Premium’u incele')?.onPress?.();
      expect(onUpgrade).toHaveBeenCalledOnce();
    });

    it('Premium at 3/3 shows the max-3 limit with a single dismiss and no paywall', () => {
      const dialog = getVehicleAddBlockedDialog(3, 'premium', PLAN_ENTITLEMENTS.premium);
      expect(dialog).toMatchObject({ title: 'Araç sınırı', offerUpgrade: false });
      expect(dialog?.message).toContain('en fazla 3 araç');

      const onUpgrade = vi.fn();
      const buttons = getVehicleLimitDialogButtons(dialog!, onUpgrade);
      expect(buttons).toEqual([{ text: 'Tamam', style: 'cancel' }]);
      expect(buttons.some((button) => button.text === 'Premium’u incele')).toBe(false);
      buttons.forEach((button) => button.onPress?.());
      expect(onUpgrade).not.toHaveBeenCalled();
    });

    it('does not render the Free upgrade CTA while entitlement is still resolving', () => {
      // An unresolved plan falls back to Free limits, so 2 vehicles would look "over
      // the Free limit" for an account that may well be Premium.
      const dialog = getVehicleAddBlockedDialog(2, 'unknown', PLAN_ENTITLEMENTS.free);
      expect(dialog).toMatchObject({ offerUpgrade: false });
      expect(dialog?.message).toContain('doğrulanıyor');
      expect(dialog?.message).not.toContain('en fazla');

      const onUpgrade = vi.fn();
      const buttons = getVehicleLimitDialogButtons(dialog!, onUpgrade);
      expect(buttons).toEqual([{ text: 'Tamam', style: 'cancel' }]);
      buttons.forEach((button) => button.onPress?.());
      expect(onUpgrade).not.toHaveBeenCalled();
    });

    it('does not offer an upgrade that could not help a downgraded account at the Premium cap', () => {
      const dialog = getVehicleAddBlockedDialog(3, 'free', PLAN_ENTITLEMENTS.free);
      expect(dialog).toMatchObject({ title: 'Araç sınırı', offerUpgrade: false });
    });
  });

  it('rejects stale vehicle bundle responses after an A to B switch', () => {
    expect(canApplyVehicleData('vehicle-b', 'vehicle-a', 1, 2)).toBe(false);
    expect(canApplyVehicleData('vehicle-b', 'vehicle-b', 2, 2)).toBe(true);
  });

  it('selects a valid remaining vehicle after deleting active C and avoids Add Vehicle', () => {
    const remaining = [{ id: 'vehicle-a' }, { id: 'vehicle-b' }] as Vehicle[];
    expect(getVehicleDeletionOutcome(remaining, 'vehicle-c')).toEqual({
      activeVehicleId: 'vehicle-a',
      destination: '/(tabs)/vehicle',
    });
  });

  it('opens Add Vehicle only after the last vehicle is deleted', () => {
    expect(getVehicleDeletionOutcome([], 'vehicle-a')).toEqual({
      activeVehicleId: null,
      destination: '/vehicle/edit',
    });
  });
});
