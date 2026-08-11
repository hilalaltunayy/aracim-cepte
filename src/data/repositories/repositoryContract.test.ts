import { describe, expect, it } from 'vitest';
import fixture from '../../../qa/seed-fixture.json';
import { RecordDraft, Vehicle, VehicleDraft, VehicleRecord } from '@/domain/entities';
import { getAllTimeTotal } from '@/shared/utils/analytics';
import { nextVehicleMileage } from '@/shared/utils/repositoryRules';

class InMemoryVehicleRepository {
  vehicles: Vehicle[] = [];
  records: VehicleRecord[] = [];
  private sequence = 0;

  saveVehicle(draft: VehicleDraft, id?: string): Vehicle {
    const now = '2026-07-15T12:00:00.000Z';
    const existing = id ? this.vehicles.find((vehicle) => vehicle.id === id) : undefined;
    const saved: Vehicle = {
      id: existing?.id ?? `vehicle-${++this.sequence}`,
      ownerId: 'owner-a',
      ...draft,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      archivedAt: null,
    };
    this.vehicles = existing
      ? this.vehicles.map((vehicle) => (vehicle.id === id ? saved : vehicle))
      : [...this.vehicles, saved];
    return saved;
  }

  deleteVehicle(id: string): void {
    this.vehicles = this.vehicles.filter((vehicle) => vehicle.id !== id);
    this.records = this.records.filter((record) => record.vehicleId !== id);
  }

  saveRecord(vehicleId: string, draft: RecordDraft, id?: string): VehicleRecord {
    const vehicle = this.vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) throw new Error('Vehicle not found');
    const now = '2026-07-15T12:00:00.000Z';
    const existing = id ? this.records.find((item) => item.id === id) : undefined;
    const saved: VehicleRecord = {
      id: existing?.id ?? `record-${++this.sequence}`,
      vehicleId,
      ownerId: 'owner-a',
      ...draft,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.records = existing
      ? this.records.map((item) => (item.id === id ? saved : item))
      : [...this.records, saved];
    vehicle.currentKm = nextVehicleMileage(vehicle.currentKm, draft.kilometer);
    return saved;
  }

  deleteRecord(id: string): void {
    this.records = this.records.filter((record) => record.id !== id);
  }

  listRecords(vehicleId: string): VehicleRecord[] {
    return this.records.filter((record) => record.vehicleId === vehicleId);
  }
}

const vehicleDraft = (brand: string): VehicleDraft => ({
  brand,
  model: 'QA',
  year: 2020,
  plate: null,
  currentKm: 10_000,
  fuelType: 'gasoline',
  bodyType: 'sedan_hatchback',
  colorId: null,
  color: null,
});

const recordDraft = (amount: number, kilometer: number | null): RecordDraft => ({
  recordType: 'expense',
  category: 'QA',
  amount,
  recordDate: '2026-07-15',
  kilometer,
  liters: null,
  description: null,
});

describe('repository CRUD contract', () => {
  it('creates, updates and deletes a vehicle without leaking child records', () => {
    const repository = new InMemoryVehicleRepository();
    const created = repository.saveVehicle(vehicleDraft('Kia'));
    expect(created.brand).toBe('Kia');
    expect(
      repository.saveVehicle({ ...vehicleDraft('Kia'), model: 'Sportage' }, created.id).model,
    ).toBe('Sportage');
    repository.saveRecord(created.id, recordDraft(100, 11_000));
    repository.deleteVehicle(created.id);
    expect(repository.vehicles).toHaveLength(0);
    expect(repository.records).toHaveLength(0);
  });

  it('recomputes derived totals after record create, edit and delete', () => {
    const repository = new InMemoryVehicleRepository();
    const vehicle = repository.saveVehicle(vehicleDraft('Kia'));
    const saved = repository.saveRecord(vehicle.id, recordDraft(100, 11_000));
    expect(repository.vehicles[0].currentKm).toBe(11_000);
    expect(getAllTimeTotal(repository.listRecords(vehicle.id))).toBe(100);
    repository.saveRecord(vehicle.id, recordDraft(175.5, 10_500), saved.id);
    expect(repository.vehicles[0].currentKm).toBe(11_000);
    expect(getAllTimeTotal(repository.listRecords(vehicle.id))).toBe(175.5);
    repository.deleteRecord(saved.id);
    expect(repository.vehicles[0].currentKm).toBe(11_000);
    expect(getAllTimeTotal(repository.listRecords(vehicle.id))).toBe(0);
  });

  it('keeps current mileage as a monotonic high-water mark for historical and unknown events', () => {
    const repository = new InMemoryVehicleRepository();
    const vehicle = repository.saveVehicle({ ...vehicleDraft('Kia'), currentKm: 150_000 });

    const historical = repository.saveRecord(vehicle.id, recordDraft(100, 148_000));
    expect(repository.vehicles[0].currentKm).toBe(150_000);

    repository.saveRecord(vehicle.id, recordDraft(50, null));
    expect(repository.vehicles[0].currentKm).toBe(150_000);

    const newest = repository.saveRecord(vehicle.id, recordDraft(200, 151_000));
    expect(repository.vehicles[0].currentKm).toBe(151_000);

    repository.saveRecord(vehicle.id, recordDraft(125, 147_000), historical.id);
    expect(repository.vehicles[0].currentKm).toBe(151_000);

    repository.deleteRecord(historical.id);
    expect(repository.vehicles[0].currentKm).toBe(151_000);
    repository.deleteRecord(newest.id);
    expect(repository.vehicles[0].currentKm).toBe(151_000);
  });

  it('keeps records isolated between two vehicles', () => {
    const repository = new InMemoryVehicleRepository();
    const vehicleA = repository.saveVehicle(vehicleDraft('Kia'));
    const vehicleB = repository.saveVehicle(vehicleDraft('Toyota'));
    repository.saveRecord(vehicleA.id, recordDraft(100, null));
    repository.saveRecord(vehicleB.id, recordDraft(200, null));
    expect(repository.listRecords(vehicleA.id).map((item) => item.amount)).toEqual([100]);
    expect(repository.listRecords(vehicleB.id).map((item) => item.amount)).toEqual([200]);
  });
});

describe('deterministic fixture vehicle scoping', () => {
  it.each([
    ['records', fixture.records],
    ['reminders', fixture.reminders],
    ['body conditions', fixture.bodyConditions],
    ['expertise reports', fixture.expertiseReports],
    ['notes', fixture.notes],
    ['documents', fixture.documents],
  ])('keeps %s assigned to exactly one declared vehicle', (_label, rows) => {
    const vehicleIds = new Set(fixture.vehicles.map((vehicle) => vehicle.id));
    expect(rows.every((row) => vehicleIds.has(row.vehicle_id))).toBe(true);
    for (const vehicle of fixture.vehicles) {
      const scoped = rows.filter((row) => row.vehicle_id === vehicle.id);
      expect(scoped.length).toBeGreaterThan(0);
      expect(scoped.every((row) => row.vehicle_id === vehicle.id)).toBe(true);
    }
  });
});
