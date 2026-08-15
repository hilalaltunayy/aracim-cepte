import type { FuelType, FuelStationId } from '@/domain/entities';
import type { FuelPriceProvince, ReferenceFuelType } from '../domain/fuelPrice';

type ProvinceInput = readonly [code: string, name: string];

const provinceInputs: readonly ProvinceInput[] = [
  ['01', 'Adana'],
  ['02', 'Adıyaman'],
  ['03', 'Afyonkarahisar'],
  ['04', 'Ağrı'],
  ['05', 'Amasya'],
  ['06', 'Ankara'],
  ['07', 'Antalya'],
  ['08', 'Artvin'],
  ['09', 'Aydın'],
  ['10', 'Balıkesir'],
  ['11', 'Bilecik'],
  ['12', 'Bingöl'],
  ['13', 'Bitlis'],
  ['14', 'Bolu'],
  ['15', 'Burdur'],
  ['16', 'Bursa'],
  ['17', 'Çanakkale'],
  ['18', 'Çankırı'],
  ['19', 'Çorum'],
  ['20', 'Denizli'],
  ['21', 'Diyarbakır'],
  ['22', 'Edirne'],
  ['23', 'Elazığ'],
  ['24', 'Erzincan'],
  ['25', 'Erzurum'],
  ['26', 'Eskişehir'],
  ['27', 'Gaziantep'],
  ['28', 'Giresun'],
  ['29', 'Gümüşhane'],
  ['30', 'Hakkâri'],
  ['31', 'Hatay'],
  ['32', 'Isparta'],
  ['33', 'Mersin'],
  ['34', 'İstanbul'],
  ['35', 'İzmir'],
  ['36', 'Kars'],
  ['37', 'Kastamonu'],
  ['38', 'Kayseri'],
  ['39', 'Kırklareli'],
  ['40', 'Kırşehir'],
  ['41', 'Kocaeli'],
  ['42', 'Konya'],
  ['43', 'Kütahya'],
  ['44', 'Malatya'],
  ['45', 'Manisa'],
  ['46', 'Kahramanmaraş'],
  ['47', 'Mardin'],
  ['48', 'Muğla'],
  ['49', 'Muş'],
  ['50', 'Nevşehir'],
  ['51', 'Niğde'],
  ['52', 'Ordu'],
  ['53', 'Rize'],
  ['54', 'Sakarya'],
  ['55', 'Samsun'],
  ['56', 'Siirt'],
  ['57', 'Sinop'],
  ['58', 'Sivas'],
  ['59', 'Tekirdağ'],
  ['60', 'Tokat'],
  ['61', 'Trabzon'],
  ['62', 'Tunceli'],
  ['63', 'Şanlıurfa'],
  ['64', 'Uşak'],
  ['65', 'Van'],
  ['66', 'Yozgat'],
  ['67', 'Zonguldak'],
  ['68', 'Aksaray'],
  ['69', 'Bayburt'],
  ['70', 'Karaman'],
  ['71', 'Kırıkkale'],
  ['72', 'Batman'],
  ['73', 'Şırnak'],
  ['74', 'Bartın'],
  ['75', 'Ardahan'],
  ['76', 'Iğdır'],
  ['77', 'Yalova'],
  ['78', 'Karabük'],
  ['79', 'Kilis'],
  ['80', 'Osmaniye'],
  ['81', 'Düzce'],
];

function searchable(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ');
}

const provinces = provinceInputs.map(([code, name]) => ({
  id: code,
  code,
  name,
})) as readonly FuelPriceProvince[];

const istanbulAnatolian: FuelPriceProvince = {
  id: 'istanbul_anatolian',
  code: '34',
  name: 'İstanbul Anadolu',
};
const istanbulEuropean: FuelPriceProvince = {
  id: 'istanbul_european',
  code: '34',
  name: 'İstanbul Avrupa',
};

export const EPDK_PROVINCES: readonly FuelPriceProvince[] = [
  ...provinces.filter((province) => province.code !== '34'),
  istanbulAnatolian,
  istanbulEuropean,
] as const;

export function normalizeEpdkProvince(value: string | null | undefined): FuelPriceProvince | null {
  if (!value) return null;
  const normalized = searchable(value);
  if (/istanbul.*anadolu|anadolu.*istanbul/.test(normalized)) return istanbulAnatolian;
  if (/istanbul.*avrupa|avrupa.*istanbul/.test(normalized)) return istanbulEuropean;
  return provinces.find((province) => searchable(province.name) === normalized) ?? null;
}

export function toReferenceFuelType(value: FuelType): ReferenceFuelType | null {
  return value === 'gasoline' || value === 'diesel' || value === 'lpg' ? value : null;
}

export function normalizeEpdkFuelType(value: string | null | undefined): ReferenceFuelType | null {
  if (!value) return null;
  const normalized = searchable(value);
  if (/benzin|kursunsuz/.test(normalized)) return 'gasoline';
  if (/motorin|dizel/.test(normalized)) return 'diesel';
  if (/lpg|otogaz/.test(normalized)) return 'lpg';
  return null;
}

const brandAliases: readonly [FuelStationId, readonly string[]][] = [
  ['petrol_ofisi', ['petrol ofisi', 'petrolofisi', 'p o']],
  ['totalenergies', ['totalenergies', 'total energies', 'total oil']],
  ['aytemiz', ['aytemiz']],
  ['shell', ['shell', 'shell turcas']],
  ['opet', ['opet']],
  ['bp', ['bp']],
];

export function normalizeEpdkBrand(value: string | null | undefined): FuelStationId | null {
  if (!value) return null;
  const normalized = searchable(value)
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return brandAliases.find(([, aliases]) => aliases.includes(normalized))?.[0] ?? null;
}
