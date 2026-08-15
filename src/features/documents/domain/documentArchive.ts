import type { VehicleDocument } from '@/domain/entities';
import { getDocumentStatus, type DocumentStatus } from './documentStatus';

export type DocumentArchiveFilter = 'active' | 'expiring_soon' | 'archive';

export interface DocumentArchiveCounts {
  active: number;
  expiring_soon: number;
  archive: number;
}

export function getDocumentArchiveFilter(status: DocumentStatus): DocumentArchiveFilter {
  if (status === 'expired') return 'archive';
  if (status === 'expiring_soon') return 'expiring_soon';
  // A document without an expiry remains part of the current, neutral view.
  return 'active';
}

export function filterDocumentsForArchive(
  documents: readonly VehicleDocument[],
  filter: DocumentArchiveFilter,
  today?: string,
): VehicleDocument[] {
  return documents.filter(
    (document) =>
      getDocumentArchiveFilter(getDocumentStatus(document.expiryDate, today)) === filter,
  );
}

export function getDocumentArchiveCounts(
  documents: readonly VehicleDocument[],
  today?: string,
): DocumentArchiveCounts {
  return documents.reduce<DocumentArchiveCounts>(
    (counts, document) => {
      const filter = getDocumentArchiveFilter(getDocumentStatus(document.expiryDate, today));
      counts[filter] += 1;
      return counts;
    },
    { active: 0, expiring_soon: 0, archive: 0 },
  );
}
