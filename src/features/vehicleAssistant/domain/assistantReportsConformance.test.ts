import { describe, expect, it } from 'vitest';
import type { Vehicle, VehicleRecord } from '@/domain/entities';
import { buildVehicleReport } from '@/features/reports/domain/vehicleReports';
import { loadVehicleAssistantContext } from '../../../../supabase/functions/_shared/vehicleAssistantContext';

/**
 * The assistant context is built inside a Deno Edge Function, which cannot
 * import `vehicleReports.ts` (it resolves through the `@/` alias). It therefore
 * carries its own bounded aggregation instead of calling the Reports engine.
 *
 * That duplication is only safe if the numbers agree, so this test runs both
 * over the same records and asserts they match. A divergence in either engine
 * fails here instead of surfacing as an assistant answer that contradicts the
 * Reports screen.
 */

const ANCHOR = new Date('2026-08-15T12:00:00Z');
const VEHICLE_ID = 'vehicle-a';
const OWNER = 'user-a';

const vehicle: Vehicle = {
  id: VEHICLE_ID,
  ownerId: OWNER,
  brand: 'Kia',
  model: 'Sportage',
  year: 2022,
  plate: null,
  currentKm: 86_400,
  fuelType: 'diesel',
  bodyType: 'suv',
  colorId: 'blue',
  color: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  archivedAt: null,
};

/** Dates chosen to sit inside both engines' three-month window on the anchor. */
const rows = [
  { record_type: 'fuel', amount: 2000, record_date: '2026-07-01', kilometer: 84_000, liters: 40 },
  { record_type: 'fuel', amount: 2100, record_date: '2026-08-10', kilometer: 85_600, liters: 41 },
  { record_type: 'maintenance', amount: 3000, record_date: '2026-07-20', kilometer: 84_800, liters: null },
  { record_type: 'expense', amount: 500, record_date: '2026-08-01', kilometer: null, liters: null },
];

const appRecords: VehicleRecord[] = rows.map((row, index) => ({
  id: `record-${index}`,
  vehicleId: VEHICLE_ID,
  ownerId: OWNER,
  recordType: row.record_type as VehicleRecord['recordType'],
  category:
    row.record_type === 'fuel' ? 'Yakıt' : row.record_type === 'maintenance' ? 'Bakım' : 'Diğer',
  amount: row.amount,
  recordDate: row.record_date,
  kilometer: row.kilometer,
  liters: row.liters,
  description: null,
  createdAt: `${row.record_date}T00:00:00Z`,
  updatedAt: `${row.record_date}T00:00:00Z`,
}));

function mockClient() {
  const tables: Record<string, Record<string, unknown>[]> = {
    vehicles: [
      {
        id: VEHICLE_ID,
        owner_id: OWNER,
        brand: 'Kia',
        model: 'Sportage',
        year: 2022,
        current_km: 86_400,
        color: null,
        color_id: 'blue',
        fuel_type: 'diesel',
        body_type: 'suv',
        plate: null,
        updated_at: '2026-08-01T00:00:00Z',
      },
    ],
    vehicle_records: rows,
    vehicle_documents: [],
    expertise_reports: [],
    reminders: [],
    body_part_conditions: [],
    body_part_condition_values: [],
  };
  return {
    from(table: string) {
      const data = tables[table] ?? [];
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.is = () => chain;
      chain.maybeSingle = async () => ({ data: data[0] ?? null, error: null });
      chain.then = (resolve: (value: { data: unknown; error: null }) => void) =>
        Promise.resolve({ data, error: null }).then(resolve);
      return chain;
    },
  };
}

describe('assistant totals agree with the canonical Reports calculations', () => {
  it('reports the same recorded, fuel and maintenance spend for the same window', async () => {
    const report = buildVehicleReport(appRecords, vehicle, 'three_months', ANCHOR);
    const loaded = await loadVehicleAssistantContext(mockClient(), VEHICLE_ID, OWNER, ANCHOR);
    const cost = loaded!.context.costFacts;

    expect(cost.recordedCost).toBe(report.totalCost);
    expect(cost.fuelSpend).toBe(report.fuelCost);
    expect(cost.maintenanceSpend).toBe(report.maintenanceCost);
  });

  it('reports the same fuel litres and average price per litre', async () => {
    const report = buildVehicleReport(appRecords, vehicle, 'three_months', ANCHOR);
    const loaded = await loadVehicleAssistantContext(mockClient(), VEHICLE_ID, OWNER, ANCHOR);
    const fuel = loaded!.context.fuelFacts;

    expect(fuel.totalLiters).toBe(report.fuelLiters);
    // The assistant rounds to 2dp before the value reaches the prompt; the
    // underlying figure is the same one Reports shows.
    expect(fuel.averagePricePerLiter).toBeCloseTo(report.averageFuelPrice!, 2);
  });

  it('keeps the assistant recent-spend split consistent with its own total', async () => {
    const loaded = await loadVehicleAssistantContext(mockClient(), VEHICLE_ID, OWNER, ANCHOR);
    const cost = loaded!.context.costFacts;
    const other = Number(cost.recordedCost) - Number(cost.fuelSpend) - Number(cost.maintenanceSpend);
    const report = buildVehicleReport(appRecords, vehicle, 'three_months', ANCHOR);
    expect(other).toBe(report.otherCost);
  });
});
