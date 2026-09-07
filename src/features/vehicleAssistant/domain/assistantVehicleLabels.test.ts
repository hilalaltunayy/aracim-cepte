import { describe, expect, it } from 'vitest';
import {
  BODY_CONDITION_LABELS,
  BODY_CONDITION_ORDER,
  BODY_LABELS,
  BODY_PART_LABELS,
  COLOR_LABELS,
  FUEL_LABELS,
} from '../../../../supabase/functions/_shared/vehicleAssistantContext';
import { VEHICLE_COLORS } from '@/features/vehicles/config/vehicleColors';
import { VEHICLE_BODY_TYPES } from '@/features/vehicles/config/bodyTypes';
import { fuelTypeLabels } from '@/shared/constants/labels';
import { bodySchemas } from '@/features/bodyCondition/schemas';
import {
  bodyConditionCatalog,
  bodyConditionLabels,
} from '@/features/bodyCondition/config/bodyConditions';

/**
 * The Edge Function cannot import the app catalogs: they resolve through the
 * `@/` alias, which Deno does not understand, so the assistant context carries
 * its own copy of the Turkish labels. These tests are the drift guard — adding
 * a colour or body type to the app without updating the assistant fails here
 * instead of silently showing the user a raw enum value like `station_wagon`.
 */
describe('assistant vehicle labels', () => {
  it('matches the canonical colour catalog exactly', () => {
    expect(COLOR_LABELS).toEqual(
      Object.fromEntries(VEHICLE_COLORS.map(({ id, label }) => [id, label])),
    );
  });

  it('matches the canonical fuel type labels exactly', () => {
    expect(FUEL_LABELS).toEqual({ ...fuelTypeLabels });
  });

  it('covers every normalized body type', () => {
    expect(BODY_LABELS).toEqual(
      Object.fromEntries(VEHICLE_BODY_TYPES.map(({ id, label }) => [id, label])),
    );
  });

  it('names every body panel of every schema, so no raw part key reaches the model', () => {
    const canonical = new Map<string, string>();
    for (const schema of Object.values(bodySchemas)) {
      for (const part of schema.parts) canonical.set(part.key, part.label);
    }
    expect(BODY_PART_LABELS).toEqual(Object.fromEntries(canonical));
  });

  it('matches the canonical body-condition labels and their display order', () => {
    expect(BODY_CONDITION_LABELS).toEqual({ ...bodyConditionLabels });
    // The order drives how "Boyalı + Hasarlı" is composed, so it must match too.
    expect(BODY_CONDITION_ORDER).toEqual(bodyConditionCatalog.map((condition) => condition.id));
  });
});
