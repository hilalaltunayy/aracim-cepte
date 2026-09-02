import { parseTurkishDate } from '@/features/documents/ocr/domain/documentOcrParser';
import type { DocumentOcrProvider } from '@/features/documents/ocr/domain/documentOcrTypes';
import { onDeviceDocumentOcrProvider } from '@/features/documents/ocr/providers/onDeviceDocumentOcrProvider';
import type { PendingAttachment } from '@/features/attachments/domain/types';
import { resolveMaintenanceTotal } from '../domain/maintenanceDetails';

export type MaintenanceReceiptOcrField =
  'serviceName' | 'recordDate' | 'invoiceNumber' | 'partsCost' | 'laborCost' | 'total';

export interface MaintenanceReceiptOcrSuggestion {
  fieldId: MaintenanceReceiptOcrField;
  value: string;
  source: 'ocr' | 'calculated';
}

export interface MaintenanceReceiptOcrResult {
  suggestions: MaintenanceReceiptOcrSuggestion[];
  lineItems: MaintenanceReceiptLineItem[];
}

export interface MaintenanceReceiptLineItem {
  id: string;
  label: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  category: 'parts' | 'labor' | 'unknown';
}

const numberPattern = '(\\d{1,3}(?:[. ]\\d{3})+(?:,\\d{1,3})?|\\d+(?:[.,]\\d{1,3})?|\\d+)';
const totalLabel = /(?:genel\s*)?(?:toplam|ödenecek|odenecek|tutar)\s*[:\-]?\s*(?:tl|₺)?\s*/i;
const partsLabel =
  /(?:yedek\s*)?(?:parça|parca|malzeme)\s*(?:tutarı|tutari)?\s*[:\-]?\s*(?:tl|₺)?\s*/i;
const laborLabel =
  /(?:İşçilik|işçilik|iscilik|İş\s*ücreti|iş\s*ücreti|is\s*ucreti)\s*(?:tutarı|tutari)?\s*[:\-]?\s*(?:tl|₺)?\s*/i;
const invoiceLabel = /(?:fatura|fiş|fis|belge)\s*(?:no|numara|numarası|numarasi)\s*[:\-]?\s*/i;
const excludedNumberLine = /\b(?:kdv|vergi|vkn|tckn|terminal|kart|izin|onay|para\s*üstü)\b/i;

function parseReceiptDecimal(raw: string | undefined): number | null {
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

function formatCost(value: number): string {
  return value
    .toFixed(2)
    .replace(/\.?0+$/, '')
    .replace('.', ',');
}

function labelledNumber(text: string, label: RegExp): number | null {
  const matcher = new RegExp(`${label.source}${numberPattern}`, label.flags);
  for (const line of text.split(/\r?\n/)) {
    if (
      excludedNumberLine.test(line) ||
      /\d+(?:[.,]\d+)?\s*(?:adet\s*[x×*]?|[x×*])\s*\d/i.test(line)
    )
      continue;
    const value = parseReceiptDecimal(matcher.exec(line)?.[1]);
    if (value !== null) return value;
  }
  return null;
}

function parseInvoiceNumber(text: string): string | null {
  const matcher = new RegExp(`${invoiceLabel.source}([A-Z0-9][A-Z0-9./-]{1,79})`, 'i');
  for (const line of text.split(/\r?\n/)) {
    if (excludedNumberLine.test(line)) continue;
    const value = matcher.exec(line)?.[1]?.trim();
    if (value) return value;
  }
  return null;
}

function parseServiceName(text: string): string | null {
  const matcher =
    /(?:servis|firma|işletme|isletme)\s*(?:adı|adi|ünvanı|unvani)?\s*[:\-]\s*([^\n]{2,120})/i;
  for (const line of text.split(/\r?\n/)) {
    const candidate = matcher.exec(line)?.[1]?.trim();
    if (candidate && !/[0-9]{8,}/.test(candidate)) return candidate;
  }
  return null;
}

function parseReceiptDate(text: string): string | null {
  for (const line of text.split(/\r?\n/)) {
    if (/\b(?:tarih|işlem\s*tarihi|islem\s*tarihi)\b/i.test(line)) {
      return parseTurkishDate(line);
    }
  }
  return null;
}

function lineItemCategory(label: string): MaintenanceReceiptLineItem['category'] {
  return /İşçilik|işçilik|iscilik|montaj|servis\s*ücreti|servis\s*ucreti/i.test(label)
    ? 'labor'
    : /parça|parca|filtre|yağ|yag|balata|akü|aku|buji|kayış|kayis|malzeme/i.test(label)
      ? 'parts'
      : 'unknown';
}

function parseLineItems(text: string): MaintenanceReceiptLineItem[] {
  const items: MaintenanceReceiptLineItem[] = [];
  const explicit = new RegExp(
    `^(.{2,80}?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(?:adet\\s*[x×*]?|x|×|\\*)\\s*${numberPattern}\\s*(?:tl|₺)?\\s*(?:=|:)?\\s*${numberPattern}\\s*(?:tl|₺)?$`,
    'i',
  );
  const columns = new RegExp(
    `^([\\p{L}][\\p{L}0-9 .()/-]{1,78}?)\\s+(\\d+(?:[.,]\\d+)?)\\s+${numberPattern}\\s+${numberPattern}\\s*(?:tl|₺)?$`,
    'iu',
  );
  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (
      !line ||
      excludedNumberLine.test(line) ||
      /(?:genel\s*)?toplam|ödenecek|odenecek/i.test(line)
    )
      continue;
    const match = explicit.exec(line) ?? columns.exec(line);
    if (!match) continue;
    const label = match[1].trim();
    const quantity = parseReceiptDecimal(match[2]);
    const unitPrice = parseReceiptDecimal(match[3]);
    const lineTotal = parseReceiptDecimal(match[4]);
    if (!quantity || !unitPrice || !lineTotal) continue;
    if (Math.abs(quantity * unitPrice - lineTotal) > Math.max(1, lineTotal * 0.02)) continue;
    items.push({
      id: `ocr-line-${index}`,
      label,
      quantity: formatCost(quantity),
      unitPrice: formatCost(unitPrice),
      lineTotal: formatCost(lineTotal),
      category: lineItemCategory(label),
    });
  }
  return items.slice(0, 24);
}

export function parseMaintenanceReceiptOcrText(rawText: string): MaintenanceReceiptOcrResult {
  const lineItems = parseLineItems(rawText);
  const itemPartsTotal = lineItems
    .filter((item) => item.category === 'parts')
    .reduce((sum, item) => sum + (parseReceiptDecimal(item.lineTotal) ?? 0), 0);
  const itemLaborTotal = lineItems
    .filter((item) => item.category === 'labor')
    .reduce((sum, item) => sum + (parseReceiptDecimal(item.lineTotal) ?? 0), 0);
  const partsCost =
    labelledNumber(rawText, partsLabel) ?? (itemPartsTotal > 0 ? itemPartsTotal : null);
  const laborCost =
    labelledNumber(rawText, laborLabel) ?? (itemLaborTotal > 0 ? itemLaborTotal : null);
  const total = labelledNumber(rawText, totalLabel);
  const suggestions: MaintenanceReceiptOcrSuggestion[] = [];

  const serviceName = parseServiceName(rawText);
  if (serviceName) suggestions.push({ fieldId: 'serviceName', value: serviceName, source: 'ocr' });
  const date = parseReceiptDate(rawText);
  if (date) suggestions.push({ fieldId: 'recordDate', value: date, source: 'ocr' });
  const invoiceNumber = parseInvoiceNumber(rawText);
  if (invoiceNumber)
    suggestions.push({ fieldId: 'invoiceNumber', value: invoiceNumber, source: 'ocr' });
  if (partsCost !== null)
    suggestions.push({ fieldId: 'partsCost', value: formatCost(partsCost), source: 'ocr' });
  if (laborCost !== null)
    suggestions.push({ fieldId: 'laborCost', value: formatCost(laborCost), source: 'ocr' });
  if (total !== null)
    suggestions.push({ fieldId: 'total', value: formatCost(total), source: 'ocr' });
  if (total === null && partsCost !== null && laborCost !== null) {
    const derived = resolveMaintenanceTotal('', { partsCost, laborCost });
    if (derived.value !== null) {
      suggestions.push({
        fieldId: 'total',
        value: formatCost(derived.value),
        source: 'calculated',
      });
    }
  }
  return { suggestions, lineItems };
}

export async function analyzeMaintenanceReceiptAttachment(
  attachment: PendingAttachment,
  provider: DocumentOcrProvider = onDeviceDocumentOcrProvider,
): Promise<
  | { status: 'success'; result: MaintenanceReceiptOcrResult }
  | { status: 'error'; code: 'unsupported_attachment' | 'no_text' | 'no_fields' | 'failed' }
> {
  if (!['image/jpeg', 'image/png'].includes(attachment.mimeType)) {
    return { status: 'error', code: 'unsupported_attachment' };
  }
  try {
    const response = await provider.analyzeImage({ attachment, documentType: 'invoice' });
    if (response.status !== 'success' || !response.rawText.trim()) {
      return { status: 'error', code: response.status === 'no_text' ? 'no_text' : 'failed' };
    }
    const result = parseMaintenanceReceiptOcrText(response.rawText);
    return result.suggestions.length || result.lineItems.length
      ? { status: 'success', result }
      : { status: 'error', code: 'no_fields' };
  } catch {
    return { status: 'error', code: 'failed' };
  }
}
