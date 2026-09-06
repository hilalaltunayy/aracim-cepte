/**
 * Builds file names that survive every destination a user might save to.
 *
 * Turkish characters are transliterated rather than stripped: "Ekspertiz
 * Raporu" should stay readable as `Ekspertiz_Raporu`, not `Ekspertz_Raporu`.
 * Android's Downloads folder, Drive and desktop file systems disagree about
 * which characters are legal, so the output is limited to ASCII letters,
 * digits, dot, dash and underscore.
 */

const TURKISH_TRANSLITERATION: Readonly<Record<string, string>> = {
  'ç': 'c', // ç
  'Ç': 'C', // Ç
  'ğ': 'g', // ğ
  'Ğ': 'G', // Ğ
  'ı': 'i', // ı
  'İ': 'I', // İ
  'ö': 'o', // ö
  'Ö': 'O', // Ö
  'ş': 's', // ş
  'Ş': 'S', // Ş
  'ü': 'u', // ü
  'Ü': 'U', // Ü
};

const TURKISH_PATTERN = /[çÇğĞıİöÖşŞüÜ]/g;
const COMBINING_MARKS = /[̀-ͯ]/g;
const MAX_BASE_LENGTH = 80;

function transliterate(value: string): string {
  return value.replace(TURKISH_PATTERN, (character) => TURKISH_TRANSLITERATION[character] ?? character);
}

/** Normalizes one path segment; never returns an empty string. */
export function toSafeFileNameBase(value: string, fallback = 'dosya'): string {
  const base = transliterate(value)
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, MAX_BASE_LENGTH);
  return base || fallback;
}

/**
 * Joins a name and an extension, keeping exactly one dot.
 *
 * The extension argument is authoritative: a PDF must not be saved as `.jpg`
 * just because the stored original name claimed so.
 */
export function buildSafeFileName(name: string, extension: string, fallback = 'dosya'): string {
  const normalizedExtension = extension.replace(/^\.+/, '').toLowerCase();
  if (!normalizedExtension) return toSafeFileNameBase(name, fallback);
  const suffix = toSafeFileNameBase(normalizedExtension, 'bin');
  const withoutExtension = name.replace(new RegExp(`\\.${normalizedExtension}$`, 'i'), '');
  return `${toSafeFileNameBase(withoutExtension, fallback)}.${suffix}`;
}
