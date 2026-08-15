import { FUEL_PRICE_FRESHNESS } from '../config/fuelPriceConfig';
import type { FuelPriceFreshness, FuelPriceSource, NormalizedFuelPrice } from './fuelPrice';
import {
  getFuelEntryValues,
  updateFuelEntry,
  type FuelEntryState,
  type FuelEntryValues,
} from '@/features/fuel/domain/fuelEntry';

export interface FuelPriceSuggestion {
  reference: NormalizedFuelPrice;
  estimatedLiters: number | null;
  canApply: boolean;
  protectedByConfirmedPrice: boolean;
}

export function resolveFuelPriceFreshness(
  fetchedAt: string | null | undefined,
  now = new Date(),
): FuelPriceFreshness {
  if (!fetchedAt) return 'unknown';
  const timestamp = new Date(fetchedAt).getTime();
  const age = now.getTime() - timestamp;
  if (!Number.isFinite(timestamp) || age < 0) return 'unknown';
  if (age <= FUEL_PRICE_FRESHNESS.currentMs) return 'current';
  if (age <= FUEL_PRICE_FRESHNESS.recentMs) return 'recent';
  return 'stale';
}

export function withFuelPriceFreshness(
  reference: Omit<NormalizedFuelPrice, 'freshness'>,
  now = new Date(),
): NormalizedFuelPrice {
  return { ...reference, freshness: resolveFuelPriceFreshness(reference.fetchedAt, now) };
}

/** Source precedence is centralized so EPDK only fills an otherwise unknown price. */
export function resolveFuelPriceSource(input: {
  receiptConfirmed?: boolean;
  ocrConfirmed?: boolean;
  manual?: boolean;
  epdkAvailable?: boolean;
}): FuelPriceSource {
  if (input.receiptConfirmed) return 'receipt_confirmed';
  if (input.ocrConfirmed) return 'ocr_confirmed';
  if (input.manual) return 'manual';
  if (input.epdkAvailable) return 'epdk';
  return 'unknown';
}

export function getFuelPriceSuggestion(
  state: FuelEntryState,
  reference: NormalizedFuelPrice | null | undefined,
): FuelPriceSuggestion | null {
  if (!reference || !reference.isEstimatedReference || reference.referencePricePerLitre <= 0)
    return null;
  const values = getFuelEntryValues(state);
  const protectedByConfirmedPrice = values.pricePerLiter !== null;
  return {
    reference,
    estimatedLiters:
      values.total !== null && !protectedByConfirmedPrice
        ? values.total / reference.referencePricePerLitre
        : null,
    canApply: !protectedByConfirmedPrice,
    protectedByConfirmedPrice,
  };
}

function formatPrice(value: number) {
  return value.toFixed(2).replace('.', ',');
}

/** Explicit acceptance turns the reference into a normal user-selected form value. */
export function applyFuelPriceSuggestion(
  state: FuelEntryState,
  suggestion: FuelPriceSuggestion | null,
): FuelEntryState {
  if (!suggestion?.canApply) return state;
  return updateFuelEntry(
    state,
    'pricePerLiter',
    formatPrice(suggestion.reference.referencePricePerLitre),
  );
}

export function calculateReferenceLiters(
  values: Pick<FuelEntryValues, 'total'>,
  referencePricePerLitre: number,
) {
  if (!values.total || values.total <= 0 || referencePricePerLitre <= 0) return null;
  const result = values.total / referencePricePerLitre;
  return Number.isFinite(result) && result > 0 ? result : null;
}
