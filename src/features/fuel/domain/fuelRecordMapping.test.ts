import { describe, expect, it } from 'vitest';
import type { Database } from '@/data/supabase/database.types';
import { mapRecord } from '@/data/mappers/databaseMappers';

type RecordRow = Database['public']['Tables']['vehicle_records']['Row'];

const row = (overrides: Partial<RecordRow> = {}): RecordRow => ({
  id: '10000000-0000-4000-8000-000000000001',
  vehicle_id: '20000000-0000-4000-8000-000000000001',
  owner_id: '30000000-0000-4000-8000-000000000001',
  record_type: 'fuel',
  category: 'Yakıt alımı',
  amount: 500,
  record_date: '2026-08-11',
  kilometer: null,
  liters: null,
  price_per_liter: null,
  station_brand: null,
  description: null,
  source: 'manual',
  created_at: '2026-08-11T09:00:00.000Z',
  updated_at: '2026-08-11T09:00:00.000Z',
  ...overrides,
});

describe('fuel record persistence mapping', () => {
  it('keeps legacy station-less and liters-unknown records readable without fake zeros', () => {
    expect(mapRecord(row())).toMatchObject({
      amount: 500,
      liters: null,
      pricePerLiter: null,
      stationBrand: null,
    });
  });

  it('restores normalized fuel details', () => {
    expect(
      mapRecord(row({ liters: 20, price_per_liter: 50, station_brand: 'petrol_ofisi' })),
    ).toMatchObject({ liters: 20, pricePerLiter: 50, stationBrand: 'petrol_ofisi' });
  });

  it('does not expose unsupported raw station IDs', () => {
    expect(mapRecord(row({ station_brand: 'unexpected' })).stationBrand).toBeNull();
  });
});
