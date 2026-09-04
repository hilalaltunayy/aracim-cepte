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
    parseFuelReceiptOcrText(text).suggestions.map((suggestion) => [
      suggestion.fieldId,
      suggestion.value,
    ]),
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

  it('extracts multiplication rows and optional time, location and document metadata', () => {
    expect(
      values(
        'OPET\nTarih: 11.08.2026 Saat: 18:42\nŞube: Konya Selçuklu\nFiş No: AB-9912\n43,29 LT x 46,20 TL/L',
      ),
    ).toMatchObject({
      liters: '43,29',
      pricePerLiter: '46,2',
      total: '2000',
      stationBrand: 'opet',
      recordDate: '2026-08-11',
      receiptTime: '18:42',
      location: 'Konya Selçuklu',
      documentNumber: 'AB-9912',
    });
  });

  it.each([
    ['DD-MM-YYYY', 'Tarih: 02-09-2026', '2026-09-02'],
    ['DD/MM/YYYY', 'Tarih: 02/09/2026', '2026-09-02'],
    ['DD.MM.YYYY', 'Tarih: 02.09.2026', '2026-09-02'],
    ['YYYY-MM-DD', 'Tarih: 2026-09-02', '2026-09-02'],
  ])('parses the receipt date in %s format', (_format, line, expected) => {
    expect(values(`${line}\nToplam: 500,00`)).toMatchObject({ recordDate: expected });
  });

  it('rejects a calendar-impossible date and reports no recordDate suggestion', () => {
    expect(values('Tarih: 32-13-2026\nToplam: 500,00').recordDate).toBeUndefined();
    expect(values('Tarih: 31-04-2026\nToplam: 500,00').recordDate).toBeUndefined();
  });

  it('never invents a date when the receipt has none', () => {
    expect(values('Toplam: 500,00\nFİŞ NO: 0142').recordDate).toBeUndefined();
  });

  it(
    'finds the date even when OCR glues it directly to an adjacent time or ' +
      'document number with no separator (RELEASE FIX: fuel OCR date mapping)',
    () => {
      // A real physical receipt: total 500, 6.55 L, unit price, 14:45, fiş no
      // 0142, and the date 02-09-2026 — but the date and time land on the OCR
      // text with zero space between them, which used to defeat the
      // day-month-year match entirely (it required a non-digit right after
      // the year, and the very next character here is the time's leading "1").
      const receipt = [
        'OPET AKARYAKIT',
        'PLAKA: 42 ABC 123',
        'TARIH:02-09-202614:45',
        '6,550 LT x 76,35 TL/L',
        'TOPLAM',
        '500,00 TL',
        'FIS NO: 0142',
      ].join('\n');
      const result = parseFuelReceiptOcrText(receipt);
      const fields = Object.fromEntries(result.suggestions.map((s) => [s.fieldId, s.value]));
      expect(fields).toMatchObject({
        total: '500',
        liters: '6,55',
        pricePerLiter: '76,35',
        recordDate: '2026-09-02',
        documentNumber: '0142',
        stationBrand: 'opet',
      });
    },
  );

  it('reconciles the real receipt: plate prefix never becomes the total (ROUND2-004)', () => {
    const receipt = [
      'OPET AKARYAKIT',
      'PLAKA: 42 ABC 123',
      'TARIH: 02-09-2026',
      'SAAT: 14:45',
      '6,550 LT x 76,35 TL/L',
      'TOPLAM',
      '500,00 TL',
      'FIS NO: 0142',
    ].join('\n');
    const result = parseFuelReceiptOcrText(receipt);
    const fields = Object.fromEntries(result.suggestions.map((s) => [s.fieldId, s.value]));
    expect(fields).toMatchObject({
      total: '500',
      liters: '6,55',
      pricePerLiter: '76,35',
      recordDate: '2026-09-02',
      receiptTime: '14:45',
      documentNumber: '0142',
      stationBrand: 'opet',
    });
    expect(result.inconsistent).toBe(false);
  });

  it('drops a loose number far from litres x price and uses the computed total', () => {
    const result = parseFuelReceiptOcrText('42 ABC 123\n6,550 LT x 76,35\nODEME 42 TL');
    const fields = Object.fromEntries(result.suggestions.map((s) => [s.fieldId, s.value]));
    expect(fields.total).toBe('500,09');
    expect(result.inconsistent).toBe(true);
  });

  it('does not treat KDV or receipt identifiers as a total while retaining the optional receipt number', () => {
    expect(values('KDV Tutar: 120,00\nFiş No: 9912\nTerminal: 17')).toEqual({
      documentNumber: '9912',
    });
  });

  it('flags inconsistent three-value results but accepts normal rounding tolerance', () => {
    expect(
      parseFuelReceiptOcrText('Toplam: 2000,00\nLitre: 43,29\nBirim Fiyat: 46,20').inconsistent,
    ).toBe(false);
    expect(
      parseFuelReceiptOcrText('Toplam: 2000,00\nLitre: 43,29\nBirim Fiyat: 30,00').inconsistent,
    ).toBe(true);
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
