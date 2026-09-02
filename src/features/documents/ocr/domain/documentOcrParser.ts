import type { DocumentType } from '@/domain/entities';
import { hasDocumentField } from '../../config/documentTypes';
import type { DocumentOcrFieldId, DocumentOcrSuggestion } from './documentOcrTypes';

type FieldRule = {
  fieldId: DocumentOcrFieldId;
  labels: readonly string[];
  kind: 'text' | 'date';
};

const insuranceRules: readonly FieldRule[] = [
  {
    fieldId: 'documentNumber',
    labels: ['poliçe no', 'poliçe numarası', 'poliçe numarasi'],
    kind: 'text',
  },
  {
    fieldId: 'issuerName',
    labels: ['sigorta şirketi', 'sigorta sirketi', 'sigortacı', 'sigortaci'],
    kind: 'text',
  },
  {
    fieldId: 'startDate',
    labels: ['başlangıç tarihi', 'baslangic tarihi', 'başlangıç', 'baslangic'],
    kind: 'date',
  },
  {
    fieldId: 'expiryDate',
    labels: ['bitiş tarihi', 'bitis tarihi', 'geçerlilik sonu', 'gecerlilik sonu'],
    kind: 'date',
  },
];

const rulesByType: Partial<Record<DocumentType, readonly FieldRule[]>> = {
  traffic_insurance: insuranceRules,
  comprehensive_insurance: insuranceRules,
  inspection: [
    {
      fieldId: 'eventDate',
      labels: ['muayene tarihi', 'muayene tarıhı'],
      kind: 'date',
    },
    {
      fieldId: 'expiryDate',
      labels: ['sonraki muayene tarihi', 'geçerlilik tarihi', 'gecerlilik tarihi'],
      kind: 'date',
    },
    {
      fieldId: 'issuerName',
      labels: ['istasyon', 'kurum', 'muayene istasyonu'],
      kind: 'text',
    },
  ],
  registration: [
    {
      fieldId: 'documentNumber',
      labels: ['belge no', 'belge numarası', 'belge numarasi', 'seri no', 'seri numarası'],
      kind: 'text',
    },
    {
      fieldId: 'eventDate',
      labels: ['tescil tarihi', 'tescıl tarihi'],
      kind: 'date',
    },
  ],
  expertise_report: [
    {
      fieldId: 'documentNumber',
      labels: ['rapor no', 'rapor numarası', 'rapor numarasi'],
      kind: 'text',
    },
    {
      fieldId: 'eventDate',
      labels: ['rapor tarihi'],
      kind: 'date',
    },
    {
      fieldId: 'issuerName',
      labels: ['firma', 'ekspertiz merkezi', 'ekspertiz firması', 'ekspertiz firmasi'],
      kind: 'text',
    },
  ],
  tax: [
    {
      fieldId: 'documentNumber',
      labels: ['tahakkuk no', 'belge no', 'makbuz no'],
      kind: 'text',
    },
    {
      fieldId: 'eventDate',
      labels: ['tahakkuk tarihi', 'belge tarihi', 'ödeme tarihi', 'odeme tarihi'],
      kind: 'date',
    },
    {
      fieldId: 'expiryDate',
      labels: ['son ödeme tarihi', 'son odeme tarihi', 'vade tarihi'],
      kind: 'date',
    },
  ],
  service_document: [
    {
      fieldId: 'documentNumber',
      labels: ['iş emri no', 'is emri no', 'servis formu no', 'belge no'],
      kind: 'text',
    },
    { fieldId: 'issuerName', labels: ['servis', 'firma', 'işletme', 'isletme'], kind: 'text' },
    {
      fieldId: 'eventDate',
      labels: ['servis tarihi', 'işlem tarihi', 'islem tarihi', 'tarih'],
      kind: 'date',
    },
  ],
  invoice: [
    {
      fieldId: 'documentNumber',
      labels: ['fatura no', 'fiş no', 'fis no', 'belge no'],
      kind: 'text',
    },
    {
      fieldId: 'issuerName',
      labels: ['firma', 'satıcı', 'satici', 'ünvan', 'unvan'],
      kind: 'text',
    },
    {
      fieldId: 'eventDate',
      labels: ['fatura tarihi', 'fiş tarihi', 'fis tarihi', 'tarih'],
      kind: 'date',
    },
  ],
  custom: [
    {
      fieldId: 'documentNumber',
      labels: ['ceza no', 'tutanak no', 'belge no', 'evrak no'],
      kind: 'text',
    },
    { fieldId: 'issuerName', labels: ['kurum', 'düzenleyen', 'duzenleyen'], kind: 'text' },
    {
      fieldId: 'eventDate',
      labels: ['düzenleme tarihi', 'duzenleme tarihi', 'belge tarihi', 'tarih'],
      kind: 'date',
    },
    {
      fieldId: 'expiryDate',
      labels: ['son ödeme tarihi', 'son odeme tarihi', 'bitiş tarihi', 'bitis tarihi'],
      kind: 'date',
    },
  ],
};

export const OCR_SUPPORTED_DOCUMENT_TYPES = Object.freeze(
  Object.keys(rulesByType) as DocumentType[],
);

export function normalizeOcrText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) =>
      line
        .replace(/[\t\u00a0]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n');
}

function normalizeLabel(value: string): string {
  return value.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
}

function extractLabeledValue(lines: readonly string[], labels: readonly string[]): string | null {
  const normalizedLabels = labels.map(normalizeLabel).sort((a, b) => b.length - a.length);
  for (const line of lines) {
    const normalizedLine = normalizeLabel(line);
    for (const label of normalizedLabels) {
      const labelIndex = normalizedLine.indexOf(label);
      if (labelIndex < 0 || labelIndex > 4) continue;
      const boundary = normalizedLine.slice(
        labelIndex + label.length,
        labelIndex + label.length + 1,
      );
      if (boundary && !/[.:\-\s]/.test(boundary)) continue;
      const value = line
        .slice(labelIndex + label.length)
        .replace(/^\s*[.:\-–]+\s*/, '')
        .trim();
      if (value) return value;
    }
  }
  return null;
}

export function parseTurkishDate(value: string): string | null {
  const match = value.match(/(?:^|\D)(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\D|$)/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1900 ||
    year > 2200 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
}

function normalizeTextValue(value: string): string | null {
  const cleaned = value
    .replace(/^[|;,.]+|[|;]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || null;
}

export function parseDocumentOcrText(
  documentType: DocumentType,
  rawText: string,
): DocumentOcrSuggestion[] {
  const rules = rulesByType[documentType];
  if (!rules) return [];
  const normalized = normalizeOcrText(rawText);
  if (!normalized) return [];
  const lines = normalized.split('\n');
  const suggestions: DocumentOcrSuggestion[] = [];

  for (const rule of rules) {
    if (!hasDocumentField(documentType, rule.fieldId)) continue;
    const rawValue = extractLabeledValue(lines, rule.labels);
    if (!rawValue) continue;
    const suggestedValue =
      rule.kind === 'date' ? parseTurkishDate(rawValue) : normalizeTextValue(rawValue);
    if (!suggestedValue) continue;
    suggestions.push({ fieldId: rule.fieldId, suggestedValue, source: 'document_ocr' });
  }

  return suggestions;
}
