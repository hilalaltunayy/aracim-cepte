import {
  normalizeEpdkBrand,
  normalizeEpdkFuelType,
  normalizeEpdkProvince,
} from '../config/fuelPriceMappings';
import { withFuelPriceFreshness } from '../domain/fuelPriceReference';
import type {
  FuelPriceProvider,
  FuelPriceQuery,
  NormalizedFuelPrice,
  ReferenceFuelType,
} from '../domain/fuelPrice';

export interface EpdkXmlSource {
  /** Trusted backend/cache adapter supplies XML. TASK-039 intentionally does not fetch from mobile UI. */
  loadPetrolProvinceXml(input: { provinceCode: string }): Promise<string>;
  loadLpgProvinceXml(input: { provinceCode: string }): Promise<string>;
}

interface EpdkRawPriceRow {
  province: string | null;
  brand: string | null;
  fuelType: string | null;
  price: string | null;
  effectiveDate: string | null;
}

const rowTags = ['kayit', 'kayıt', 'record', 'row', 'item', 'tarife', 'fiyatbilgisi'];
const provinceAliases = ['il', 'iladi', 'iladi', 'bolge', 'bölge', 'province'];
const brandAliases = ['marka', 'dagiticifirma', 'dağıtıcıfirma', 'lisanssahibi', 'firma', 'brand'];
const fuelAliases = [
  'akaryakittipi',
  'akaryakıttipi',
  'urun',
  'ürün',
  'urunadi',
  'ürünadı',
  'fueltype',
];
const priceAliases = [
  'fiyat',
  'satisfiyati',
  'satışfiyatı',
  'bayisatisfiyati',
  'bayisatışfiyatı',
  'price',
];
const dateAliases = ['tarih', 'tarifeTarihi', 'tarife_tarihi', 'date'];

function decodeXml(value: string) {
  return value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function directText(element: string, aliases: readonly string[]) {
  for (const alias of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(
      `<(?:(?:\\w+):)?${escaped}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${escaped}>`,
      'i',
    ).exec(element);
    if (match) return decodeXml(match[1].replace(/<[^>]+>/g, '').trim()) || null;
  }
  return null;
}

function normalizeDate(value: string | null) {
  if (!value) return null;
  const direct = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
  const turkish = /^(\d{1,2})[./](\d{1,2})[./](\d{4})/.exec(value.trim());
  if (!turkish) return null;
  return `${turkish[3]}-${turkish[2].padStart(2, '0')}-${turkish[1].padStart(2, '0')}`;
}

export function parseEpdkDecimal(value: string | null) {
  if (!value) return null;
  const stripped = value.replace(/[^0-9,.-]/g, '').trim();
  if (!stripped) return null;
  const normalized = stripped.includes(',')
    ? stripped.replace(/\./g, '').replace(',', '.')
    : stripped;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function rowBodies(xml: string) {
  const decoded = decodeXml(xml);
  const bodies: string[] = [];
  for (const tag of rowTags) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const expression = new RegExp(
      `<(?:(?:\\w+):)?${escaped}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${escaped}>`,
      'gi',
    );
    for (const match of decoded.matchAll(expression)) bodies.push(match[1]);
  }
  return bodies.length ? bodies : [decoded];
}

/** Isolated tolerant XML adapter for EPDK petrol/LPG response families. */
export function parseEpdkFuelPriceXml(xml: string): readonly EpdkRawPriceRow[] {
  if (!xml.trim() || !xml.includes('<')) return [];
  return rowBodies(xml)
    .map((body) => ({
      province: directText(body, provinceAliases),
      brand: directText(body, brandAliases),
      fuelType: directText(body, fuelAliases),
      price: directText(body, priceAliases),
      effectiveDate: directText(body, dateAliases),
    }))
    .filter((row) => row.province !== null && row.fuelType !== null && row.price !== null);
}

function normalizeRows(
  rows: readonly EpdkRawPriceRow[],
  fetchedAt: string,
): readonly NormalizedFuelPrice[] {
  return rows.flatMap((row) => {
    const province = normalizeEpdkProvince(row.province);
    const fuelType = normalizeEpdkFuelType(row.fuelType);
    const price = parseEpdkDecimal(row.price);
    const effectiveDate = normalizeDate(row.effectiveDate);
    if (!province || !fuelType || !price || !effectiveDate) return [];
    return [
      withFuelPriceFreshness({
        source: 'epdk',
        fuelType,
        provinceCode: province.code,
        provinceName: province.name,
        brand: normalizeEpdkBrand(row.brand),
        providerBrand: row.brand?.trim() || null,
        referencePricePerLitre: price,
        currency: 'TRY',
        effectiveDate,
        fetchedAt,
        granularity: row.brand ? 'province_brand' : 'province',
        isEstimatedReference: true,
      }),
    ];
  });
}

function matchesQuery(item: NormalizedFuelPrice, query: FuelPriceQuery) {
  if (item.provinceName !== query.province.name || item.fuelType !== query.fuelType) return false;
  // A row without a brand is a province-level fallback. A non-empty but unfamiliar provider label
  // must not be silently treated as the user's selected brand.
  return !query.brand || item.brand === query.brand || item.providerBrand === null;
}

export class EpdkFuelPriceProvider implements FuelPriceProvider {
  constructor(
    private readonly source: EpdkXmlSource,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getReferencePrices(query: FuelPriceQuery): Promise<readonly NormalizedFuelPrice[]> {
    const xml =
      query.fuelType === 'lpg'
        ? await this.source.loadLpgProvinceXml({ provinceCode: query.province.code })
        : await this.source.loadPetrolProvinceXml({ provinceCode: query.province.code });
    const fetchedAt = this.now().toISOString();
    return normalizeRows(parseEpdkFuelPriceXml(xml), fetchedAt).filter((item) =>
      matchesQuery(item, query),
    );
  }

  async getLatestReferencePrice(query: FuelPriceQuery): Promise<NormalizedFuelPrice | null> {
    const prices = await this.getReferencePrices(query);
    const exactBrand = query.brand ? prices.find((item) => item.brand === query.brand) : null;
    return exactBrand ?? prices[0] ?? null;
  }
}

/** Exists so future source adapters can reject unsupported internal fuel types before an XML request. */
export function supportsEpdkFuelType(value: string): value is ReferenceFuelType {
  return value === 'gasoline' || value === 'diesel' || value === 'lpg';
}
