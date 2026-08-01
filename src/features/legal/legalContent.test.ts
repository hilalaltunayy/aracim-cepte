import { describe, expect, it } from 'vitest';
import { getUserFacingLegalDocument, legalDocuments } from './legalContent';

const allContent = JSON.stringify(legalDocuments);

describe('legal content integration', () => {
  it('exposes five legal documents from canonical Markdown sources', () => {
    expect(Object.keys(legalDocuments)).toEqual([
      'kvkkNotice',
      'privacyPolicy',
      'retentionAndDeletion',
      'accountAndDataDeletion',
      'kvkkApplication',
    ]);
    expect(new Set(Object.values(legalDocuments).map((document) => document.sourcePath))).toEqual(
      new Set([
        'docs/legal/kvkk-aydinlatma-metni.md',
        'docs/legal/gizlilik-politikasi.md',
        'docs/legal/saklama-ve-silme-politikasi.md',
        'docs/legal/kvkk-basvuru-ve-hesap-silme.md',
      ]),
    );
  });

  it('keeps canonical review metadata out of the end-user presentation only', () => {
    const canonical = legalDocuments.privacyPolicy;
    const visible = getUserFacingLegalDocument(canonical);
    expect(canonical.status).toBe('HUKUK İNCELEMESİ BEKLİYOR');
    expect(JSON.stringify(visible)).not.toContain('HUKUK İNCELEMESİ BEKLİYOR');
    expect(visible.sections.length).toBeGreaterThan(0);
  });

  it('keeps draft status and approved controller contact visible', () => {
    for (const document of Object.values(legalDocuments)) {
      expect(document.status).toBe('HUKUK İNCELEMESİ BEKLİYOR');
      expect(document.sections.length).toBeGreaterThan(1);
    }
    expect(allContent).toContain('Hilal Yeşim Altunay');
    expect(allContent).toContain('altunayhilal14@gmail.com');
    expect(allContent).toContain('aracimcepte.hilalaltunay.com');
  });

  it('does not turn the notice into a generic explicit-consent statement', () => {
    expect(allContent).toContain('açık rıza beyanı değildir');
    expect(allContent).not.toContain('kişisel verilerimin işlenmesine açık rıza veriyorum');
  });
});
