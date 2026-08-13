import { describe, expect, it, vi } from 'vitest';
import type { PendingAttachment } from '@/features/attachments/domain/types';
import type { DocumentOcrProvider } from '@/features/documents/ocr/domain/documentOcrTypes';
import {
  analyzeMaintenanceReceiptAttachment,
  parseMaintenanceReceiptOcrText,
} from './maintenanceReceiptOcr';

const image: PendingAttachment = {
  id: 'synthetic-maintenance-receipt',
  requestId: 'synthetic-request',
  uri: 'file:///synthetic-maintenance-receipt.jpg',
  originalName: 'synthetic-maintenance-receipt.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  source: 'gallery',
};

function values(text: string) {
  return Object.fromEntries(
    parseMaintenanceReceiptOcrText(text).suggestions.map((suggestion) => [suggestion.fieldId, suggestion.value]),
  );
}

describe('maintenance receipt OCR parser', () => {
  it('extracts service, invoice, date and totals from a labelled invoice', () => {
    expect(
      values(
        'Firma: ABC Oto Servis\nFatura No: F-12345\nTarih: 11.08.2026\nParça: 3.200,00 TL\nİşçilik: 1.100,00 TL\nGenel Toplam: 4.300,00 TL',
      ),
    ).toEqual({
      serviceName: 'ABC Oto Servis',
      invoiceNumber: 'F-12345',
      recordDate: '2026-08-11',
      partsCost: '3200',
      laborCost: '1100',
      total: '4300',
    });
  });

  it('accepts comma, dot and Turkish thousands decimal formats', () => {
    expect(values('Parça: 1.250,50\nİşçilik: 1250.50')).toMatchObject({
      partsCost: '1250,5',
      laborCost: '1250,5',
      total: '2501',
    });
  });

  it('derives a total only when both parts and labour are known', () => {
    expect(values('Malzeme: 3200\nİşçilik: 1100')).toMatchObject({ total: '4300' });
    expect(values('Malzeme: 3200')).not.toHaveProperty('total');
  });

  it('keeps partial results and ignores unrelated tax and identifier numbers', () => {
    expect(values('KDV: 200,00\nVKN: 1234567890\nFiş No: R-9\nToplam: 1500,00')).toEqual({
      invoiceNumber: 'R-9',
      total: '1500',
    });
  });

  it('returns no fields for unlabelled text', () => {
    expect(parseMaintenanceReceiptOcrText('Merhaba 1234 11.08.2026').suggestions).toEqual([]);
  });

  it('uses the on-device provider contract and returns safe failure states', async () => {
    const provider: DocumentOcrProvider = {
      analyzeImage: vi.fn().mockResolvedValue({ status: 'success', rawText: 'Toplam: 500,00' }),
    };
    await expect(analyzeMaintenanceReceiptAttachment(image, provider)).resolves.toMatchObject({
      status: 'success',
    });
    await expect(
      analyzeMaintenanceReceiptAttachment({ ...image, mimeType: 'application/pdf' }, provider),
    ).resolves.toEqual({ status: 'error', code: 'unsupported_attachment' });
    await expect(
      analyzeMaintenanceReceiptAttachment(image, {
        analyzeImage: vi.fn().mockRejectedValue(new Error('synthetic')),
      }),
    ).resolves.toEqual({ status: 'error', code: 'failed' });
  });
});
