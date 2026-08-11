import { describe, expect, it, vi } from 'vitest';
import type { PendingAttachment } from '@/features/attachments/domain/types';
import type { DocumentOcrProvider } from '@/features/documents/ocr/domain/documentOcrTypes';
import { analyzeFuelReceiptAttachment, parseFuelReceiptOcrText } from './fuelReceiptOcr';

const image: PendingAttachment = {
  id: 'synthetic-receipt',
  requestId: 'synthetic-request',
  uri: 'file:///synthetic-receipt.jpg',
  originalName: 'synthetic-receipt.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  source: 'gallery',
};

function values(text: string) {
  return Object.fromEntries(
    parseFuelReceiptOcrText(text).suggestions.map((suggestion) => [suggestion.fieldId, suggestion.value]),
  );
}

describe('fuel receipt OCR parser', () => {
  it('extracts labelled total, litres and unit price with Turkish decimals', () => {
    expect(values('Toplam: 2.000,00 TL\nLitre: 43,29 LT\nBirim Fiyat: 46,20 TL/L')).toMatchObject({
      total: '2000',
      liters: '43,29',
      pricePerLiter: '46,2',
    });
  });

  it('accepts dot decimals and derives a missing value through the fuel helper', () => {
    expect(values('Ödenecek: 906.40\nLitre: 20.0')).toMatchObject({
      total: '906,4',
      liters: '20',
      pricePerLiter: '45,32',
    });
  });

  it.each([
    ['OPET İSTASYONU', 'opet'],
    ['SHELL TURKEY', 'shell'],
    ['PETROL OFİSİ', 'petrol_ofisi'],
    ['BP AKARYAKIT', 'bp'],
    ['TOTAL ENERGIES', 'totalenergies'],
    ['AYTEMİZ', 'aytemiz'],
  ])('detects %s conservatively', (receipt, stationBrand) => {
    expect(values(`${receipt}\nToplam: 100,00`)).toMatchObject({ stationBrand });
  });

  it('extracts the receipt date and keeps partial results useful', () => {
    expect(values('Tarih: 11.08.2026\nToplam: 500,00')).toMatchObject({
      recordDate: '2026-08-11',
      total: '500',
    });
  });

  it('does not treat KDV or receipt identifiers as a total', () => {
    expect(values('KDV Tutar: 120,00\nFiş No: 9912\nTerminal: 17')).toEqual({});
  });

  it('flags inconsistent three-value results but accepts normal rounding tolerance', () => {
    expect(parseFuelReceiptOcrText('Toplam: 2000,00\nLitre: 43,29\nBirim Fiyat: 46,20').inconsistent).toBe(false);
    expect(parseFuelReceiptOcrText('Toplam: 2000,00\nLitre: 43,29\nBirim Fiyat: 30,00').inconsistent).toBe(true);
  });

  it('returns safe no-fields and unsupported-file states', async () => {
    const noFieldsProvider: DocumentOcrProvider = {
      analyzeImage: vi.fn().mockResolvedValue({ status: 'success', rawText: 'Merhaba dünya' }),
    };
    await expect(analyzeFuelReceiptAttachment(image, noFieldsProvider)).resolves.toEqual({
      status: 'error',
      code: 'no_fields',
    });
    await expect(
      analyzeFuelReceiptAttachment({ ...image, mimeType: 'application/pdf' }, noFieldsProvider),
    ).resolves.toEqual({ status: 'error', code: 'unsupported_attachment' });
  });

  it('maps a provider exception to a safe failure without persisting anything', async () => {
    const failingProvider: DocumentOcrProvider = {
      analyzeImage: vi.fn().mockRejectedValue(new Error('synthetic provider failure')),
    };
    await expect(analyzeFuelReceiptAttachment(image, failingProvider)).resolves.toEqual({
      status: 'error',
      code: 'failed',
    });
  });
});
