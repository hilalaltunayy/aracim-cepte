import { describe, expect, it } from 'vitest';
import {
  REGISTRATION_LEGAL_LINKS,
  REGISTRATION_LEGAL_NOTICE,
  REGISTRATION_SUCCESS,
  classifyRegistrationResponse,
  createRegistrationAuthOptions,
  createLoginPrefillHref,
  getLoginPrefillEmail,
} from './registrationFlow';

describe('registration completion flow', () => {
  it('uses the approved email-confirmation success copy', () => {
    expect(REGISTRATION_SUCCESS).toEqual({
      title: 'E-postanızı doğrulayın',
      message:
        'Hesabınız oluşturuldu. Doğrulama bağlantısı birkaç dakika içinde gelmezse spam klasörünü kontrol edin veya yeniden gönderin.',
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

  it('keeps the confirmation redirect in the signup auth options', () => {
    expect(
      createRegistrationAuthOptions(' Hilal ', 'aracimcepte://auth/confirm-email'),
    ).toEqual({
      emailRedirectTo: 'aracimcepte://auth/confirm-email',
      data: { display_name: 'Hilal' },
    });
  });

  it('does not confuse account creation with email delivery or disabled confirmation', () => {
    expect(classifyRegistrationResponse({ hasUser: true, hasSession: false })).toBe(
      'verification_pending',
    );
    expect(classifyRegistrationResponse({ hasUser: true, hasSession: true })).toBe(
      'confirmation_disabled',
    );
    expect(classifyRegistrationResponse({ hasUser: false, hasSession: false })).toBe(
      'missing_user',
    );
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
