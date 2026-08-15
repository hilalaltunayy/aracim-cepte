export const FUEL_PRICE_FRESHNESS = {
  currentMs: 24 * 60 * 60 * 1000,
  recentMs: 72 * 60 * 60 * 1000,
} as const;

/**
 * Production fetches stay disabled until written review covers commercial reuse, attribution,
 * cache duration, rate limits and operational ownership. This is deliberately not an env toggle.
 */
export const FUEL_PRICE_REFERENCE_AVAILABILITY = {
  enabled: false,
  reason: 'legal_review_required',
} as const;

export const EPDK_SOURCE_CATALOG = {
  petrolProvinceXml: 'https://lisansws.epdk.gov.tr/services/bildirimPetrolAkaryakitFiyatlari',
  lpgProvinceXml: 'https://lisansws.epdk.gov.tr/services/bildirimLPGTarife',
  officialCatalog: 'https://www.epdk.gov.tr/Detay/Icerik/3-0-226/web-servisler',
} as const;
