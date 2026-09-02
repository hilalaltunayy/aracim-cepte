import { describe, expect, it } from 'vitest';
import {
  FREE_ENTITLEMENTS,
  PLAN_ENTITLEMENTS,
  canCreateVehicle,
  getAiAssistantPolicy,
  getEntitlements,
  getOcrInvocationPolicy,
  loadEntitlementsWithFallback,
} from './entitlements';

describe('premium entitlement foundation', () => {
  const now = new Date('2026-08-13T12:00:00.000Z');
  it('defaults existing, missing and malformed plans to Free', () => {
    expect(getEntitlements(null, now)).toBe(FREE_ENTITLEMENTS);
    expect(getEntitlements({ planId: 'unknown', validUntil: null }, now)).toBe(FREE_ENTITLEMENTS);
  });
  it('has centralized conservative Free and Premium values', () => {
    expect(PLAN_ENTITLEMENTS.free.maxVehicles).toBe(1);
    expect(PLAN_ENTITLEMENTS.premium.maxVehicles).toBe(3);
    expect(PLAN_ENTITLEMENTS.premium.ocrMonthlyQuota).toBeGreaterThan(
      PLAN_ENTITLEMENTS.free.ocrMonthlyQuota,
    );
    expect(PLAN_ENTITLEMENTS.premium.maxAttachmentsPerEntity).toBeGreaterThan(
      PLAN_ENTITLEMENTS.free.maxAttachmentsPerEntity,
    );
    expect(PLAN_ENTITLEMENTS.premium.maxStorageBytesPerUser).toBeGreaterThan(
      PLAN_ENTITLEMENTS.free.maxStorageBytesPerUser,
    );
    expect([
      PLAN_ENTITLEMENTS.free.maxVehiclePhotos,
      PLAN_ENTITLEMENTS.premium.maxVehiclePhotos,
    ]).toEqual([1, 5]);
    expect([
      PLAN_ENTITLEMENTS.free.customReminderTime,
      PLAN_ENTITLEMENTS.premium.customReminderTime,
    ]).toEqual([false, true]);
  });
  it('requires an active trusted Premium record and fails closed otherwise', () => {
    expect(
      getEntitlements({ planId: 'premium', validUntil: '2026-08-14T00:00:00.000Z' }, now),
    ).toBe(PLAN_ENTITLEMENTS.premium);
    expect(
      getEntitlements({ planId: 'premium', validUntil: '2026-08-13T11:59:59.000Z' }, now),
    ).toBe(FREE_ENTITLEMENTS);
    expect(getEntitlements({ planId: 'premium', validUntil: 'garbage' }, now)).toBe(
      FREE_ENTITLEMENTS,
    );
  });
  it('blocks only new vehicle actions after a downgrade', () => {
    expect(canCreateVehicle(0, FREE_ENTITLEMENTS)).toBe(true);
    expect(canCreateVehicle(1, FREE_ENTITLEMENTS)).toBe(false);
    expect(canCreateVehicle(2, PLAN_ENTITLEMENTS.premium)).toBe(true);
  });
  it('has one non-enforcing OCR hand-off', () => {
    expect(getOcrInvocationPolicy()).toEqual({ planId: 'free', monthlyQuota: 3 });
    expect(getOcrInvocationPolicy(PLAN_ENTITLEMENTS.premium)).toEqual({
      planId: 'premium',
      monthlyQuota: 30,
    });
  });
  it('exposes centralized AI quotas without becoming the server authority', () => {
    expect(getAiAssistantPolicy()).toEqual({ planId: 'free', monthlyQuota: 1, enabled: true });
    expect(getAiAssistantPolicy(PLAN_ENTITLEMENTS.premium)).toEqual({
      planId: 'premium',
      monthlyQuota: 50,
      enabled: true,
    });
  });
  it('fails closed when loading plan truth fails', async () => {
    await expect(
      loadEntitlementsWithFallback(async () => {
        throw new Error('offline');
      }),
    ).resolves.toBe(FREE_ENTITLEMENTS);
  });
});
