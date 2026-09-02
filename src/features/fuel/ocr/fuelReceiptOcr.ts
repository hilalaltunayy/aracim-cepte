import { parseTurkishDate } from '@/features/documents/ocr/domain/documentOcrParser';
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
const totalLabels =
  /(?:genel\s*)?(?:toplam|top\.?|gnl\s*top\.?|ödenecek|odenecek|ödenen|odenen|tutar)\s*[:\-]?\s*(?:tl|₺)?\s*/i;
const priceLabels =
  /(?:birim\s*fiyat|litre\s*fiyat[ıi]|b[ıi]r[ıi]m\s*f\.?|tl\s*\/\s*l|₺\s*\/\s*l)\s*[:\-]?\s*(?:tl|₺)?\s*/i;
const litreLabels = /(?:litre|lt\.?|miktar)\s*[:\-]?\s*/i;
const unrelatedReceiptNumber =
  /\b(?:kdv|vergi|fiş\s*(?:no|numara)|terminal|kart|izin|onay|para\s*üstü)\b/i;

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

function parseNumbers(text: string): FuelEntryValues {
  let total = labeledNumber(text, totalLabels);
  let pricePerLiter = labeledNumber(text, priceLabels);
  let liters =
    labeledNumber(text, litreLabels) ??
    text
      .split(/\r?\n/)
      .filter((line) => !unrelatedReceiptNumber.test(line))
      .map((line) =>
        receiptDecimal(new RegExp(`${numberPattern}\\s*(?:lt|litre)`, 'i').exec(line)?.[1]),
      )
      .find((value): value is number => value !== null) ??
    null;
  const multiplication = new RegExp(
    `${numberPattern}\\s*(?:lt|litre|l)\\s*[x×*]\\s*${numberPattern}\\s*(?:tl\\s*\\/\\s*l|₺\\s*\\/\\s*l)?`,
    'i',
  ).exec(text);
  liters ??= receiptDecimal(multiplication?.[1]);
  pricePerLiter ??= receiptDecimal(multiplication?.[2]);
  if (total === null) {
    for (const line of text.split(/\r?\n/)) {
      if (!totalLabels.test(line) || unrelatedReceiptNumber.test(line)) continue;
      total = receiptDecimal(new RegExp(`${numberPattern}\\s*(?:tl|₺)`, 'i').exec(line)?.[1]);
      if (total !== null) break;
    }
  }
  return { total, liters, pricePerLiter };
}

function firstCaptured(text: string, pattern: RegExp, maximum = 120): string | null {
  for (const line of text.split(/\r?\n/)) {
    const value = pattern.exec(line)?.[1]?.replace(/\s+/g, ' ').trim();
    if (value && value.length <= maximum) return value;
  }
  return null;
}

function parseReceiptTime(text: string): string | null {
  const labelled = firstCaptured(
    text,
    /(?:saat|işlem\s*saati|islem\s*saati)\s*[:\-]?\s*((?:[01]?\d|2[0-3])[:.]\d{2})/i,
    5,
  );
  const candidate =
    labelled ?? firstCaptured(text, /(?:tarih[^\n]{0,24})\b((?:[01]?\d|2[0-3])[:.]\d{2})\b/i, 5);
  return candidate?.replace('.', ':') ?? null;
}

function isConsistent(values: FuelEntryValues): boolean {
  if (!values.total || !values.liters || !values.pricePerLiter) return true;
  const expected = values.liters * values.pricePerLiter;
  return Math.abs(values.total - expected) <= Math.max(1, values.total * 0.005);
}

export function parseFuelReceiptOcrText(rawText: string): FuelReceiptOcrResult {
  const values = parseNumbers(rawText);
  const suggestions: FuelReceiptOcrSuggestion[] = [];
  (['total', 'liters', 'pricePerLiter'] as const).forEach((field) => {
    if (values[field] !== null)
      suggestions.push({ fieldId: field, value: format(field, values[field]!), source: 'ocr' });
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
  const date = parseTurkishDate(rawText);
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
  return { suggestions, inconsistent: !isConsistent(values) };
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
