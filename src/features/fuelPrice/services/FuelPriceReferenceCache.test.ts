import { describe, expect, it, vi } from 'vitest';
import { normalizeEpdkProvince } from '../config/fuelPriceMappings';
import type { FuelPriceProvider, NormalizedFuelPrice } from '../domain/fuelPrice';
import { FuelPriceReferenceCache } from './FuelPriceReferenceCache';

const reference: NormalizedFuelPrice = {
  source: 'epdk',
  fuelType: 'gasoline',
  provinceCode: '42',
  provinceName: 'Konya',
  brand: null,
  providerBrand: null,
  referencePricePerLitre: 47.5,
  currency: 'TRY',
  effectiveDate: '2026-08-15',
  fetchedAt: '2026-08-15T10:00:00Z',
  freshness: 'current',
  granularity: 'province',
  isEstimatedReference: true,
};

describe('FuelPriceReferenceCache', () => {
  it('caches a controlled explicit refresh without polling and labels stale entries honestly', async () => {
    const provider: FuelPriceProvider = {
      getReferencePrices: vi.fn(async () => [reference]),
      getLatestReferencePrice: vi.fn(async () => reference),
    };
    let now = new Date('2026-08-15T12:00:00Z');
    const cache = new FuelPriceReferenceCache(provider, () => now);
    const query = { province: normalizeEpdkProvince('Konya')!, fuelType: 'gasoline' as const };

    expect(cache.getCached(query)).toBeNull();
    await expect(cache.refresh(query)).resolves.toMatchObject({ freshness: 'current' });
    expect(provider.getLatestReferencePrice).toHaveBeenCalledTimes(1);
    now = new Date('2026-08-20T12:00:00Z');
    expect(cache.getCached(query)).toMatchObject({ freshness: 'stale' });
    expect(provider.getLatestReferencePrice).toHaveBeenCalledTimes(1);
  });
});
