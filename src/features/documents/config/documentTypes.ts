import type { DocumentType } from '@/domain/entities';

export type DocumentFieldKey =
  | 'title'
  | 'documentNumber'
  | 'issuerName'
  | 'startDate'
  | 'eventDate'
  | 'expiryDate'
  | 'note'
  | 'attachments';

export interface DocumentFieldDefinition {
  key: DocumentFieldKey;
  label: string;
  kind: 'text' | 'date' | 'multiline' | 'attachments';
  required: boolean;
}

export interface DocumentTypeDefinition {
  id: DocumentType;
  label: string;
  fields: readonly DocumentFieldDefinition[];
}

const title = (label = 'Başlık'): DocumentFieldDefinition => ({
  key: 'title',
  label,
  kind: 'text',
  required: true,
});
const text = (key: DocumentFieldKey, label: string): DocumentFieldDefinition => ({
  key,
  label,
  kind: 'text',
  required: false,
});
const date = (key: DocumentFieldKey, label: string): DocumentFieldDefinition => ({
  key,
  label,
  kind: 'date',
  required: false,
});
const note: DocumentFieldDefinition = {
  key: 'note',
  label: 'Not',
  kind: 'multiline',
  required: false,
};
const attachments: DocumentFieldDefinition = {
  key: 'attachments',
  label: 'Ek dosyalar',
  kind: 'attachments',
  required: false,
};

export const DOCUMENT_TYPE_DEFINITIONS = [
  {
    id: 'registration',
    label: 'Ruhsat',
    fields: [
      title(),
      text('documentNumber', 'Belge / seri numarası'),
      date('eventDate', 'Tescil tarihi'),
      note,
      attachments,
    ],
  },
  {
    id: 'traffic_insurance',
    label: 'Trafik sigortası',
    fields: [
      title(),
      text('documentNumber', 'Poliçe numarası'),
      text('issuerName', 'Sigorta şirketi'),
      date('startDate', 'Başlangıç tarihi'),
      date('expiryDate', 'Bitiş tarihi'),
      note,
      attachments,
    ],
  },
  {
    id: 'comprehensive_insurance',
    label: 'Kasko',
    fields: [
      title(),
      text('documentNumber', 'Poliçe numarası'),
      text('issuerName', 'Sigorta şirketi'),
      date('startDate', 'Başlangıç tarihi'),
      date('expiryDate', 'Bitiş tarihi'),
      note,
      attachments,
    ],
  },
  {
    id: 'inspection',
    label: 'Muayene',
    fields: [
      title(),
      date('eventDate', 'Muayene tarihi'),
      date('expiryDate', 'Sonraki muayene tarihi'),
      text('issuerName', 'İstasyon / kurum'),
      note,
      attachments,
    ],
  },
  {
    id: 'expertise_report',
    label: 'Ekspertiz raporu',
    fields: [
      title(),
      date('eventDate', 'Rapor tarihi'),
      text('issuerName', 'Firma / ekspertiz merkezi'),
      text('documentNumber', 'Rapor numarası'),
      note,
      attachments,
    ],
  },
  {
    id: 'tax',
    label: 'MTV',
    fields: [
      title(),
      text('documentNumber', 'Belge numarası'),
      date('eventDate', 'Belge tarihi'),
      date('expiryDate', 'Son ödeme / geçerlilik tarihi'),
      note,
      attachments,
    ],
  },
  {
    id: 'service_document',
    label: 'Servis belgesi',
    fields: [
      title(),
      text('documentNumber', 'Belge numarası'),
      text('issuerName', 'Servis / kurum'),
      date('eventDate', 'Belge tarihi'),
      note,
      attachments,
    ],
  },
  {
    id: 'invoice',
    label: 'Fatura',
    fields: [
      title(),
      text('documentNumber', 'Fatura numarası'),
      text('issuerName', 'Firma / kurum'),
      date('eventDate', 'Fatura tarihi'),
      note,
      attachments,
    ],
  },
  {
    id: 'custom',
    label: 'Diğer belge',
    fields: [
      title(),
      text('documentNumber', 'Belge numarası'),
      text('issuerName', 'Firma / kurum'),
      date('eventDate', 'Belge tarihi'),
      date('expiryDate', 'Bitiş tarihi'),
      note,
      attachments,
    ],
  },
] as const satisfies readonly DocumentTypeDefinition[];

export const documentTypeLabels = Object.fromEntries(
  DOCUMENT_TYPE_DEFINITIONS.map((definition) => [definition.id, definition.label]),
) as Record<DocumentType, string>;

export const documentTypeOptions = DOCUMENT_TYPE_DEFINITIONS.map(({ id, label }) => ({
  value: id,
  label,
}));

export function getDocumentTypeDefinition(type: DocumentType): DocumentTypeDefinition {
  return (
    DOCUMENT_TYPE_DEFINITIONS.find((definition) => definition.id === type) ??
    DOCUMENT_TYPE_DEFINITIONS[DOCUMENT_TYPE_DEFINITIONS.length - 1]
  );
}

export function hasDocumentField(type: DocumentType, field: DocumentFieldKey): boolean {
  return getDocumentTypeDefinition(type).fields.some((definition) => definition.key === field);
}
