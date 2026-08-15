import type { FuelStationId } from '@/domain/entities';

/** Supported by the official price-reference adapters. Hybrid/electric vehicles are intentionally excluded. */
export type ReferenceFuelType = 'gasoline' | 'diesel' | 'lpg';
export type FuelPriceSource = 'receipt_confirmed' | 'ocr_confirmed' | 'manual' | 'epdk' | 'unknown';
export type FuelPriceFreshness = 'current' | 'recent' | 'stale' | 'unknown';
export type FuelPriceGranularity = 'province_brand' | 'province' | 'market_average';

export interface FuelPriceProvince {
  /** Stable internal key; Istanbul sides are intentionally distinct. */
  id: string;
  /** EPDK's province traffic code when the official source supports it. */
  code: string;
  name: string;
}

export interface FuelPriceQuery {
  province: FuelPriceProvince;
  fuelType: ReferenceFuelType;
  brand?: FuelStationId | null;
}

/**
 * A market reference, never a confirmed transaction or a physical-station price.
 * `providerBrand` is retained only for transparent matching; it is not a user-entered station.
 */
export interface NormalizedFuelPrice {
  source: 'epdk';
  fuelType: ReferenceFuelType;
  provinceCode: string;
  provinceName: string;
  brand: FuelStationId | null;
  providerBrand: string | null;
  referencePricePerLitre: number;
  currency: 'TRY';
  effectiveDate: string;
  fetchedAt: string;
  freshness: FuelPriceFreshness;
  granularity: FuelPriceGranularity;
  isEstimatedReference: true;
}

export interface FuelPriceProvider {
  getReferencePrices(query: FuelPriceQuery): Promise<readonly NormalizedFuelPrice[]>;
  getLatestReferencePrice(query: FuelPriceQuery): Promise<NormalizedFuelPrice | null>;
}

/** Future-only boundary: no alert scheduling or monitoring is implemented in TASK-039. */
export interface FuelPriceAlertRuleInput {
  vehicleId: string;
  province: FuelPriceProvince;
  fuelType: ReferenceFuelType;
  thresholdChangePercent: number;
}

/** Future-only tool input: an AI layer must call a trusted provider, never EPDK directly. */
export interface FuelPriceAssistantToolInput {
  province: FuelPriceProvince;
  fuelType: ReferenceFuelType;
  brand?: FuelStationId | null;
}

export interface FuelPriceReferenceAvailability {
  enabled: boolean;
  reason: 'disabled' | 'legal_review_required' | 'ready';
}
