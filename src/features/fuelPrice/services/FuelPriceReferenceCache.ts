import type { FuelPriceProvider, FuelPriceQuery, NormalizedFuelPrice } from '../domain/fuelPrice';
import { withFuelPriceFreshness } from '../domain/fuelPriceReference';

function cacheKey(query: FuelPriceQuery) {
  return [query.province.id, query.fuelType, query.brand ?? 'all'].join(':');
}

/**
 * Bounded, in-memory cache for a future approved lookup action. It does not poll, persist, or run
 * on screen render. Stale values remain labeled as such and never silently become current.
 */
export class FuelPriceReferenceCache {
  private readonly entries = new Map<string, NormalizedFuelPrice>();

  constructor(
    private readonly provider: FuelPriceProvider,
    private readonly now: () => Date = () => new Date(),
  ) {}

  getCached(query: FuelPriceQuery) {
    const value = this.entries.get(cacheKey(query));
    return value ? withFuelPriceFreshness(value, this.now()) : null;
  }

  async refresh(query: FuelPriceQuery) {
    const next = await this.provider.getLatestReferencePrice(query);
    if (next) this.entries.set(cacheKey(query), next);
    return next ? withFuelPriceFreshness(next, this.now()) : null;
  }

  clear(query?: FuelPriceQuery) {
    if (query) this.entries.delete(cacheKey(query));
    else this.entries.clear();
  }
}
