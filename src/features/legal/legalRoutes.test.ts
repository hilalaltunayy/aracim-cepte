import { describe, expect, it } from 'vitest';
import { LEGAL_ROUTES } from './legalRoutes';

describe('legal route smoke contract', () => {
  it('exposes the five canonical in-app documents from one list', () => {
    expect(LEGAL_ROUTES.map((item) => item.href)).toEqual([
      '/legal/kvkk-notice',
      '/legal/privacy-policy',
      '/legal/retention-and-deletion',
      '/legal/account-and-data-deletion',
      '/legal/kvkk-application',
    ]);
    expect(LEGAL_ROUTES.map((item) => item.url)).toEqual([
      'https://aracimcepte.hilalaltunay.com/kvkk-aydinlatma',
      'https://aracimcepte.hilalaltunay.com/gizlilik-politikasi',
      'https://aracimcepte.hilalaltunay.com/saklama-silme',
      'https://aracimcepte.hilalaltunay.com/hesap-silme',
      'https://aracimcepte.hilalaltunay.com/veri-basvurusu',
    ]);
  });
});
