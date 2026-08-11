import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_TYPE_DEFINITIONS,
  documentTypeOptions,
  getDocumentTypeDefinition,
} from './documentTypes';

describe('document type catalog', () => {
  it('keeps every supported document type in one catalog', () => {
    expect(DOCUMENT_TYPE_DEFINITIONS.map(({ id }) => id)).toEqual([
      'registration',
      'traffic_insurance',
      'comprehensive_insurance',
      'inspection',
      'expertise_report',
      'tax',
      'service_document',
      'invoice',
      'custom',
    ]);
    expect(documentTypeOptions.map((option) => option.label)).toEqual([
      'Ruhsat',
      'Trafik sigortası',
      'Kasko',
      'Muayene',
      'Ekspertiz raporu',
      'MTV',
      'Servis belgesi',
      'Fatura',
      'Diğer belge',
    ]);
  });

  it('exposes type-specific fields without insurance leakage', () => {
    expect(getDocumentTypeDefinition('traffic_insurance').fields.map(({ key }) => key)).toEqual([
      'title',
      'documentNumber',
      'issuerName',
      'startDate',
      'expiryDate',
      'note',
      'attachments',
    ]);
    expect(getDocumentTypeDefinition('registration').fields.map(({ key }) => key)).toEqual([
      'title',
      'documentNumber',
      'eventDate',
      'note',
      'attachments',
    ]);
    expect(getDocumentTypeDefinition('inspection').fields.map(({ key }) => key)).toContain(
      'eventDate',
    );
    expect(getDocumentTypeDefinition('expertise_report').fields.map(({ key }) => key)).toContain(
      'issuerName',
    );
  });
});
