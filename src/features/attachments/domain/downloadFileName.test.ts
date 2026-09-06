import { describe, expect, it } from 'vitest';
import {
  buildAttachmentDownloadName,
  getAttachmentExtension,
} from './downloadFileName';

describe('getAttachmentExtension', () => {
  it('maps every supported attachment type', () => {
    expect(getAttachmentExtension('application/pdf')).toBe('pdf');
    expect(getAttachmentExtension('image/jpeg')).toBe('jpg');
    expect(getAttachmentExtension('image/png')).toBe('png');
  });

  it('falls back rather than guessing an unknown type', () => {
    expect(getAttachmentExtension('application/zip')).toBe('bin');
  });
});

describe('buildAttachmentDownloadName', () => {
  it('keeps the original name the user uploaded', () => {
    expect(
      buildAttachmentDownloadName({
        originalName: 'Trafik Sigortası 2026.pdf',
        mimeType: 'application/pdf',
      }),
    ).toBe('Trafik_Sigortasi_2026.pdf');
  });

  it('composes a name from metadata when no original name was stored', () => {
    expect(
      buildAttachmentDownloadName({
        originalName: null,
        mimeType: 'application/pdf',
        contextLabel: 'Ekspertiz Raporu',
        contextDate: '2025-05-12',
      }),
    ).toBe('2025_Ekspertiz_Raporu.pdf');
  });

  it('falls back to a generic but valid name with no metadata at all', () => {
    expect(
      buildAttachmentDownloadName({ originalName: '   ', mimeType: 'image/png' }),
    ).toBe('Belge.png');
  });

  it('lets the stored MIME type decide the extension, not the stored name', () => {
    // A PDF uploaded under a misleading name must still be saved as a PDF, or
    // the device viewer refuses to open it.
    expect(
      buildAttachmentDownloadName({
        originalName: 'ruhsat.jpg',
        mimeType: 'application/pdf',
      }),
    ).toBe('ruhsat.jpg.pdf');
    expect(
      buildAttachmentDownloadName({
        originalName: 'fatura.pdf',
        mimeType: 'application/pdf',
      }),
    ).toBe('fatura.pdf');
  });

  it('produces a name that is safe for any file system', () => {
    const name = buildAttachmentDownloadName({
      originalName: '../../etc/pas swd:çğüöşı*?.pdf',
      mimeType: 'application/pdf',
    });
    expect(name).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(name).not.toContain('/');
    expect(name).not.toContain('..');
    expect(name.endsWith('.pdf')).toBe(true);
  });
});
