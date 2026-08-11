import { describe, expect, it } from 'vitest';
import type { Database } from '@/data/supabase/database.types';
import { mapDocument } from './databaseMappers';

type Tables = Database['public']['Tables'];

const documentRow: Tables['vehicle_documents']['Row'] = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  owner_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  vehicle_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  document_type: 'registration',
  title: 'Ruhsat',
  document_number: null,
  issuer_name: null,
  start_date: null,
  event_date: null,
  issue_date: null,
  expiry_date: null,
  note: null,
  attachment_path: null,
  created_at: '2026-08-11T00:00:00Z',
  updated_at: '2026-08-11T00:00:00Z',
};

describe('vehicle document mapping', () => {
  it('maps legacy generic date and single attachment without inventing metadata', () => {
    const mapped = mapDocument({
      ...documentRow,
      issue_date: '2026-01-02',
      attachment_path: 'owner/vehicle/legacy.pdf',
    });
    expect(mapped.eventDate).toBe('2026-01-02');
    expect(mapped.issuerName).toBeNull();
    expect(mapped.attachments).toEqual([
      expect.objectContaining({
        storagePath: 'owner/vehicle/legacy.pdf',
        mimeType: 'application/pdf',
        legacy: true,
      }),
    ]);
  });

  it('prefers normalized metadata and keeps unified attachments readable', () => {
    const attachments: Tables['attachments']['Row'][] = [
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        owner_id: documentRow.owner_id,
        vehicle_id: documentRow.vehicle_id,
        parent_type: 'vehicle_document',
        parent_id: documentRow.id,
        source: 'gallery',
        original_filename: 'galeri-fotografi.jpg',
        storage_path: 'owner/vehicle/random.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 1024,
        created_at: '2026-08-11T00:00:00Z',
      },
    ];
    const mapped = mapDocument(
      {
        ...documentRow,
        issuer_name: 'Örnek Sigorta',
        start_date: '2026-01-01',
        event_date: '2026-01-03',
        issue_date: '2025-12-31',
      },
      attachments,
    );
    expect(mapped).toMatchObject({
      issuerName: 'Örnek Sigorta',
      startDate: '2026-01-01',
      eventDate: '2026-01-03',
    });
    expect(mapped.attachments[0]).toMatchObject({
      parentType: 'vehicle_document',
      source: 'gallery',
    });
  });

  it('maps a legacy insurance issue date to policy start without inventing an event date', () => {
    const mapped = mapDocument({
      ...documentRow,
      document_type: 'traffic_insurance',
      issue_date: '2026-01-01',
    });
    expect(mapped.startDate).toBe('2026-01-01');
    expect(mapped.eventDate).toBeNull();
  });
});
