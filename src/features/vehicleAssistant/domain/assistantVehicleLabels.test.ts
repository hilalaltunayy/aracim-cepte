import { describe, expect, it } from 'vitest';
import {
  BODY_LABELS,
  COLOR_LABELS,
  FUEL_LABELS,
} from '../../../../supabase/functions/_shared/vehicleAssistantContext';
import { VEHICLE_COLORS } from '@/features/vehicles/config/vehicleColors';
import { VEHICLE_BODY_TYPES } from '@/features/vehicles/config/bodyTypes';
import { fuelTypeLabels } from '@/shared/constants/labels';

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
});
