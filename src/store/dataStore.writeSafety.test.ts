/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Vehicle } from '@/domain/entities';

const backend = vi.hoisted(() => ({
  vehicles: [] as Vehicle[],
  calls: [] as { action: string; vehicleId: string; id?: string }[],
}));

vi.mock('@/features/entitlements/services/entitlementService', () => ({
  loadEntitlementMirrorStatus: vi.fn(async () => 'premium'),
}));
vi.mock('@/features/entitlements/services/entitlementReconciliation', () => ({
  reconcileEntitlement: vi.fn(async () => 'applied'),
}));
vi.mock('@/data/repositories/SupabaseAppRepository', () => ({
  appRepository: {
    listVehicles: vi.fn(async () => backend.vehicles),
    loadVehicleData: vi.fn(async () => ({
      records: [],
      reminders: [],
      bodyConditions: [],
      expertiseReports: [],
      notes: [],
      documents: [],
      maintenanceTemplates: [],
      vehiclePhotos: [],
    })),
    reconcileVehicleData: vi.fn(async () => ({})),
    listVehiclePhotos: vi.fn(async () => []),
    saveRecord: vi.fn(async (vehicleId: string, _draft: unknown, id?: string) => {
      backend.calls.push({ action: 'saveRecord', vehicleId, id });
      return {};
    }),
    saveReminder: vi.fn(async (vehicleId: string, _draft: unknown, id?: string) => {
      backend.calls.push({ action: 'saveReminder', vehicleId, id });
      return { dueDate: null, notificationStatus: 'not_required', notificationErrorCode: null };
    }),
    saveDocument: vi.fn(async (vehicleId: string, _draft: unknown, id?: string) => {
      backend.calls.push({ action: 'saveDocument', vehicleId, id });
      return {};
    }),
    saveExpertise: vi.fn(async (vehicleId: string, _draft: unknown, id?: string) => {
      backend.calls.push({ action: 'saveExpertise', vehicleId, id });
      return {};
    }),
    saveNote: vi.fn(async (vehicleId: string, _draft: unknown, id?: string) => {
      backend.calls.push({ action: 'saveNote', vehicleId, id });
      return {};
    }),
    saveBodyCondition: vi.fn(async (vehicle: { id: string }) => {
      backend.calls.push({ action: 'saveBodyCondition', vehicleId: vehicle.id });
      return {};
    }),
    saveVehiclePhoto: vi.fn(async (vehicleId: string) => {
      backend.calls.push({ action: 'saveVehiclePhoto', vehicleId });
      return {};
    }),
    clearVehicleSection: vi.fn(async (vehicleId: string) => {
      backend.calls.push({ action: 'clearVehicleSection', vehicleId });
    }),
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
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: { getState: () => ({ markSessionExpired: vi.fn() }) },
}));

import { useDataStore } from './dataStore';
import { LOST_VEHICLE_TARGET_MESSAGE } from '@/features/vehicles/domain/vehicleWriteTarget';

const state = () => useDataStore.getState();

const vehicle = (id: string): Vehicle => ({
  id,
  ownerId: 'owner',
  brand: 'Kia',
  model: id === 'vehicle-a' ? 'Sportage' : 'Ceed',
  year: 2022,
  plate: null,
  currentKm: 10_000,
  fuelType: 'gasoline',
  bodyType: 'suv',
  colorId: 'white',
  color: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  archivedAt: null,
});

const A = 'vehicle-a';
const B = 'vehicle-b';

/** Bootstrap with two vehicles and A active, then switch the store to B. */
async function twoVehiclesWithBActive() {
  backend.vehicles = [vehicle(A), vehicle(B)];
  useDataStore.setState({ activeVehicleId: A });
  await state().bootstrap();
  useDataStore.setState({ activeVehicleId: B });
  backend.calls.length = 0;
}

const recordDraft = {
  recordType: 'fuel' as const,
  category: 'Yakıt',
  amount: 100,
  recordDate: '2026-01-02',
  kilometer: null,
  liters: 10,
  description: null,
};
const reminderDraft = {
  title: 'Bakım',
  reminderType: 'periodic_maintenance' as const,
  dueDate: null,
  dueKilometer: 20_000,
  notificationLeadDays: 1,
};

describe('vehicle-scoped writes target the captured vehicle, not the active one', () => {
  beforeEach(() => {
    backend.vehicles = [];
    backend.calls.length = 0;
    state().clear();
  });

  it('saves a reminder edit against its original vehicle after a switch to B', async () => {
    await twoVehiclesWithBActive();
    // The form captured A when it opened; B became active before submit.
    await state().saveReminder(A, reminderDraft, 'reminder-1');
    expect(backend.calls).toEqual([
      { action: 'saveReminder', vehicleId: A, id: 'reminder-1' },
    ]);
  });

  it('saves a reminder created for A even though B is active at submit time', async () => {
    await twoVehiclesWithBActive();
    await state().saveReminder(A, reminderDraft);
    expect(backend.calls[0]).toMatchObject({ action: 'saveReminder', vehicleId: A });
  });

  it.each([
    ['fuel/maintenance/expense record', (id: string) => state().saveRecord(id, recordDraft, 'r1')],
    ['document', (id: string) => state().saveDocument(id, { documentType: 'registration', title: 'X' } as never, 'd1')],
    ['expertise report', (id: string) => state().saveExpertise(id, { reportDate: null } as never, 'e1')],
    ['note', (id: string) => state().saveNote(id, { title: 'T', content: 'C' }, 'n1')],
    ['body condition', (id: string) => state().saveBodyCondition(id, 'hood', ['painted'], null)],
    ['vehicle photo', (id: string) => state().saveVehiclePhoto(id, { id: 'p1' } as never)],
    ['section clear', (id: string) => state().clearSection(id, 'records')],
  ])('keeps a %s on vehicle A while B is active', async (_label, run) => {
    await twoVehiclesWithBActive();
    await run(A);
    expect(backend.calls).toHaveLength(1);
    expect(backend.calls[0].vehicleId).toBe(A);
  });

  it('still writes to B when B really is the captured target', async () => {
    await twoVehiclesWithBActive();
    await state().saveRecord(B, recordDraft);
    expect(backend.calls[0]).toMatchObject({ action: 'saveRecord', vehicleId: B });
  });
});

describe('a target the account no longer owns fails loudly', () => {
  beforeEach(() => {
    backend.vehicles = [];
    backend.calls.length = 0;
    state().clear();
  });

  it('refuses to fall back to the active vehicle when the target is gone', async () => {
    backend.vehicles = [vehicle(B)];
    useDataStore.setState({ activeVehicleId: B });
    await state().bootstrap();
    backend.calls.length = 0;

    // A was deleted (or was never this account's vehicle).
    const saved = await state().saveReminder(A, reminderDraft, 'reminder-1');

    expect(saved).toBe(false);
    expect(backend.calls).toEqual([]);
    expect(state().error).toBe(LOST_VEHICLE_TARGET_MESSAGE);
  });

  it('blocks a write from a form left open across a sign-out', async () => {
    await twoVehiclesWithBActive();
    state().clear(); // sign-out empties the owner-scoped vehicle list

    const saved = await state().saveDocument(A, { documentType: 'registration' } as never);

    expect(saved).toBe(false);
    expect(backend.calls).toEqual([]);
    expect(state().error).toBe(LOST_VEHICLE_TARGET_MESSAGE);
  });

  it('blocks a write that would land on the next account after a re-login', async () => {
    await twoVehiclesWithBActive();
    state().clear();
    // A different account signs in with entirely different vehicles.
    backend.vehicles = [vehicle('vehicle-other')];
    useDataStore.setState({ activeVehicleId: 'vehicle-other' });
    await state().bootstrap();
    backend.calls.length = 0;

    const saved = await state().saveRecord(A, recordDraft);

    expect(saved).toBe(false);
    expect(backend.calls).toEqual([]);
  });

  it('reports a missing target without touching the repository', async () => {
    await twoVehiclesWithBActive();
    expect(await state().saveNote(null, { title: 'T', content: 'C' })).toBe(false);
    expect(backend.calls).toEqual([]);
  });
});
