import { describe, expect, it, vi } from 'vitest';
import { normalizeEpdkProvince } from '../config/fuelPriceMappings';
import {
  EpdkFuelPriceProvider,
  parseEpdkDecimal,
  parseEpdkFuelPriceXml,
} from './EpdkFuelPriceProvider';

const petrolFixture = `
<response><kayit>
  <il>Konya</il><marka>OPET</marka><akaryakitTipi>Kurşunsuz Benzin 95 Oktan</akaryakitTipi>
  <fiyat>47,50</fiyat><tarih>15/08/2026</tarih>
</kayit><kayit>
  <il>Konya</il><marka>SHELL&TURCAS</marka><akaryakitTipi>Motorin</akaryakitTipi>
  <fiyat>49.250,75</fiyat><tarih>2026-08-15T08:00:00</tarih>
</kayit></response>`;

const lpgFixture = `
<response><tarife>
  <ilAdi>İSTANBUL (AVRUPA)</ilAdi><lisansSahibi>Aytemiz</lisansSahibi><urunAdi>Otogaz LPG</urunAdi>
  <satisFiyati>26,75</satisFiyati><tarifeTarihi>15.08.2026</tarifeTarihi>
</tarife></response>`;

describe('EpdkFuelPriceProvider', () => {
  it('parses a petrol XML fixture, Turkish decimals and effective dates', async () => {
    const source = {
      loadPetrolProvinceXml: vi.fn(async () => petrolFixture),
      loadLpgProvinceXml: vi.fn(async () => lpgFixture),
    };
    const provider = new EpdkFuelPriceProvider(source, () => new Date('2026-08-15T12:00:00Z'));
    const konya = normalizeEpdkProvince('Konya')!;
    const item = await provider.getLatestReferencePrice({
      province: konya,
      fuelType: 'gasoline',
      brand: 'opet',
    });

    expect(source.loadPetrolProvinceXml).toHaveBeenCalledWith({ provinceCode: '42' });
    expect(item).toMatchObject({
      source: 'epdk',
      fuelType: 'gasoline',
      provinceName: 'Konya',
      brand: 'opet',
      referencePricePerLitre: 47.5,
      effectiveDate: '2026-08-15',
      freshness: 'current',
      isEstimatedReference: true,
    });
    expect(parseEpdkDecimal('49.250,75')).toBe(49250.75);
  });

  it('parses LPG independently and retains Istanbul Avrupa granularity', async () => {
    const source = {
      loadPetrolProvinceXml: vi.fn(async () => petrolFixture),
      loadLpgProvinceXml: vi.fn(async () => lpgFixture),
    };
    const provider = new EpdkFuelPriceProvider(source, () => new Date('2026-08-15T12:00:00Z'));
    const item = await provider.getLatestReferencePrice({
      province: normalizeEpdkProvince('İstanbul Avrupa')!,
      fuelType: 'lpg',
      brand: 'aytemiz',
    });

    expect(source.loadLpgProvinceXml).toHaveBeenCalledWith({ provinceCode: '34' });
    expect(item).toMatchObject({
      fuelType: 'lpg',
      provinceName: 'İstanbul Avrupa',
      brand: 'aytemiz',
      referencePricePerLitre: 26.75,
      granularity: 'province_brand',
    });
  });

  it('contains provider input to the province code and rejects malformed/missing price XML', () => {
    expect(parseEpdkFuelPriceXml('not xml')).toEqual([]);
    expect(
      parseEpdkFuelPriceXml(
        '<response><kayit><il>Konya</il><akaryakitTipi>Motorin</akaryakitTipi></kayit></response>',
      ),
    ).toEqual([]);
  });

  it('does not falsely match an unfamiliar provider brand to the user-selected brand', async () => {
    const source = {
      loadPetrolProvinceXml: vi.fn(async () =>
        petrolFixture.replace('OPET', 'Bilinmeyen Dağıtıcı'),
      ),
      loadLpgProvinceXml: vi.fn(async () => lpgFixture),
    };
    const provider = new EpdkFuelPriceProvider(source, () => new Date('2026-08-15T12:00:00Z'));
    await expect(
      provider.getLatestReferencePrice({
        province: normalizeEpdkProvince('Konya')!,
        fuelType: 'gasoline',
        brand: 'opet',
      }),
    ).resolves.toBeNull();
  });
});
