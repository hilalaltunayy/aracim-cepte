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
  const serialized = JSON.stringify(loaded.context);
  for (const forbidden of ['plate', 'note', 'attachment', 'ocr', 'email', 'document_number']) {
    assert.equal(serialized.toLowerCase().includes(forbidden), false);
  }
  for (const query of client.selected) {
    assert.equal(
      /plate|note|attachment|ocr|email|title|document_number/i.test(query.columns),
      false,
    );
  }
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
