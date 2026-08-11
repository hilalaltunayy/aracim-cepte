import { describe, expect, it } from 'vitest';
import type { Database } from '@/data/supabase/database.types';
import { mapExpertise } from './databaseMappers';

type Tables = Database['public']['Tables'];

const report: Tables['expertise_reports']['Row'] = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  owner_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  vehicle_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  report_date: '2026-08-11',
  company_name: null,
  overall_note: null,
  report_number: null,
  attachment_path: null,
  created_at: '2026-08-11T00:00:00Z',
  updated_at: '2026-08-11T00:00:00Z',
};

describe('expertise attachment mapping', () => {
  it('keeps a legacy single attachment readable without inventing metadata', () => {
    const mapped = mapExpertise({ ...report, attachment_path: 'owner/vehicle/legacy.pdf' });
    expect(mapped.attachments).toEqual([
      expect.objectContaining({
        storagePath: 'owner/vehicle/legacy.pdf',
        mimeType: 'application/pdf',
        legacy: true,
      }),
    ]);
  });

  it('maps all unified attachment metadata into one expertise list', () => {
    const rows: Tables['attachments']['Row'][] = [
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        owner_id: report.owner_id,
        vehicle_id: report.vehicle_id,
        parent_type: 'expertise_report',
        parent_id: report.id,
        source: 'camera',
        original_filename: 'kamera.jpg',
        storage_path: 'owner/vehicle/random.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 1024,
        created_at: '2026-08-11T00:00:00Z',
      },
      {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        owner_id: report.owner_id,
        vehicle_id: report.vehicle_id,
        parent_type: 'expertise_report',
        parent_id: report.id,
        source: 'document',
        original_filename: 'rapor.pdf',
        storage_path: 'owner/vehicle/random.pdf',
        mime_type: 'application/pdf',
        size_bytes: 2048,
        created_at: '2026-08-11T00:00:00Z',
      },
    ];
    expect(mapExpertise(report, rows).attachments.map((item) => item.source)).toEqual([
      'camera',
      'document',
    ]);
  });
});
