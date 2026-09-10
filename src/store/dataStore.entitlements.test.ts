/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mirror, reconcile, repository } = vi.hoisted(() => ({
  mirror: { status: 'unknown' as 'unknown' | 'unavailable' | 'free' | 'premium', calls: 0 },
  reconcile: { calls: 0, outcome: 'applied' as const },
  repository: {
    vehicles: [] as { id: string; brand?: string; model?: string }[],
    saveVehicle: vi.fn(),
    saveReminder: vi.fn(),
  },
}));

vi.mock('@/features/entitlements/services/entitlementService', () => ({
  loadEntitlementMirrorStatus: vi.fn(async () => {
    mirror.calls += 1;
    return mirror.status;
  }),
}));
vi.mock('@/features/entitlements/services/entitlementReconciliation', () => ({
  reconcileEntitlement: vi.fn(async () => {
    reconcile.calls += 1;
    return reconcile.outcome;
  }),
}));
vi.mock('@/data/repositories/SupabaseAppRepository', () => ({
  appRepository: {
    listVehicles: vi.fn(async () => repository.vehicles),
    loadVehicleData: vi.fn(async () => ({})),
    reconcileVehicleData: vi.fn(async () => ({})),
    saveVehicle: repository.saveVehicle,
    saveReminder: repository.saveReminder,
  },
}));
vi.mock('@/data/storage/safeStorage', () => ({
  createSafeStringStorage: () => ({
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
  }),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined), removeItem: vi.fn(async () => undefined) },
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: { getState: () => ({ markSessionExpired: vi.fn() }) },
}));

import { useDataStore } from './dataStore';

const state = () => useDataStore.getState();

describe('data store entitlement lifecycle', () => {
  beforeEach(() => {
    mirror.status = 'unknown';
    mirror.calls = 0;
    reconcile.calls = 0;
    repository.vehicles = [];
    repository.saveVehicle.mockReset();
    repository.saveReminder.mockReset();
    repository.saveReminder.mockResolvedValue({
      id: 'r1',
      vehicleId: 'v1',
      dueDate: '2099-09-18',
      dueTime: '22:30',
      notificationStatus: 'scheduled',
      notificationErrorCode: null,
    });
    state().clear();
  });

  it('starts unknown rather than Free, with Free limits as the fail-closed default', () => {
    expect(state().entitlementStatus).toBe('unknown');
    expect(state().entitlements.planId).toBe('free');
    expect(state().entitlementAwaitingSync).toBe(false);
  });

  it('blocks an unresolved Add Vehicle attempt with verification, not a Free-limit error', async () => {
    const saved = await state().saveVehicle({ brand: 'Kia', model: 'Ceed' } as never);

    expect(saved).toBe(false);
    expect(repository.saveVehicle).not.toHaveBeenCalled();
    expect(state().error).toContain('doğrulanıyor');
    expect(state().error).not.toContain('en fazla 1');
  });

  it('unlocks Premium immediately from the store while the mirror still says Free', async () => {
    // Cold start: the mirror answers Free because the webhook has not landed.
    mirror.status = 'free';
    await state().bootstrap();
    expect(state().entitlementStatus).toBe('unknown');

    // RevenueCat then confirms the purchase through the single billing bridge.
    state().applyBillingStatus('premium');
    expect(state().entitlementStatus).toBe('premium');
    expect(state().entitlements.advancedReports).toBe(true);
    expect(state().entitlementAwaitingSync).toBe(true);
  });

  it('resolves Free only once both sources answered Free', async () => {
    mirror.status = 'free';
    await state().bootstrap();
    state().applyBillingStatus('free');
    expect(state().entitlementStatus).toBe('free');
    expect(state().entitlementAwaitingSync).toBe(false);
  });

  it('keeps a mirror-confirmed Premium even when the store reports Free', async () => {
    // A support grant exists only server-side.
    mirror.status = 'premium';
    await state().bootstrap();
    state().applyBillingStatus('free');
    expect(state().entitlementStatus).toBe('premium');
  });

  it('reconciles once, not per screen, and then re-reads the trusted mirror', async () => {
    mirror.status = 'free';
    await state().bootstrap();
    state().applyBillingStatus('premium');
    expect(state().entitlementAwaitingSync).toBe(true);

    mirror.status = 'premium';
    await Promise.all([state().syncEntitlements(), state().syncEntitlements()]);

    expect(reconcile.calls).toBe(1);
    expect(state().entitlementStatus).toBe('premium');
    expect(state().entitlementAwaitingSync).toBe(false);
  });

  it('does not spend a reconciliation round-trip when the sources already agree', async () => {
    mirror.status = 'premium';
    await state().bootstrap();
    state().applyBillingStatus('premium');
    await state().syncEntitlements();
    expect(reconcile.calls).toBe(0);
  });

  it('drops the previous account entitlement on sign-out so the next user cannot inherit it', async () => {
    mirror.status = 'premium';
    await state().bootstrap();
    state().applyBillingStatus('premium');
    expect(state().entitlementStatus).toBe('premium');

    state().clear();

    expect(state().entitlementStatus).toBe('unknown');
    expect(state().entitlements.planId).toBe('free');
    expect(state().billingStatus).toBe('unknown');
    expect(state().entitlementMirror).toBe('unknown');
  });

  it('survives a cold restart of the same Premium account without any user action', async () => {
    // Restart: stores are fresh, then both sources answer as they would on device.
    state().clear();
    mirror.status = 'premium';
    await state().bootstrap();
    expect(state().entitlementStatus).toBe('premium');
    expect(state().entitlements.ocrMonthlyQuota).toBe(30);
    expect(state().entitlements.maxAttachmentsPerEntity).toBe(10);
    expect(state().entitlements.aiDailyQuota).toBe(10);
    expect(state().entitlements.customReminderTime).toBe(true);
  });

  it('keeps Premium stable across repeated re-entry and never consumes the entitlement', async () => {
    // The device bug report: leave and re-enter the app several times.
    mirror.status = 'premium';
    await state().bootstrap();
    state().applyBillingStatus('premium');
    expect(state().entitlementStatus).toBe('premium');

    for (let reentry = 0; reentry < 5; reentry += 1) {
      await state().bootstrap();
      expect(state().entitlementStatus).toBe('premium');
      expect(state().entitlementAwaitingSync).toBe(false);
    }
    // Re-entry re-reads the trusted mirror but never triggers a self-grant or
    // a reconciliation round-trip while the two sources already agree.
    await state().syncEntitlements();
    expect(reconcile.calls).toBe(0);
    expect(state().entitlementStatus).toBe('premium');
  });

  it('does not let a second account on the same process inherit the first account Premium', async () => {
    mirror.status = 'premium';
    await state().bootstrap();
    state().applyBillingStatus('premium');
    expect(state().entitlementStatus).toBe('premium');

    // Sign out, then the next account signs in on the same warm process.
    state().clear();
    expect(state().entitlementStatus).toBe('unknown');

    mirror.status = 'free';
    await state().bootstrap();
    expect(state().entitlementStatus).not.toBe('premium');
    state().applyBillingStatus('free');
    expect(state().entitlementStatus).toBe('free');
    expect(state().entitlements.planId).toBe('free');
  });

  it('downgrades to Free once a real sandbox expiry lands in both sources', async () => {
    mirror.status = 'premium';
    await state().bootstrap();
    state().applyBillingStatus('premium');
    expect(state().entitlementStatus).toBe('premium');

    // Google Play license-test subscription expires: RevenueCat reports it
    // inactive and the webhook mirror flips to the expired/free plan.
    state().applyBillingStatus('free');
    mirror.status = 'free';
    await state().bootstrap();
    expect(state().entitlementStatus).toBe('free');
    expect(state().entitlements.maxVehicles).toBe(1);
  });

  it('does not bounce a store-only Premium create with a false server limit', async () => {
    // One vehicle already, RevenueCat active, webhook mirror still Free: the
    // server create gate would reject at the Free limit, so the client must hold
    // verifying and reconcile, not surface a hard "limit reached".
    repository.vehicles = [{ id: 'v1', brand: 'Kia', model: 'Ceed' }];
    mirror.status = 'free';
    await state().bootstrap();
    state().applyBillingStatus('premium');
    expect(state().entitlementStatus).toBe('premium');
    expect(state().entitlementServerConfirmed).toBe(false);

    const saved = await state().saveVehicle({ brand: 'VW', model: 'T-Roc' } as never);
    expect(saved).toBe(false);
    expect(repository.saveVehicle).not.toHaveBeenCalled();
    expect(state().error).toContain('doğrulanıyor');
    expect(state().error).not.toContain('limitinize ulaştınız');
    expect(state().error).not.toContain('en fazla 1');
    expect(reconcile.calls).toBeGreaterThan(0);
  });

  it('opens the second vehicle once the mirror confirms Premium', async () => {
    repository.vehicles = [{ id: 'v1', brand: 'Kia', model: 'Ceed' }];
    repository.saveVehicle.mockResolvedValue({ id: 'v2' });
    mirror.status = 'premium';
    await state().bootstrap();
    state().applyBillingStatus('premium');
    expect(state().entitlementServerConfirmed).toBe(true);

    const saved = await state().saveVehicle({ brand: 'VW', model: 'T-Roc' } as never);
    expect(saved).toBe(true);
    expect(repository.saveVehicle).toHaveBeenCalled();
  });

  it('keeps the Free limit definitive once the store itself reports Free', async () => {
    repository.vehicles = [{ id: 'v1', brand: 'Kia', model: 'Ceed' }];
    mirror.status = 'free';
    await state().bootstrap();
    state().applyBillingStatus('free');
    expect(state().entitlementStatus).toBe('free');

    const saved = await state().saveVehicle({ brand: 'VW', model: 'T-Roc' } as never);
    expect(saved).toBe(false);
    expect(state().error).toContain('en fazla 1');
  });

  it('confirms the mirror before a store-only Premium custom reminder time is written', async () => {
    repository.vehicles = [{ id: 'v1', brand: 'Kia', model: 'Ceed' }];
    mirror.status = 'free';
    await state().bootstrap();
    state().applyBillingStatus('premium');
    expect(state().entitlementServerConfirmed).toBe(false);

    // The webhook lands between the reconcile call and the write.
    repository.saveReminder.mockImplementation(async () => {
      expect(reconcile.calls).toBeGreaterThan(0);
      return {
        id: 'r1',
        vehicleId: 'v1',
        dueDate: '2099-09-18',
        dueTime: '22:30',
        notificationStatus: 'scheduled',
        notificationErrorCode: null,
      };
    });
    mirror.status = 'premium';

    const saved = await state().saveReminder(
      'v1',
      { title: 'Bakım', reminderType: 'periodic_maintenance', dueDate: '2099-09-18', dueTime: '22:30', dueKilometer: null, notificationLeadDays: 1 } as never,
      undefined,
    );
    expect(saved).toBe(true);
    expect(repository.saveReminder).toHaveBeenCalled();
  });

  it('does not spend a reconcile round-trip for a 09:00 or server-confirmed reminder', async () => {
    repository.vehicles = [{ id: 'v1', brand: 'Kia', model: 'Ceed' }];
    mirror.status = 'premium';
    await state().bootstrap();
    state().applyBillingStatus('premium');
    expect(state().entitlementServerConfirmed).toBe(true);

    await state().saveReminder(
      'v1',
      { title: 'Bakım', reminderType: 'periodic_maintenance', dueDate: '2099-09-18', dueTime: '22:30', dueKilometer: null, notificationLeadDays: 1 } as never,
      undefined,
    );
    expect(reconcile.calls).toBe(0);
  });

  it('clears a stale operational error on sign-out and via clearError', () => {
    useDataStore.setState({ error: 'Bir şeyler ters gitti' });
    state().clearError();
    expect(state().error).toBeNull();

    useDataStore.setState({ error: 'Kaydedilemedi' });
    state().clear();
    expect(state().error).toBeNull();
  });

  it('treats an unreadable mirror as unresolved while the store is still answering', async () => {
    mirror.status = 'unavailable';
    await state().bootstrap();
    state().applyBillingStatus('unknown');
    expect(state().entitlementStatus).toBe('unknown');
  });

  it('does not hang forever when the mirror is unreachable and the store says Free', async () => {
    mirror.status = 'unavailable';
    await state().bootstrap();
    state().applyBillingStatus('free');
    expect(state().entitlementStatus).toBe('free');
  });
});
