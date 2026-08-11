import type { DocumentType, VehicleDocument } from '@/domain/entities';
import {
  getDocumentTypeDefinition,
  hasDocumentField,
  type DocumentFieldKey,
} from '../config/documentTypes';

export interface DocumentFormValues {
  title: string;
  documentNumber: string;
  issuerName: string;
  startDate: string | null;
  eventDate: string | null;
  expiryDate: string | null;
  note: string;
}

export interface NormalizedDocumentValues {
  title: string;
  documentNumber: string | null;
  issuerName: string | null;
  startDate: string | null;
  eventDate: string | null;
  expiryDate: string | null;
  note: string | null;
}

export interface DocumentValidationResult {
  valid: boolean;
  errors: Partial<Record<DocumentFieldKey, string>>;
}

function validDateOnly(value: string | null): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function normalizeDocumentValues(
  type: DocumentType,
  values: DocumentFormValues,
): NormalizedDocumentValues {
  const keep = (field: DocumentFieldKey) => hasDocumentField(type, field);
  return {
    title: values.title.trim(),
    documentNumber: keep('documentNumber') ? values.documentNumber.trim() || null : null,
    issuerName: keep('issuerName') ? values.issuerName.trim() || null : null,
    startDate: keep('startDate') ? values.startDate : null,
    eventDate: keep('eventDate') ? values.eventDate : null,
    expiryDate: keep('expiryDate') ? values.expiryDate : null,
    note: keep('note') ? values.note.trim() || null : null,
  };
}

export function preserveHiddenLegacyDocumentValues(
  type: DocumentType,
  normalized: NormalizedDocumentValues,
  existing: VehicleDocument | undefined,
): NormalizedDocumentValues {
  if (!existing || existing.documentType !== type) return normalized;
  return {
    ...normalized,
    issuerName: hasDocumentField(type, 'issuerName') ? normalized.issuerName : existing.issuerName,
    startDate: hasDocumentField(type, 'startDate') ? normalized.startDate : existing.startDate,
    eventDate: hasDocumentField(type, 'eventDate') ? normalized.eventDate : existing.eventDate,
    expiryDate: hasDocumentField(type, 'expiryDate') ? normalized.expiryDate : existing.expiryDate,
  };
}

export function validateDocument(
  type: DocumentType,
  values: DocumentFormValues,
): DocumentValidationResult {
  const errors: DocumentValidationResult['errors'] = {};
  const definition = getDocumentTypeDefinition(type);
  for (const field of definition.fields) {
    if (!field.required) continue;
    const value = field.key === 'attachments' ? null : values[field.key];
    if (typeof value === 'string' && !value.trim()) {
      errors[field.key] = `${field.label} gereklidir.`;
    }
  }

  for (const field of ['startDate', 'eventDate', 'expiryDate'] as const) {
    if (hasDocumentField(type, field) && !validDateOnly(values[field])) {
      errors[field] = 'Geçerli bir tarih seçin.';
    }
  }

  if (
    (type === 'traffic_insurance' || type === 'comprehensive_insurance') &&
    values.startDate &&
    values.expiryDate &&
    values.expiryDate < values.startDate
  ) {
    errors.expiryDate = 'Bitiş tarihi başlangıç tarihinden önce olamaz.';
  }

  if (
    type === 'inspection' &&
    values.eventDate &&
    values.expiryDate &&
    values.expiryDate < values.eventDate
  ) {
    errors.expiryDate = 'Sonraki muayene tarihi muayene tarihinden önce olamaz.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function resolveDocumentTitleForTypeChange(
  previousType: DocumentType,
  nextType: DocumentType,
  currentTitle: string,
  isExisting: boolean,
): string {
  if (isExisting) return currentTitle;
  const previousDefault = getDocumentTypeDefinition(previousType).label;
  return currentTitle === previousDefault
    ? getDocumentTypeDefinition(nextType).label
    : currentTitle;
}
