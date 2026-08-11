import { describe, expect, it } from 'vitest';
import { normalizeOcrText, parseDocumentOcrText, parseTurkishDate } from './documentOcrParser';

function values(type: Parameters<typeof parseDocumentOcrText>[0], text: string) {
  return Object.fromEntries(
    parseDocumentOcrText(type, text).map((suggestion) => [
      suggestion.fieldId,
      suggestion.suggestedValue,
    ]),
  );
}

describe('document OCR parser', () => {
  it('extracts an insurance policy number', () => {
    expect(values('traffic_insurance', 'Poliçe No.: TR-123456')).toEqual({
      documentNumber: 'TR-123456',
    });
  });

  it('extracts insurance dates in common Turkish formats', () => {
    expect(
      values('traffic_insurance', 'Başlangıç Tarihi: 10.08.2026\nBitiş Tarihi: 10/08/2027'),
    ).toMatchObject({ startDate: '2026-08-10', expiryDate: '2027-08-10' });
    expect(parseTurkishDate('Geçerlilik 01-12-2028')).toBe('2028-12-01');
  });

  it('extracts an insurer without changing Turkish characters', () => {
    expect(values('comprehensive_insurance', 'Sigorta Şirketi: Güven Sigorta AŞ')).toEqual({
      issuerName: 'Güven Sigorta AŞ',
    });
  });

  it('extracts inspection and validity dates', () => {
    expect(
      values('inspection', 'Muayene Tarihi: 05.06.2026\nSonraki Muayene Tarihi: 05.06.2028'),
    ).toMatchObject({ eventDate: '2026-06-05', expiryDate: '2028-06-05' });
  });

  it('extracts an inspection institution when present', () => {
    expect(values('inspection', 'İstasyon: TÜVTÜRK İstanbul')).toEqual({
      issuerName: 'TÜVTÜRK İstanbul',
    });
  });

  it('extracts a registration serial number and date', () => {
    expect(values('registration', 'Seri No: AB 123456\nTescil Tarihi: 02.03.2021')).toEqual({
      documentNumber: 'AB 123456',
      eventDate: '2021-03-02',
    });
  });

  it('extracts expertise report number, date and center', () => {
    expect(
      values(
        'expertise_report',
        'Rapor No: EXP-77\nRapor Tarihi: 11/08/2026\nEkspertiz Merkezi: Örnek Oto',
      ),
    ).toEqual({
      documentNumber: 'EXP-77',
      eventDate: '2026-08-11',
      issuerName: 'Örnek Oto',
    });
  });

  it('normalizes whitespace without losing line or Turkish character boundaries', () => {
    expect(normalizeOcrText('  Poliçe\tNo:  123  \r\n\r\n Şirket: Güven  ')).toBe(
      'Poliçe No: 123\nŞirket: Güven',
    );
  });

  it('returns a valid partial result without inventing missing fields', () => {
    const result = parseDocumentOcrText('traffic_insurance', 'Poliçe No: 42');
    expect(result).toHaveLength(1);
    expect(result[0].fieldId).toBe('documentNumber');
  });

  it('returns no result for unlabeled or unsupported text', () => {
    expect(parseDocumentOcrText('traffic_insurance', '123456 10.08.2026')).toEqual([]);
    expect(parseDocumentOcrText('invoice', 'Fatura no: 123')).toEqual([]);
  });

  it('rejects impossible and ambiguous dates', () => {
    expect(parseTurkishDate('31.02.2026')).toBeNull();
    expect(parseTurkishDate('08/2026')).toBeNull();
    expect(values('inspection', 'Muayene Tarihi: 31.02.2026')).toEqual({});
  });

  it('does not map fields outside the selected document catalog', () => {
    expect(values('registration', 'Sigorta Şirketi: Örnek\nBelge No: R-1')).toEqual({
      documentNumber: 'R-1',
    });
  });
});
