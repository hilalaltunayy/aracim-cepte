import assert from 'node:assert/strict';
import test from 'node:test';
import { loadVehicleAssistantContext } from './vehicleAssistantContext.ts';

function mockClient(ownerId) {
  const selected = [];
  const tables = {
    vehicles: [
      {
        id: 'vehicle-a',
        owner_id: ownerId,
        brand: 'Kia',
        model: 'Sportage',
        year: 2022,
        current_km: 86400,
        color: 'Mavi',
        color_id: 'blue',
        fuel_type: 'diesel',
        body_type: 'suv',
        plate: '34 ABC 123',
      },
    ],
    vehicle_records: [
      {
        record_type: 'fuel',
        category: 'Yakıt',
        amount: 2000,
        record_date: '2026-08-01',
        kilometer: 85000,
        liters: 40,
      },
      {
        record_type: 'fuel',
        category: 'Yakıt',
        amount: 2100,
        record_date: '2026-08-10',
        kilometer: 85600,
        liters: 41,
      },
      {
        record_type: 'maintenance',
        category: 'Bakım',
        amount: 3000,
        record_date: '2026-01-01',
        kilometer: 77000,
        liters: null,
      },
    ],
    vehicle_documents: [
      { document_type: 'inspection', issue_date: '2025-08-25', expiry_date: '2026-08-25' },
    ],
    expertise_reports: [{ report_date: '2026-02-01' }],
    reminders: [
      {
        reminder_type: 'periodic_maintenance',
        due_date: '2026-08-20',
        due_kilometer: 87000,
        completed: false,
      },
    ],
  };
  return {
    selected,
    from(table) {
      const state = { table, data: tables[table] ?? [], error: null };
      const chain = {
        select(columns) {
          selected.push({ table, columns });
          return chain;
        },
        eq() {
          return chain;
        },
        is() {
          return chain;
        },
        maybeSingle() {
          return Promise.resolve({ data: state.data[0] ?? null, error: state.error });
        },
        then(resolve) {
          return Promise.resolve({ data: state.data, error: state.error }).then(resolve);
        },
      };
      return chain;
    },
  };
}

test('loads owner-scoped structured TASK-034 context without private fields', async () => {
  const client = mockClient('user-a');
  const loaded = await loadVehicleAssistantContext(
    client,
    'vehicle-a',
    'user-a',
    new Date('2026-08-15T12:00:00Z'),
  );
  assert.equal(loaded.ownerVerified, true);
  assert.equal(loaded.context.vehicle.displayName, 'Kia Sportage');
  assert.equal(loaded.context.maintenanceFacts.kmSinceLast, 9400);
  // Descriptive profile attributes are addressable on their own, not only fused
  // into displayName, so a direct lookup can be answered deterministically.
  assert.equal(loaded.context.vehicle.brand, 'Kia');
  assert.equal(loaded.context.vehicle.model, 'Sportage');
  assert.equal(loaded.context.vehicle.color, 'Mavi');
  assert.equal(loaded.context.vehicle.fuelType, 'Dizel');
  assert.equal(loaded.context.vehicle.bodyType, 'SUV');

  const serialized = JSON.stringify(loaded.context);
  for (const forbidden of ['plate', 'note', 'attachment', 'ocr', 'email', 'document_number']) {
    assert.equal(serialized.toLowerCase().includes(forbidden), false);
  }
  // The plate is loaded, but only into privateFacts: the context object is what
  // gets serialised into the provider prompt, so it must stay clean.
  assert.equal(loaded.privateFacts.plate, '34 ABC 123');
  assert.equal(serialized.includes('34 ABC 123'), false);
  for (const query of client.selected) {
    assert.equal(/note|attachment|ocr|email|title|document_number/i.test(query.columns), false);
  }
});

test('keeps the legacy free-text colour when a vehicle predates the colour taxonomy', async () => {
  const client = mockClient('user-a');
  const loaded = await loadVehicleAssistantContext(
    client,
    'vehicle-a',
    'user-a',
    new Date('2026-08-15T12:00:00Z'),
  );
  assert.equal(loaded.context.vehicle.color, 'Mavi');

  const legacy = mockClient('user-a');
  const original = legacy.from.bind(legacy);
  const legacyRow = {
    id: 'vehicle-a',
    owner_id: 'user-a',
    brand: 'Kia',
    model: 'Sportage',
    year: 2022,
    current_km: 86400,
    color: 'Lacivert',
    color_id: null,
    fuel_type: 'gasoline',
    body_type: 'sedan',
    plate: null,
  };
  legacy.from = (table) => {
    if (table !== 'vehicles') return original(table);
    // A self-returning chain, so the override survives select/eq/is.
    const chain = {
      select: () => chain,
      eq: () => chain,
      is: () => chain,
      maybeSingle: async () => ({ data: legacyRow, error: null }),
    };
    return chain;
  };
  const loadedLegacy = await loadVehicleAssistantContext(
    legacy,
    'vehicle-a',
    'user-a',
    new Date('2026-08-15T12:00:00Z'),
  );
  assert.equal(loadedLegacy.context.vehicle.color, 'Lacivert');
  assert.equal(loadedLegacy.privateFacts.plate, null);
});

test('fails closed when the RLS-scoped vehicle lookup returns no owned row', async () => {
  const client = mockClient('user-b');
  client.from = () => ({
    select() {
      return this;
    },
    eq() {
      return this;
    },
    is() {
      return this;
    },
    maybeSingle: async () => ({ data: null, error: null }),
  });
  assert.equal(await loadVehicleAssistantContext(client, 'vehicle-a', 'user-a'), null);
});
