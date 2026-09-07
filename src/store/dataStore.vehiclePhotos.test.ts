/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Vehicle, VehiclePhoto } from '@/domain/entities';

const backend = vi.hoisted(() => ({
  vehicles: [] as Vehicle[],
  photosByVehicle: {} as Record<string, VehiclePhoto[]>,
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
    loadVehicleData: vi.fn(async (vehicleId: string) => ({
      records: [],
      reminders: [],
      bodyConditions: [],
      expertiseReports: [],
      notes: [],
      documents: [],
      maintenanceTemplates: [],
      vehiclePhotos: backend.photosByVehicle[vehicleId] ?? [],
    })),
    reconcileVehicleData: vi.fn(async () => ({})),
    listVehiclePhotos: vi.fn(async (vehicleId: string) => backend.photosByVehicle[vehicleId] ?? []),
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

const vehicle = (id: string, primaryPath: string | null): Vehicle => ({
  id,
  ownerId: 'owner',
  brand: 'Kia',
  model: 'Sportage',
  year: 2024,
  plate: null,
  currentKm: 1,
  fuelType: 'gasoline',
  bodyType: 'suv',
  colorId: 'white',
  color: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  archivedAt: null,
  primaryPhoto: primaryPath ? { id: `photo-${id}`, storagePath: primaryPath } : null,
});

const photo = (id: string, vehicleId: string, storagePath: string): VehiclePhoto => ({
  id,
  ownerId: 'owner',
  vehicleId,
  attachmentId: `att-${id}`,
  storagePath,
  isPrimary: true,
  sortOrder: 0,
  attachment: {
    id: `att-${id}`,
    ownerId: 'owner',
    vehicleId,
    parentType: 'vehicle_photo',
    parentId: id,
    source: 'gallery',
    originalName: 'p.jpg',
    storagePath,
    mimeType: 'image/jpeg',
    sizeBytes: 1,
    createdAt: '2026-09-02T00:00:00Z',
  },
  createdAt: '2026-09-02T00:00:00Z',
  updatedAt: '2026-09-02T00:00:00Z',
});

const PATH_A = 'owner/veh-a/vehicle_photo/photo-veh-a/att.jpg';
const PATH_B = 'owner/veh-b/vehicle_photo/photo-veh-b/att.jpg';

describe('data store — vehicle photo rehydration and isolation', () => {
  beforeEach(() => {
    backend.vehicles = [vehicle('veh-a', PATH_A)];
    backend.photosByVehicle = { 'veh-a': [photo('photo-veh-a', 'veh-a', PATH_A)] };
    state().clear();
    useDataStore.setState({ activeVehicleId: 'veh-a' });
  });

  it('restores the saved profile photo from the backend on cold bootstrap', async () => {
    await state().bootstrap();
    expect(state().vehiclePhotos.map((p) => p.storagePath)).toEqual([PATH_A]);
    expect(state().vehicles[0].primaryPhoto?.storagePath).toBe(PATH_A);
  });

  it('an app-state reset followed by bootstrap resolves the same photo', async () => {
    await state().bootstrap();
    state().clear();
    expect(state().vehiclePhotos).toEqual([]);
    expect(state().vehicles).toEqual([]);

    useDataStore.setState({ activeVehicleId: 'veh-a' });
    await state().bootstrap();
    expect(state().vehiclePhotos.map((p) => p.storagePath)).toEqual([PATH_A]);
  });

  it('logout wipes photo state so the next account cannot inherit it', async () => {
    await state().bootstrap();
    expect(state().vehiclePhotos).toHaveLength(1);

    state().clear(); // sign out

    // A different account signs in with its own (empty) photo set.
    backend.vehicles = [vehicle('veh-x', null)];
    backend.photosByVehicle = {};
    useDataStore.setState({ activeVehicleId: 'veh-x' });
    await state().bootstrap();

    expect(state().vehiclePhotos).toEqual([]);
    expect(state().vehicles[0].primaryPhoto ?? null).toBeNull();
  });

  it('two vehicles keep distinct photos with no cross-contamination', async () => {
    backend.vehicles = [vehicle('veh-a', PATH_A), vehicle('veh-b', PATH_B)];
    backend.photosByVehicle = {
      'veh-a': [photo('photo-veh-a', 'veh-a', PATH_A)],
      'veh-b': [photo('photo-veh-b', 'veh-b', PATH_B)],
    };
    await state().bootstrap();
    expect(state().vehiclePhotos.map((p) => p.storagePath)).toEqual([PATH_A]);

    await state().setActiveVehicle('veh-b');
    expect(state().vehiclePhotos.map((p) => p.storagePath)).toEqual([PATH_B]);

    await state().setActiveVehicle('veh-a');
    expect(state().vehiclePhotos.map((p) => p.storagePath)).toEqual([PATH_A]);
  });

  it('never persists a photo storage path or uri into AsyncStorage', () => {
    // partialize must not include vehiclePhotos / vehicles — they always reload
    // from the backend, so a stale local copy can never mask real state.
    const persisted = JSON.stringify(
      (useDataStore.persist.getOptions().partialize ?? ((s: unknown) => s))(state()),
    );
    expect(persisted).not.toContain('vehicle_photo');
    expect(persisted).not.toContain('storagePath');
    expect(persisted).not.toContain('primaryPhoto');
  });
});
