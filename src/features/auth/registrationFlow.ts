import { LEGAL_LINKS } from '@/features/legal/legalLinks';

export const REGISTRATION_SUCCESS = {
  title: 'E-postanızı doğrulayın',
  message:
    'Doğrulama bağlantısını e-posta adresinize gönderdik. Hesabınızı etkinleştirmek için bağlantıya dokunun.',
  action: 'Giriş ekranına dön',
} as const;

export const REGISTRATION_LEGAL_NOTICE =
  'Kayıt olmadan önce KVKK Aydınlatma Metni ve Gizlilik Politikası’nı inceleyebilirsiniz.';

export const REGISTRATION_LEGAL_LINKS = LEGAL_LINKS.slice(0, 2).map((link) => ({
  ...link,
  accessibilityLabel: `${link.title} belgesini aç`,
}));

export function normalizeRegistrationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createLoginPrefillHref(email: string) {
  return {
    pathname: '/auth/login' as const,
    params: { email: normalizeRegistrationEmail(email) },
  };
}

export function getLoginPrefillEmail(value: string | string[] | undefined): string {
  const email = Array.isArray(value) ? value[0] : value;
  return email ? normalizeRegistrationEmail(email) : '';
}
