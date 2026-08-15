import { describe, expect, it } from 'vitest';
import {
  createFuelEntryState,
  getFuelEntryValues,
  updateFuelEntry,
} from '@/features/fuel/domain/fuelEntry';
import type { NormalizedFuelPrice } from './fuelPrice';
import {
  applyFuelPriceSuggestion,
  getFuelPriceSuggestion,
  resolveFuelPriceFreshness,
  resolveFuelPriceSource,
} from './fuelPriceReference';

const reference: NormalizedFuelPrice = {
  source: 'epdk',
  fuelType: 'gasoline',
  provinceCode: '42',
  provinceName: 'Konya',
  brand: 'opet',
  providerBrand: 'OPET',
  referencePricePerLitre: 47.5,
  currency: 'TRY',
  effectiveDate: '2026-08-15',
  fetchedAt: '2026-08-15T10:00:00Z',
  freshness: 'current',
  granularity: 'province_brand',
  isEstimatedReference: true,
};

describe('Smart Fuel EPDK reference precedence', () => {
  it('uses EPDK only for an unknown price and calculates total-only litres after explicit acceptance', () => {
    const state = createFuelEntryState({ total: 2000 });
    const suggestion = getFuelPriceSuggestion(state, reference);
    expect(suggestion).toMatchObject({ canApply: true, estimatedLiters: 2000 / 47.5 });
    const applied = applyFuelPriceSuggestion(state, suggestion);
    expect(getFuelEntryValues(applied)).toMatchObject({ total: 2000, pricePerLiter: 47.5 });
    expect(getFuelEntryValues(applied).liters).toBeCloseTo(2000 / 47.5, 2);
  });

  it('never overwrites a user-confirmed or receipt-confirmed price', () => {
    const entered = createFuelEntryState({ total: 2000, pricePerLiter: 48.35 });
    const suggestion = getFuelPriceSuggestion(entered, reference);
    expect(suggestion).toMatchObject({ canApply: false, protectedByConfirmedPrice: true });
    expect(applyFuelPriceSuggestion(entered, suggestion)).toEqual(entered);
    expect(resolveFuelPriceSource({ receiptConfirmed: true, epdkAvailable: true })).toBe(
      'receipt_confirmed',
    );
    expect(resolveFuelPriceSource({ ocrConfirmed: true, epdkAvailable: true })).toBe(
      'ocr_confirmed',
    );
    expect(resolveFuelPriceSource({ manual: true, epdkAvailable: true })).toBe('manual');
    expect(resolveFuelPriceSource({ epdkAvailable: true })).toBe('epdk');
  });

  it('allows the accepted estimate to be manually overwritten and leaves manual flow safe without a provider value', () => {
    const applied = applyFuelPriceSuggestion(
      createFuelEntryState({ total: 1000 }),
      getFuelPriceSuggestion(createFuelEntryState({ total: 1000 }), reference),
    );
    const overwritten = updateFuelEntry(applied, 'pricePerLiter', '48,35');
    expect(getFuelEntryValues(overwritten).pricePerLiter).toBe(48.35);
    expect(getFuelPriceSuggestion(createFuelEntryState({ total: 500 }), null)).toBeNull();
  });

  it('labels cache age honestly and never calls stale data current', () => {
    const now = new Date('2026-08-15T12:00:00Z');
    expect(resolveFuelPriceFreshness('2026-08-15T01:00:00Z', now)).toBe('current');
    expect(resolveFuelPriceFreshness('2026-08-13T12:00:00Z', now)).toBe('recent');
    expect(resolveFuelPriceFreshness('2026-08-10T12:00:00Z', now)).toBe('stale');
    expect(resolveFuelPriceFreshness('invalid', now)).toBe('unknown');
  });
});
