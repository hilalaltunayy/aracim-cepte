import { describe, expect, it } from 'vitest';
import type { VehicleDocument } from '@/domain/entities';
import {
  filterDocumentsForArchive,
  getDocumentArchiveCounts,
  getDocumentArchiveFilter,
} from './documentArchive';

const document = (id: string, expiryDate: string | null): VehicleDocument => ({
  id,
  vehicleId: 'vehicle-1',
  ownerId: 'owner-1',
  documentType: 'custom',
  title: `Belge ${id}`,
  documentNumber: null,
  issuerName: null,
  startDate: null,
  eventDate: null,
  issueDate: null,
  expiryDate,
  note: null,
  attachmentPath: null,
  attachments: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const documents = [
  document('active', '2027-01-01'),
  document('soon', '2026-08-20'),
  document('expired', '2026-07-01'),
  document('neutral', null),
];

describe('document archive filtering', () => {
  it('maps no-expiry documents to the active neutral view', () => {
    expect(getDocumentArchiveFilter('no_expiry')).toBe('active');
  });

  it('keeps filters mutually exclusive and derives real counts', () => {
    expect(getDocumentArchiveCounts(documents, '2026-08-15')).toEqual({
      active: 2,
      expiring_soon: 1,
      archive: 1,
    });
    expect(
      filterDocumentsForArchive(documents, 'active', '2026-08-15').map((item) => item.id),
    ).toEqual(['active', 'neutral']);
    expect(
      filterDocumentsForArchive(documents, 'expiring_soon', '2026-08-15').map((item) => item.id),
    ).toEqual(['soon']);
    expect(
      filterDocumentsForArchive(documents, 'archive', '2026-08-15').map((item) => item.id),
    ).toEqual(['expired']);
  });

  it('does not mutate or duplicate the source document collection', () => {
    const source = [...documents];
    const archive = filterDocumentsForArchive(source, 'archive', '2026-08-15');
    expect(source).toEqual(documents);
    expect(archive).toHaveLength(1);
    expect(new Set(archive.map((item) => item.id)).size).toBe(archive.length);
  });
});
