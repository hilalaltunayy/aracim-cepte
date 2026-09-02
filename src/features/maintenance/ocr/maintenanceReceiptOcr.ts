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
const totalLabel =
  /(?:genel\s*)?(?:toplam|top\.?|gnl\s*top\.?|ödenecek|odenecek|ödenen|odenen|tutar)\s*[:\-]?\s*(?:tl|₺)?\s*/i;
const maintenanceKeyword =
  /(?:işçilik|iscilik|montaj|bakım|bakim|onarım|onarim|parça|parca|filtre|yağ|yag|balata|akü|aku|buji|kayış|kayis|antifriz|amortisör|amortisor|disk|debriyaj|triger|kampana|malzeme|servis)/i;
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
    /(?:servis|firma|işletme|isletme|ünvan|unvan|düzenleyen|duzenleyen)\s*(?:adı|adi|ünvanı|unvani)?\s*[:\-]\s*([^\n]{2,120})/i;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const candidate = matcher.exec(line)?.[1]?.trim();
    if (candidate && !/[0-9]{8,}/.test(candidate)) return candidate;
  }
  // Fallback: a headline-style line near the top (mostly letters, no long digit
  // runs, not a section keyword).
  for (const rawLine of lines.slice(0, 6)) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (
      line.length >= 4 &&
      line.length <= 60 &&
      !/\d{4,}/.test(line) &&
      !/(?:fatura|fiş|fis|tarih|toplam|kdv|vergi|adres|tel)/i.test(line) &&
      /\p{L}{3,}/u.test(line) &&
      (line === line.toLocaleUpperCase('tr-TR') || /(?:oto|servis|garaj|lastik|motor)/i.test(line))
    ) {
      return line;
    }
  }
  return null;
}

function parseReceiptDate(text: string): string | null {
  for (const line of text.split(/\r?\n/)) {
    if (/tar[iı]h|düzenlenme|duzenlenme/i.test(line)) {
      const labelled = parseTurkishDate(line);
      if (labelled) return labelled;
    }
  }
  return null;
}

function lineItemCategory(label: string): MaintenanceReceiptLineItem['category'] {
  return /işçili|iscili|İşçili|montaj|servis\s*[uü]creti|iş\s*[uü]creti|is\s*[uü]creti|bakım\s*[uü]cret|bakim\s*[uü]cret/i.test(
    label,
  )
    ? 'labor'
    : /parça|parca|filtre|yağ|yag|balata|akü|aku|buji|kayış|kayis|antifriz|amortis[oö]r|disk|debriyaj|triger|kampana|malzeme|lastik/i.test(
        label,
      )
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
  // A maintenance keyword line ending in a single amount (no explicit qty/unit).
  const keywordAmount = new RegExp(
    `^([\\p{L}][\\p{L}0-9 .()/-]{1,78}?)\\s+${numberPattern}\\s*(?:tl|₺)?$`,
    'iu',
  );
  const seenLabels = new Set<string>();
  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine
      .replace(/\s+/g, ' ')
      .replace(/\b(?:tl|try|₺)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (
      !line ||
      excludedNumberLine.test(line) ||
      /(?:genel\s*)?toplam|top\.?\s|ödenecek|odenecek|ara\s*toplam/i.test(line)
    )
      continue;

    const structured = explicit.exec(line) ?? columns.exec(line);
    if (structured) {
      const label = structured[1].trim();
      const quantity = parseReceiptDecimal(structured[2]);
      const unitPrice = parseReceiptDecimal(structured[3]);
      const lineTotal = parseReceiptDecimal(structured[4]);
      if (quantity && unitPrice && lineTotal) {
        const consistent =
          Math.abs(quantity * unitPrice - lineTotal) <= Math.max(1, lineTotal * 0.05);
        seenLabels.add(label.toLocaleLowerCase('tr-TR'));
        items.push({
          id: `ocr-line-${index}`,
          label,
          quantity: formatCost(quantity),
          // Keep the reported unit price only when it reconciles with the total.
          unitPrice: consistent ? formatCost(unitPrice) : '',
          lineTotal: formatCost(lineTotal),
          category: lineItemCategory(label),
        });
        continue;
      }
    }

    const keyword = keywordAmount.exec(line);
    if (keyword && maintenanceKeyword.test(keyword[1])) {
      const label = keyword[1].trim();
      const key = label.toLocaleLowerCase('tr-TR');
      const lineTotal = parseReceiptDecimal(keyword[2]);
      if (lineTotal && !seenLabels.has(key)) {
        seenLabels.add(key);
        items.push({
          id: `ocr-line-${index}`,
          label,
          quantity: '',
          unitPrice: '',
          lineTotal: formatCost(lineTotal),
          category: lineItemCategory(label),
        });
      }
    }
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
