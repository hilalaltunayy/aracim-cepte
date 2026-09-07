/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Vehicle } from '@/domain/entities';

const backend = vi.hoisted(() => ({
  vehicles: [] as Vehicle[],
  deletedIds: [] as string[],
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
    deleteVehicle: vi.fn(async (id: string) => {
      backend.deletedIds.push(id);
      backend.vehicles = backend.vehicles.filter((vehicle) => vehicle.id !== id);
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

import { useAssistantSessionStore } from '@/features/vehicleAssistant/state/assistantSessionStore';
import { useDataStore } from './dataStore';

const vehicle = (id: string): Vehicle => ({
  id,
  ownerId: 'owner',
  brand: 'Kia',
  model: id,
  year: 2024,
  plate: null,
  currentKm: 10_000,
  fuelType: 'gasoline',
  bodyType: 'suv',
  colorId: 'white',
  color: null,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const state = () => useDataStore.getState();

describe('vehicle deletion lifecycle', () => {
  beforeEach(() => {
    backend.vehicles = [];
    backend.deletedIds = [];
    state().clear();
    useAssistantSessionStore.getState().resetAllSessions();
  });

  it('selects a valid remaining vehicle and clears only the deleted vehicle assistant session', async () => {
    backend.vehicles = [vehicle('vehicle-a'), vehicle('vehicle-b'), vehicle('vehicle-c')];
    useDataStore.setState({ activeVehicleId: 'vehicle-c' });
    await state().bootstrap();
    useAssistantSessionStore
      .getState()
      .appendMessages('vehicle-a', [{ id: 'a1', role: 'user', text: 'A' }]);
    useAssistantSessionStore
      .getState()
      .appendMessages('vehicle-c', [{ id: 'c1', role: 'user', text: 'C' }]);

    await expect(state().deleteVehicle('vehicle-c')).resolves.toBe(true);

    expect(backend.deletedIds).toEqual(['vehicle-c']);
    expect(state().vehicles.map((item) => item.id)).toEqual(['vehicle-a', 'vehicle-b']);
    expect(state().activeVehicleId).toBe('vehicle-a');
    expect(useAssistantSessionStore.getState().threads['vehicle-c']).toBeUndefined();
    expect(useAssistantSessionStore.getState().threads['vehicle-a']).toHaveLength(1);
  });

  it('leaves no active vehicle after deleting the last vehicle', async () => {
    backend.vehicles = [vehicle('vehicle-a')];
    useDataStore.setState({ activeVehicleId: 'vehicle-a' });
    await state().bootstrap();

    await expect(state().deleteVehicle('vehicle-a')).resolves.toBe(true);

    expect(state().vehicles).toEqual([]);
    expect(state().activeVehicleId).toBeNull();
  });
});
