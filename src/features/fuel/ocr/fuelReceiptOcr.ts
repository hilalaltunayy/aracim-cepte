import { onDeviceDocumentOcrProvider } from '@/features/documents/ocr/providers/onDeviceDocumentOcrProvider';
import type { DocumentOcrProvider } from '@/features/documents/ocr/domain/documentOcrTypes';
import type { PendingAttachment } from '@/features/attachments/domain/types';
import {
  calculateMissingFuelValue,
  type FuelEntryValues,
  type FuelValueField,
} from '../domain/fuelEntry';
import { detectFuelStationFromReceiptText } from '../config/fuelStations';

export type FuelReceiptOcrField =
  FuelValueField | 'stationBrand' | 'recordDate' | 'receiptTime' | 'location' | 'documentNumber';
export type FuelReceiptOcrSource = 'ocr' | 'calculated';
export interface FuelReceiptOcrSuggestion {
  fieldId: FuelReceiptOcrField;
  value: string;
  source: FuelReceiptOcrSource;
}
export interface FuelReceiptOcrResult {
  suggestions: FuelReceiptOcrSuggestion[];
  inconsistent: boolean;
}

const numberPattern = '(\\d{1,3}(?:[. ]\\d{3})+(?:,\\d{1,3})?|\\d+(?:[.,]\\d{1,3})?|\\d+)';
/** Clear payment / grand-total markers — trusted over any loose number. */
const strongTotalLabel =
  /(?:genel\s*toplam|gnl\s*top\.?|toplam|tutar|ödenecek|odenecek|ödenen|odenen|k\.?\s*kart[ıi]|kredi\s*kart[ıi]|nakit)/i;
const priceLabels =
  /(?:birim\s*fiyat|litre\s*fiyat[ıi]|b[ıi]r[ıi]m\s*f\.?|tl\s*\/\s*l|₺\s*\/\s*l)\s*[:\-]?\s*(?:tl|₺)?\s*/i;
const litreLabels = /(?:litre|lt\.?|miktar)\s*[:\-]?\s*/i;
const unrelatedReceiptNumber =
  /\b(?:kdv|vergi|fiş\s*(?:no|numara)|fatura\s*(?:no|numara)|terminal|kart\s*no|izin|onay|para\s*üstü|plaka|araç|tabanca|pompa|ba[şs]|prov)\b/i;
/** e.g. "42 ABC 123" / "42ABC123" — never a monetary total. */
const plateLike = /(?:^|\s)\d{2}\s?[A-ZÇĞİÖŞÜ]{1,4}\s?\d{2,4}(?:\s|$)/i;

function receiptDecimal(raw: string | undefined): number | null {
  if (!raw) return null;
  const compact = raw.replace(/\s/g, '');
  const normalized =
    compact.includes(',') && compact.includes('.')
      ? compact.replace(/\./g, '').replace(',', '.')
      : compact.replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function format(field: FuelValueField, value: number): string {
  return value
    .toFixed(field === 'liters' ? 3 : 2)
    .replace(/\.?0+$/, '')
    .replace('.', ',');
}

function labeledNumber(text: string, label: RegExp): number | null {
  const matcher = new RegExp(`${label.source}${numberPattern}`, label.flags);
  const bareLabel = new RegExp(`${label.source}$`, label.flags);
  const leadingNumber = new RegExp(`^\\s*(?:tl|₺)?\\s*${numberPattern}`, 'i');
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (unrelatedReceiptNumber.test(line)) continue;
    const value = receiptDecimal(matcher.exec(line)?.[1]);
    if (value !== null) return value;
    // Label alone on its line, value on the next (right-aligned receipts).
    if (bareLabel.test(line.trim())) {
      const next = lines[index + 1];
      const nextValue = next && !unrelatedReceiptNumber.test(next)
        ? receiptDecimal(leadingNumber.exec(next)?.[1])
        : null;
      if (nextValue !== null) return nextValue;
    }
  }
  return null;
}

interface TotalCandidate {
  value: number;
  /** 3 = strong marker on the line, 2 = strong marker + next-line amount, 1 = loose "N TL". */
  weight: 1 | 2 | 3;
}

const currencyNumber = new RegExp(`${numberPattern}\\s*(?:tl|try|₺)`, 'i');
const leadingCurrencyNumber = new RegExp(`^\\s*(?:tl|₺)?\\s*${numberPattern}\\s*(?:tl|₺)?\\s*$`, 'i');

/** Every plausible monetary total on the receipt, ranked by how it was found. */
function collectTotalCandidates(text: string): TotalCandidate[] {
  const lines = text.split(/\r?\n/);
  const candidates: TotalCandidate[] = [];
  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || unrelatedReceiptNumber.test(line) || plateLike.test(line)) return;
    const hasStrong = strongTotalLabel.test(line);
    if (hasStrong) {
      // Strip the label so a label like "GENEL TOPLAM" can't be read as digits.
      const afterLabel = line.replace(strongTotalLabel, ' ');
      const onLine = receiptDecimal(
        currencyNumber.exec(afterLabel)?.[1] ??
          new RegExp(`${numberPattern}\\s*$`).exec(afterLabel)?.[1],
      );
      if (onLine !== null) {
        candidates.push({ value: onLine, weight: 3 });
        return;
      }
      // Bare label: take the amount from a following line, never a plate.
      for (const next of lines.slice(index + 1, index + 3)) {
        const trimmed = next.trim();
        if (!trimmed || plateLike.test(trimmed) || unrelatedReceiptNumber.test(trimmed)) continue;
        const nextValue = receiptDecimal(leadingCurrencyNumber.exec(trimmed)?.[1]);
        if (nextValue !== null) {
          candidates.push({ value: nextValue, weight: 2 });
          break;
        }
      }
      return;
    }
    const loose = receiptDecimal(currencyNumber.exec(line)?.[1]);
    if (loose !== null) candidates.push({ value: loose, weight: 1 });
  });
  return candidates;
}

function parseLitres(text: string): number | null {
  return (
    labeledNumber(text, litreLabels) ??
    text
      .split(/\r?\n/)
      .filter((line) => !unrelatedReceiptNumber.test(line))
      .map((line) =>
        receiptDecimal(new RegExp(`${numberPattern}\\s*(?:lt|litre)\\b`, 'i').exec(line)?.[1]),
      )
      .find((value): value is number => value !== null) ??
    null
  );
}

/**
 * Deterministic total selection: trust a clear payment/total marker; otherwise
 * reconcile loose numbers against litres × unit price so a plate prefix or id
 * fragment can never win. Returns the value plus whether it disagrees with the
 * arithmetic (for the review "check this" flag).
 */
function pickTotal(
  candidates: TotalCandidate[],
  expected: number | null,
): { total: number | null; inconsistent: boolean } {
  const tolerance = (base: number) => Math.max(1, base * 0.03);
  const strong = candidates.filter((c) => c.weight >= 2).sort((a, b) => b.weight - a.weight)[0];
  if (strong) {
    const inconsistent =
      expected !== null && Math.abs(strong.value - expected) > tolerance(expected);
    return { total: strong.value, inconsistent };
  }
  const loose = candidates.filter((c) => c.weight === 1);
  if (expected !== null) {
    const matching = loose
      .filter((c) => Math.abs(c.value - expected) <= tolerance(expected))
      .sort((a, b) => Math.abs(a.value - expected) - Math.abs(b.value - expected))[0];
    if (matching) return { total: matching.value, inconsistent: false };
    // No trustworthy loose total near the arithmetic: use the computed value and
    // flag it only if the receipt showed a conflicting number.
    return { total: expected, inconsistent: loose.length > 0 };
  }
  const largest = loose.sort((a, b) => b.value - a.value)[0];
  return { total: largest?.value ?? null, inconsistent: false };
}

function parseNumbers(text: string): { values: FuelEntryValues; inconsistent: boolean } {
  let pricePerLiter = labeledNumber(text, priceLabels);
  let liters = parseLitres(text);
  const multiplication = new RegExp(
    `${numberPattern}\\s*(?:lt|litre|l)\\s*[x×*]\\s*${numberPattern}\\s*(?:tl\\s*\\/\\s*l|₺\\s*\\/\\s*l)?`,
    'i',
  ).exec(text);
  liters ??= receiptDecimal(multiplication?.[1]);
  pricePerLiter ??= receiptDecimal(multiplication?.[2]);

  const expected =
    liters !== null && pricePerLiter !== null ? liters * pricePerLiter : null;
  const { total, inconsistent } = pickTotal(collectTotalCandidates(text), expected);
  return { values: { total, liters, pricePerLiter }, inconsistent };
}

function firstCaptured(text: string, pattern: RegExp, maximum = 120): string | null {
  for (const line of text.split(/\r?\n/)) {
    const value = pattern.exec(line)?.[1]?.replace(/\s+/g, ' ').trim();
    if (value && value.length <= maximum) return value;
  }
  return null;
}

const TIME_CORE = '([01]?\\d|2[0-3])[:.]([0-5]\\d)';

function toClockTime(hours: string | undefined, minutes: string | undefined): string | null {
  if (hours === undefined || minutes === undefined) return null;
  return `${hours.padStart(2, '0')}:${minutes}`;
}

function parseReceiptTime(text: string): string | null {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const labelled = new RegExp(
      `(?:saat|işlem\\s*saati|islem\\s*saati|zaman)\\s*[:\\-]?\\s*${TIME_CORE}`,
      'i',
    ).exec(line);
    const value = toClockTime(labelled?.[1], labelled?.[2]);
    if (value) return value;
  }
  for (const line of lines) {
    // A standalone HH:MM that is not part of a date-like digit run.
    const bare = new RegExp(`(?:^|[^\\d./-])${TIME_CORE}(?:[^\\d:]|$)`).exec(line);
    const value = toClockTime(bare?.[1], bare?.[2]);
    if (value) return value;
  }
  return null;
}

/**
 * Turkish receipt dates: dd.mm.yyyy / dd-mm-yyyy / dd/mm/yy and yyyy-mm-dd.
 *
 * On-device OCR frequently merges two visually separate but closely-printed
 * fields with no space between them — e.g. a date immediately followed by the
 * time or the fiş/document number ("02-09-202614:45", "02-09-2026FİŞ NO:0142").
 * A day-month-year match must not require a non-digit character right after
 * the year: a real 4-digit year is unambiguous the moment 4 digits are seen,
 * so it needs no trailing boundary. Only the 2-digit short-year form still
 * needs one, so it can't be lifted out of the middle of an unrelated number.
 * `matchAll` + trying every syntactic match keeps searching past an
 * impossible calendar date (e.g. month 34 from an unrelated digit run)
 * instead of giving up on the first regex hit.
 */
function parseReceiptDate(text: string): string | null {
  const clamp = (year: number) => (year < 100 ? 2000 + year : year);
  const toIso = (day: number, month: number, year: number): string | null => {
    const y = clamp(year);
    const date = new Date(Date.UTC(y, month - 1, day));
    if (
      y < 2000 ||
      y > 2100 ||
      date.getUTCFullYear() !== y ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return `${y.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
      .toString()
      .padStart(2, '0')}`;
  };
  // Turkish receipts are day-first, so an explicit dd<sep>mm<sep>yyyy with a full
  // year is the most trustworthy shape and is tried across the whole text first.
  const dmyFullYearPattern = /(?:^|[^\d])(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/g;
  const isoPattern = /(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/g;
  // Last resort only. A two-digit year makes any three small numbers look like a
  // date, so it must never outrank a real full-year date elsewhere on the
  // receipt: an EKÜ/fiş number such as "04-03-02" was being read as 2002-03-04
  // and overwriting the printed date. Whitespace is deliberately NOT a
  // separator here for the same reason ("FIS 04 03 02").
  const dmyShortYearPattern = /(?:^|[^\d])(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2})(?!\d)/g;
  const scanWith = (source: string, pattern: RegExp, dayFirst: boolean): string | null => {
    for (const match of source.matchAll(pattern)) {
      const value = dayFirst
        ? toIso(Number(match[1]), Number(match[2]), Number(match[3]))
        : toIso(Number(match[3]), Number(match[2]), Number(match[1]));
      if (value) return value;
    }
    return null;
  };
  const scan = (source: string): string | null =>
    scanWith(source, dmyFullYearPattern, true) ??
    scanWith(source, isoPattern, false) ??
    scanWith(source, dmyShortYearPattern, true);
  for (const line of text.split(/\r?\n/)) {
    if (/tar[iı]h|d[üu]zenlen/i.test(line)) {
      const value = scan(line);
      if (value) return value;
    }
  }
  return scan(text);
}

export function parseFuelReceiptOcrText(rawText: string): FuelReceiptOcrResult {
  const { values, inconsistent: totalReconciled } = parseNumbers(rawText);
  const suggestions: FuelReceiptOcrSuggestion[] = [];
  const totalCameFromCalculation =
    totalReconciled && values.total !== null && values.liters !== null && values.pricePerLiter !== null;
  (['total', 'liters', 'pricePerLiter'] as const).forEach((field) => {
    if (values[field] !== null)
      suggestions.push({
        fieldId: field,
        value: format(field, values[field]!),
        source: field === 'total' && totalCameFromCalculation ? 'calculated' : 'ocr',
      });
  });
  const known = (['total', 'liters', 'pricePerLiter'] as const).filter(
    (field) => values[field] !== null,
  );
  if (known.length === 2) {
    const missing = (['total', 'liters', 'pricePerLiter'] as const).find(
      (field) => values[field] === null,
    )!;
    const calculated = calculateMissingFuelValue(values, missing);
    if (calculated !== null)
      suggestions.push({
        fieldId: missing,
        value: format(missing, calculated),
        source: 'calculated',
      });
  }
  const station = detectFuelStationFromReceiptText(rawText);
  if (station) suggestions.push({ fieldId: 'stationBrand', value: station, source: 'ocr' });
  const date = parseReceiptDate(rawText);
  if (date) suggestions.push({ fieldId: 'recordDate', value: date, source: 'ocr' });
  const time = parseReceiptTime(rawText);
  if (time) suggestions.push({ fieldId: 'receiptTime', value: time, source: 'ocr' });
  const location = firstCaptured(
    rawText,
    /(?:il|şehir|sehir|lokasyon|şube|sube)\s*[:\-]\s*([^\n]{2,120})/i,
  );
  if (location) suggestions.push({ fieldId: 'location', value: location, source: 'ocr' });
  const documentNumber = firstCaptured(
    rawText,
    /(?:fiş|fis|fatura|belge)\s*(?:no|numara|numarası|numarasi)\s*[:\-]?\s*([A-Z0-9][A-Z0-9./-]{1,79})/i,
    80,
  );
  if (documentNumber)
    suggestions.push({ fieldId: 'documentNumber', value: documentNumber, source: 'ocr' });

  const threeValueMismatch =
    values.total !== null &&
    values.liters !== null &&
    values.pricePerLiter !== null &&
    Math.abs(values.total - values.liters * values.pricePerLiter) >
      Math.max(1, values.total * 0.03);

  return { suggestions, inconsistent: totalReconciled || threeValueMismatch };
}

export async function analyzeFuelReceiptAttachment(
  attachment: PendingAttachment,
  provider: DocumentOcrProvider = onDeviceDocumentOcrProvider,
): Promise<
  | { status: 'success'; result: FuelReceiptOcrResult }
  | { status: 'error'; code: 'unsupported_attachment' | 'no_text' | 'no_fields' | 'failed' }
> {
  if (!['image/jpeg', 'image/png'].includes(attachment.mimeType))
    return { status: 'error', code: 'unsupported_attachment' };
  let response;
  try {
    response = await provider.analyzeImage({ attachment, documentType: 'invoice' });
  } catch {
    return { status: 'error', code: 'failed' };
  }
  if (response.status !== 'success' || !response.rawText.trim())
    return { status: 'error', code: response.status === 'no_text' ? 'no_text' : 'failed' };
  const result = parseFuelReceiptOcrText(response.rawText);
  return result.suggestions.length
    ? { status: 'success', result }
    : { status: 'error', code: 'no_fields' };
}
