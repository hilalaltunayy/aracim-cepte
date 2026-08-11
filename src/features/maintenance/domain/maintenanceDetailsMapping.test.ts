import { describe, expect, it } from 'vitest';
import type { Database } from '@/data/supabase/database.types';
import { mapRecord } from '@/data/mappers/databaseMappers';

type RecordRow = Database['public']['Tables']['vehicle_records']['Row'];

const row: RecordRow = {
  id: '10000000-0000-4000-8000-000000000024',
  vehicle_id: '20000000-0000-4000-8000-000000000024',
  owner_id: '30000000-0000-4000-8000-000000000024',
  record_type: 'maintenance',
  category: 'Periyodik bakım',
  amount: 5000,
  record_date: '2026-08-11',
  kilometer: 148000,
  liters: null,
  price_per_liter: null,
  station_brand: null,
  description: 'Sentetik not',
  source: 'manual',
  service_type: 'authorized_service',
  service_name: 'QA Servis',
  parts_cost: 3200,
  labor_cost: 1800,
  invoice_number: 'QA-001',
  created_at: '2026-08-11T09:00:00.000Z',
  updated_at: '2026-08-11T09:00:00.000Z',
};

describe('maintenance details persistence mapping', () => {
  it('restores optional service fields and linked private attachments', () => {
    const mapped = mapRecord(
      row,
      [],
      [
        {
          id: '40000000-0000-4000-8000-000000000024',
          owner_id: row.owner_id,
          vehicle_id: row.vehicle_id,
          parent_type: 'maintenance_record',
          parent_id: row.id,
          source: 'document',
          original_filename: 'invoice.pdf',
          storage_path: `${row.owner_id}/${row.vehicle_id}/maintenance_record/${row.id}/random.pdf`,
          mime_type: 'application/pdf',
          size_bytes: 1024,
          created_at: row.created_at,
        },
      ],
    );

    expect(mapped).toMatchObject({
      serviceType: 'authorized_service',
      serviceName: 'QA Servis',
      partsCost: 3200,
      laborCost: 1800,
      invoiceNumber: 'QA-001',
      description: 'Sentetik not',
    });
    expect(mapped.attachments).toHaveLength(1);
    expect(mapped.attachments?.[0]).toMatchObject({
      parentType: 'maintenance_record',
      originalName: 'invoice.pdf',
      mimeType: 'application/pdf',
    });
  });

  it('keeps legacy maintenance rows readable when optional details are null', () => {
    expect(
      mapRecord({
        ...row,
        service_type: null,
        service_name: null,
        parts_cost: null,
        labor_cost: null,
        invoice_number: null,
      }),
    ).toMatchObject({
      serviceType: null,
      serviceName: null,
      partsCost: null,
      laborCost: null,
      invoiceNumber: null,
      attachments: [],
    });
  });
});
