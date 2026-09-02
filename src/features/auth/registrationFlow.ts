import { LEGAL_LINKS } from '@/features/legal/legalLinks';

export const REGISTRATION_SUCCESS = {
  title: 'E-postanızı doğrulayın',
  message:
    'Hesabınız oluşturuldu. Doğrulama bağlantısı birkaç dakika içinde gelmezse spam klasörünü kontrol edin veya yeniden gönderin.',
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

export function createRegistrationAuthOptions(displayName: string, emailRedirectTo: string) {
  return {
    emailRedirectTo,
    data: { display_name: displayName.trim() || undefined },
  };
}

export type RegistrationResponseState =
  | 'verification_pending'
  | 'missing_user'
  | 'confirmation_disabled';

/** A signup response can confirm account creation, never inbox delivery. */
export function classifyRegistrationResponse(input: {
  hasUser: boolean;
  hasSession: boolean;
}): RegistrationResponseState {
  if (!input.hasUser) return 'missing_user';
  return input.hasSession ? 'confirmation_disabled' : 'verification_pending';
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
