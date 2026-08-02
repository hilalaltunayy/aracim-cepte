import { describe, expect, it } from 'vitest';
import {
  REGISTRATION_LEGAL_LINKS,
  REGISTRATION_LEGAL_NOTICE,
  REGISTRATION_SUCCESS,
  createLoginPrefillHref,
  getLoginPrefillEmail,
} from './registrationFlow';

describe('registration completion flow', () => {
  it('uses the approved email-confirmation success copy', () => {
    expect(REGISTRATION_SUCCESS).toEqual({
      title: 'E-postanızı doğrulayın',
      message:
        'Doğrulama bağlantısını e-posta adresinize gönderdik. Hesabınızı etkinleştirmek için bağlantıya dokunun.',
      action: 'Giriş ekranına dön',
    });
  });

  it('returns to login with only a normalized email prefill', () => {
    expect(createLoginPrefillHref('  User@Example.COM ')).toEqual({
      pathname: '/auth/login',
      params: { email: 'user@example.com' },
    });
    expect(getLoginPrefillEmail(['USER@example.com', 'ignored@example.com'])).toBe(
      'user@example.com',
    );
    expect(createLoginPrefillHref('user@example.com').params).not.toHaveProperty('password');
  });

  it('keeps legal copy informational and links to canonical app routes', () => {
    expect(REGISTRATION_LEGAL_NOTICE).toBe(
      'Kayıt olmadan önce KVKK Aydınlatma Metni ve Gizlilik Politikası’nı inceleyebilirsiniz.',
    );
    expect(REGISTRATION_LEGAL_LINKS.map(({ title, href }) => ({ title, href }))).toEqual([
      { title: 'KVKK Aydınlatma Metni', href: '/legal/kvkk-notice' },
      { title: 'Gizlilik Politikası', href: '/legal/privacy-policy' },
    ]);
    expect(REGISTRATION_LEGAL_LINKS.map(({ url }) => url)).toEqual([
      'https://aracimcepte.hilalaltunay.com/kvkk-aydinlatma',
      'https://aracimcepte.hilalaltunay.com/gizlilik-politikasi',
    ]);
    expect(REGISTRATION_LEGAL_NOTICE.toLocaleLowerCase('tr-TR')).not.toContain('rıza');
  });
});
