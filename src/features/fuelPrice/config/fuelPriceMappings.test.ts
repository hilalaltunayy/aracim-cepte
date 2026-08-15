import { describe, expect, it } from 'vitest';
import {
  normalizeEpdkBrand,
  normalizeEpdkFuelType,
  normalizeEpdkProvince,
  toReferenceFuelType,
} from './fuelPriceMappings';

describe('EPDK fuel-price normalization', () => {
  it('normalizes Turkish provinces and preserves Istanbul side granularity', () => {
    expect(normalizeEpdkProvince('Konya')).toMatchObject({ code: '42', name: 'Konya' });
    expect(normalizeEpdkProvince('İSTANBUL (ANADOLU)')).toMatchObject({
      id: 'istanbul_anatolian',
      code: '34',
    });
    expect(normalizeEpdkProvince('İstanbul Avrupa')).toMatchObject({
      id: 'istanbul_european',
      code: '34',
    });
  });

  it('maps supported internal/provider fuel types and rejects unsupported types safely', () => {
    expect(toReferenceFuelType('gasoline')).toBe('gasoline');
    expect(toReferenceFuelType('electric')).toBeNull();
    expect(normalizeEpdkFuelType('Kurşunsuz Benzin 95 Oktan')).toBe('gasoline');
    expect(normalizeEpdkFuelType('Motorin (Biodizel ihtiva eden)')).toBe('diesel');
    expect(normalizeEpdkFuelType('Otogaz LPG')).toBe('lpg');
    expect(normalizeEpdkFuelType('Fuel Oil')).toBeNull();
  });

  it('maps only reliable known brands and leaves unknown labels unmatched', () => {
    expect(normalizeEpdkBrand('PETROL OFİSİ')).toBe('petrol_ofisi');
    expect(normalizeEpdkBrand('Shell&Turcas')).toBe('shell');
    expect(normalizeEpdkBrand('TotalEnergies')).toBe('totalenergies');
    expect(normalizeEpdkBrand('Bilinmeyen Dağıtıcı')).toBeNull();
  });
});
