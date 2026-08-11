import { parseTurkishDate } from '@/features/documents/ocr/domain/documentOcrParser';
import { onDeviceDocumentOcrProvider } from '@/features/documents/ocr/providers/onDeviceDocumentOcrProvider';
import type { DocumentOcrProvider } from '@/features/documents/ocr/domain/documentOcrTypes';
import type { PendingAttachment } from '@/features/attachments/domain/types';
import { calculateMissingFuelValue, type FuelEntryValues, type FuelValueField } from '../domain/fuelEntry';
import { detectFuelStationFromReceiptText } from '../config/fuelStations';

export type FuelReceiptOcrField = FuelValueField | 'stationBrand' | 'recordDate';
export type FuelReceiptOcrSource = 'ocr' | 'calculated';
export interface FuelReceiptOcrSuggestion { fieldId: FuelReceiptOcrField; value: string; source: FuelReceiptOcrSource }
export interface FuelReceiptOcrResult { suggestions: FuelReceiptOcrSuggestion[]; inconsistent: boolean }

const numberPattern = '(\\d{1,3}(?:[. ]\\d{3})+(?:,\\d{1,3})?|\\d+(?:[.,]\\d{1,3})?|\\d+)';
const totalLabels = /(?:genel\s*)?(?:toplam|ödenecek|odenecek|tutar)\s*[:\-]?\s*(?:tl|₺)?\s*/i;
const priceLabels = /(?:birim\s*fiyat|litre\s*fiyat[ıi]|tl\s*\/\s*l)\s*[:\-]?\s*(?:tl|₺)?\s*/i;
const litreLabels = /(?:litre|lt)\s*[:\-]?\s*/i;
const unrelatedReceiptNumber = /\b(?:kdv|vergi|fiş\s*(?:no|numara)|terminal|kart|izin|onay|para\s*üstü)\b/i;

function receiptDecimal(raw: string | undefined): number | null {
  if (!raw) return null;
  const compact = raw.replace(/\s/g, '');
  const normalized = compact.includes(',') && compact.includes('.')
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact.replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function format(field: FuelValueField, value: number): string {
  return value.toFixed(field === 'liters' ? 3 : 2).replace(/\.?0+$/, '').replace('.', ',');
}

function labeledNumber(text: string, label: RegExp): number | null {
  const matcher = new RegExp(`${label.source}${numberPattern}`, label.flags);
  for (const line of text.split(/\r?\n/)) {
    if (unrelatedReceiptNumber.test(line)) continue;
    const match = matcher.exec(line);
    const value = receiptDecimal(match?.[1]);
    if (value !== null) return value;
  }
  return null;
}

function parseNumbers(text: string): FuelEntryValues {
  const total = labeledNumber(text, totalLabels);
  const pricePerLiter = labeledNumber(text, priceLabels);
  const liters = labeledNumber(text, litreLabels)
    ?? text
      .split(/\r?\n/)
      .filter((line) => !unrelatedReceiptNumber.test(line))
      .map((line) => receiptDecimal(new RegExp(`${numberPattern}\\s*(?:lt|litre)`, 'i').exec(line)?.[1]))
      .find((value): value is number => value !== null)
    ?? null;
  return { total, liters, pricePerLiter };
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
    if (values[field] !== null) suggestions.push({ fieldId: field, value: format(field, values[field]!), source: 'ocr' });
  });
  const known = (['total', 'liters', 'pricePerLiter'] as const).filter((field) => values[field] !== null);
  if (known.length === 2) {
    const missing = (['total', 'liters', 'pricePerLiter'] as const).find((field) => values[field] === null)!;
    const calculated = calculateMissingFuelValue(values, missing);
    if (calculated !== null) suggestions.push({ fieldId: missing, value: format(missing, calculated), source: 'calculated' });
  }
  const station = detectFuelStationFromReceiptText(rawText);
  if (station) suggestions.push({ fieldId: 'stationBrand', value: station, source: 'ocr' });
  const date = parseTurkishDate(rawText);
  if (date) suggestions.push({ fieldId: 'recordDate', value: date, source: 'ocr' });
  return { suggestions, inconsistent: !isConsistent(values) };
}

export async function analyzeFuelReceiptAttachment(
  attachment: PendingAttachment,
  provider: DocumentOcrProvider = onDeviceDocumentOcrProvider,
): Promise<{ status: 'success'; result: FuelReceiptOcrResult } | { status: 'error'; code: 'unsupported_attachment' | 'no_text' | 'no_fields' | 'failed' }> {
  if (!['image/jpeg', 'image/png'].includes(attachment.mimeType)) return { status: 'error', code: 'unsupported_attachment' };
  let response;
  try {
    response = await provider.analyzeImage({ attachment, documentType: 'invoice' });
  } catch {
    return { status: 'error', code: 'failed' };
  }
  if (response.status !== 'success' || !response.rawText.trim()) return { status: 'error', code: response.status === 'no_text' ? 'no_text' : 'failed' };
  const result = parseFuelReceiptOcrText(response.rawText);
  return result.suggestions.length ? { status: 'success', result } : { status: 'error', code: 'no_fields' };
}
