import { describe, expect, it } from 'vitest';
import type { DocumentType } from '@/domain/entities';
import {
  normalizeDocumentValues,
  preserveHiddenLegacyDocumentValues,
  resolveDocumentTitleForTypeChange,
  validateDocument,
  type DocumentFormValues,
} from './documentValidation';

const values = (overrides: Partial<DocumentFormValues> = {}): DocumentFormValues => ({
  title: 'Belge',
  documentNumber: '',
  issuerName: '',
  startDate: null,
  eventDate: null,
  expiryDate: null,
  note: '',
  ...overrides,
});

function valid(type: DocumentType, overrides: Partial<DocumentFormValues> = {}) {
  return validateDocument(type, values(overrides));
}

describe('document type validation', () => {
  it('accepts a valid insurance period', () => {
    expect(
      valid('traffic_insurance', { startDate: '2026-01-01', expiryDate: '2027-01-01' }).valid,
    ).toBe(true);
  });

  it('rejects insurance expiry before its start date', () => {
    const result = valid('comprehensive_insurance', {
      startDate: '2027-01-01',
      expiryDate: '2026-01-01',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.expiryDate).toContain('başlangıç');
  });

  it('accepts valid inspection dates and rejects reversed dates', () => {
    expect(valid('inspection', { eventDate: '2026-01-01', expiryDate: '2028-01-01' }).valid).toBe(
      true,
    );
    expect(
      valid('inspection', { eventDate: '2028-01-01', expiryDate: '2026-01-01' }).errors.expiryDate,
    ).toContain('muayene');
  });

  it('does not require insurance dates for registration, expertise or other documents', () => {
    expect(valid('registration').valid).toBe(true);
    expect(valid('expertise_report').valid).toBe(true);
    expect(valid('custom').valid).toBe(true);
  });

  it('requires only catalog fields marked as required', () => {
    const result = valid('registration', { title: '  ' });
    expect(result.valid).toBe(false);
    expect(result.errors.title).toBe('Başlık gereklidir.');
  });

  it('persists only fields relevant to the selected type', () => {
    expect(
      normalizeDocumentValues(
        'registration',
        values({
          documentNumber: ' ABC ',
          issuerName: 'Sigorta AŞ',
          startDate: '2026-01-01',
          eventDate: '2026-02-01',
          expiryDate: '2027-01-01',
        }),
      ),
    ).toEqual({
      title: 'Belge',
      documentNumber: 'ABC',
      issuerName: null,
      startDate: null,
      eventDate: '2026-02-01',
      expiryDate: null,
      note: null,
    });
  });

  it('updates only untouched create titles when document type changes', () => {
    expect(resolveDocumentTitleForTypeChange('registration', 'inspection', 'Ruhsat', false)).toBe(
      'Muayene',
    );
    expect(
      resolveDocumentTitleForTypeChange('registration', 'inspection', 'Aracımın ruhsatı', false),
    ).toBe('Aracımın ruhsatı');
    expect(resolveDocumentTitleForTypeChange('registration', 'inspection', 'Ruhsat', true)).toBe(
      'Ruhsat',
    );
  });

  it('preserves hidden legacy metadata until the user explicitly changes document type', () => {
    const existing = {
      id: 'doc',
      vehicleId: 'vehicle',
      ownerId: 'owner',
      documentType: 'registration' as const,
      title: 'Ruhsat',
      documentNumber: null,
      issuerName: null,
      startDate: null,
      eventDate: '2025-01-01',
      issueDate: '2025-01-01',
      expiryDate: '2030-01-01',
      note: null,
      attachmentPath: null,
      attachments: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const normalized = normalizeDocumentValues('registration', values());
    expect(
      preserveHiddenLegacyDocumentValues('registration', normalized, existing).expiryDate,
    ).toBe('2030-01-01');
    expect(
      preserveHiddenLegacyDocumentValues('inspection', normalized, existing).expiryDate,
    ).toBeNull();
  });
});
