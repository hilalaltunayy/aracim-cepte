import { describe, expect, it } from 'vitest';
import { mapBodyCondition } from '@/data/mappers/databaseMappers';
import type { Database } from '@/data/supabase/database.types';

type ParentRow = Database['public']['Tables']['body_part_conditions']['Row'];
type ValueRow = Database['public']['Tables']['body_part_condition_values']['Row'];

const parent: ParentRow = {
  id: 'parent-a',
  vehicle_id: 'vehicle-a',
  owner_id: 'owner-a',
  schema_type: 'sedan_hatchback',
  part_key: 'hood',
  condition: 'painted',
  condition_set_initialized: false,
  note: 'Legacy note',
  created_at: '2026-08-11T00:00:00.000Z',
  updated_at: '2026-08-11T00:00:00.000Z',
};

const value = (condition: ValueRow['condition']): ValueRow => ({
  id: `value-${condition}`,
  body_part_condition_id: parent.id,
  vehicle_id: parent.vehicle_id,
  owner_id: parent.owner_id,
  condition,
  created_at: parent.created_at,
});

describe('body condition persistence mapping', () => {
  it('maps a legacy parent row to a singleton without rewriting it', () => {
    expect(mapBodyCondition(parent)).toMatchObject({
      conditions: ['painted'],
      condition: 'painted',
      note: 'Legacy note',
    });
  });

  it('maps normalized child values while retaining the legacy representative', () => {
    expect(
      mapBodyCondition({ ...parent, condition: 'damaged', condition_set_initialized: true }, [
        value('painted'),
        value('damaged'),
      ]),
    ).toMatchObject({ conditions: ['painted', 'damaged'], condition: 'damaged' });
  });

  it('keeps an explicitly cleared set empty instead of fabricating unknown', () => {
    expect(
      mapBodyCondition({ ...parent, condition: 'unknown', condition_set_initialized: true }),
    ).toMatchObject({ conditions: [], condition: 'unknown' });
  });
});
