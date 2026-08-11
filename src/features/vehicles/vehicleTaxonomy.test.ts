import { describe, expect, it } from 'vitest';
import type { BodyType, Vehicle, VehicleDraft } from '@/domain/entities';
import {
  getBodySchemaType,
  getVehicleBodyTypeLabel,
  getVehicleBodyTypeOptions,
  isNormalizedBodyType,
  VEHICLE_BODY_TYPES,
} from '@/features/vehicles/config/bodyTypes';
import {
  getVehicleColorDefinition,
  getVehicleColorLabel,
  getVehicleRenderColor,
  resolveLegacyVehicleColor,
  VEHICLE_COLORS,
} from '@/features/vehicles/config/vehicleColors';
import {
  getVehicleColorPersistence,
  getVehicleTaxonomyFormState,
  getVehicleTaxonomySummary,
} from '@/features/vehicles/domain/vehicleProfile';
import { getVehicleTaxonomyPersistenceFields } from '@/features/vehicles/services/vehiclePersistence';
import { bodySchemas } from '@/features/bodyCondition/schemas';
import { mapVehicle } from '@/data/mappers/databaseMappers';

const vehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
  id: 'vehicle-a',
  ownerId: 'user-a',
  brand: 'Test',
  model: 'Sedan',
  year: 2025,
  plate: null,
  currentKm: 15_000,
  fuelType: 'gasoline',
  bodyType: 'sedan',
  colorId: 'white',
  color: 'Beyaz',
  createdAt: '2026-08-11T00:00:00.000Z',
  updatedAt: '2026-08-11T00:00:00.000Z',
  archivedAt: null,
  ...overrides,
});

describe('vehicle body-type catalog', () => {
  it('contains exactly the 14 approved normalized body types', () => {
    expect(VEHICLE_BODY_TYPES.map(({ id }) => id)).toEqual([
      'sedan',
      'hatchback',
      'crossover',
      'suv',
      'station_wagon',
      'coupe',
      'cabrio',
      'roadster',
      'pickup',
      'mpv_minivan',
      'van',
      'sports_car',
      'campervan',
      'minibus',
    ]);
  });

  it.each(VEHICLE_BODY_TYPES)('maps $id to the user label $label', ({ id, label }) => {
    expect(getVehicleBodyTypeLabel(id)).toBe(label);
    expect(isNormalizedBodyType(id)).toBe(true);
  });

  it('keeps cabrio and roadster distinct', () => {
    expect(getVehicleBodyTypeLabel('cabrio')).toBe('Cabrio');
    expect(getVehicleBodyTypeLabel('roadster')).toBe('Roadster');
    expect('cabrio').not.toBe('roadster');
  });

  it('uses the approved MPV, sports car, campervan and minibus labels', () => {
    expect(getVehicleBodyTypeLabel('mpv_minivan')).toBe('MPV / Minivan');
    expect(getVehicleBodyTypeLabel('sports_car')).toBe('Sports Car');
    expect(getVehicleBodyTypeLabel('campervan')).toBe('Campervan');
    expect(getVehicleBodyTypeLabel('minibus')).toBe('Minibus');
  });

  it('does not expose legacy values for a new vehicle selector', () => {
    const options = getVehicleBodyTypeOptions();
    expect(options).toHaveLength(14);
    expect(options.some(({ value }) => value === 'sedan_hatchback')).toBe(false);
  });

  it('keeps a current legacy value readable without inventing a normalized value', () => {
    const options = getVehicleBodyTypeOptions('suv_crossover');
    expect(options[0]).toEqual({
      value: 'suv_crossover',
      label: 'SUV / Crossover (eski sınıflandırma)',
    });
    expect(getVehicleTaxonomyFormState(vehicle({ bodyType: 'suv_crossover' })).bodyType).toBe(
      'suv_crossover',
    );
  });

  it.each(VEHICLE_BODY_TYPES)('maps $id to an existing safe body diagram', ({ id }) => {
    const schemaType = getBodySchemaType(id);
    expect(bodySchemas[schemaType]).toBeDefined();
  });

  it('returns a safe label for a missing legacy body type', () => {
    expect(getVehicleBodyTypeLabel(null)).toBe('Gövde tipi belirtilmedi');
  });
});

describe('normalized vehicle color catalog', () => {
  it('contains all approved color IDs with Turkish labels', () => {
    expect(VEHICLE_COLORS.map(({ id }) => id)).toEqual([
      'white',
      'black',
      'gray',
      'silver',
      'red',
      'blue',
      'green',
      'brown',
      'beige',
      'gold',
      'yellow',
      'orange',
    ]);
    expect(getVehicleColorLabel('white')).toBe('Beyaz');
    expect(getVehicleColorLabel('silver')).toBe('Gümüş');
  });

  it.each(VEHICLE_COLORS)('provides a renderable fallback for $id', ({ id }) => {
    expect(getVehicleRenderColor(id)).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it.each([
    ['Beyaz', 'white'],
    ['White', 'white'],
    ['Siyah', 'black'],
    ['Grey', 'gray'],
    ['Gümüş', 'silver'],
    ['Kırmızı', 'red'],
  ] as const)('maps the supported legacy color %s to %s', (legacy, expected) => {
    expect(resolveLegacyVehicleColor(legacy)).toBe(expected);
  });

  it('keeps unknown legacy color text readable and uses a neutral render fallback', () => {
    expect(resolveLegacyVehicleColor('İnci Moru')).toBeNull();
    expect(getVehicleColorLabel(null, 'İnci Moru')).toBe('İnci Moru');
    expect(getVehicleRenderColor(null)).toBe('#8A949C');
  });

  it('does not overwrite an unknown legacy color when no catalog selection is made', () => {
    expect(getVehicleColorPersistence('', 'İnci Moru')).toEqual({
      colorId: null,
      color: 'İnci Moru',
    });
  });
});

describe('vehicle taxonomy persistence and presentation', () => {
  const draft: VehicleDraft = {
    brand: 'Test',
    model: 'SUV',
    year: 2026,
    plate: null,
    currentKm: 0,
    fuelType: 'hybrid',
    bodyType: 'suv',
    colorId: 'blue',
    color: 'Mavi',
  };

  it('persists normalized body and color IDs rather than UI labels', () => {
    expect(getVehicleTaxonomyPersistenceFields(draft)).toEqual({
      body_type: 'suv',
      color_id: 'blue',
      color: 'Mavi',
    });
  });

  it('restores normalized create/edit selections', () => {
    expect(getVehicleTaxonomyFormState(vehicle({ bodyType: 'crossover', colorId: 'red' }))).toEqual(
      { bodyType: 'crossover', colorId: 'red' },
    );
  });

  it('restores a deterministically recognized legacy color without persisting on open', () => {
    const legacy = vehicle({ colorId: null, color: 'Beyaz' });
    expect(getVehicleTaxonomyFormState(legacy)).toEqual({ bodyType: 'sedan', colorId: 'white' });
    expect(legacy.colorId).toBeNull();
    expect(legacy.color).toBe('Beyaz');
  });

  it('maps a recognized legacy DB color into the runtime colorId contract without changing text', () => {
    const row = {
      id: 'vehicle-legacy',
      owner_id: 'user-a',
      brand: 'Legacy',
      model: 'Vehicle',
      year: null,
      plate: null,
      current_km: 0,
      fuel_type: 'gasoline' as const,
      body_type: 'sedan_hatchback' as const,
      color_id: null,
      color: 'Beyaz',
      created_at: '2026-08-11T00:00:00.000Z',
      updated_at: '2026-08-11T00:00:00.000Z',
      archived_at: null,
    };
    expect(mapVehicle(row)).toMatchObject({ colorId: 'white', color: 'Beyaz' });
    expect(row.color_id).toBeNull();
  });

  it('creates a compact profile summary with user-facing labels only', () => {
    const summary = getVehicleTaxonomySummary(vehicle({ bodyType: 'suv', colorId: 'white' }));
    expect(summary).toBe('SUV · Beyaz');
    expect(summary).not.toContain('suv_crossover');
  });

  it('resolves every catalog definition by its stable color ID', () => {
    for (const definition of VEHICLE_COLORS) {
      expect(getVehicleColorDefinition(definition.id)).toEqual(definition);
    }
  });

  it('preserves arbitrary existing body enum values as typed legacy values', () => {
    const existingBody: BodyType = 'pickup_light_commercial';
    expect(getVehicleBodyTypeLabel(existingBody)).toBe(
      'Pickup / Hafif Ticari (eski sınıflandırma)',
    );
  });
});
