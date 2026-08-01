import { getFriendlyError } from '@/shared/utils/errors';

export interface SafeAuthErrorDetails {
  code: string;
  message: string;
}

const fallbackCode = 'unknown_auth_error';
const fallbackMessage = 'Unknown authentication error';
const maxLogTextLength = 240;

function sanitizeLogText(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.trim()) return fallback;

  return value
    .trim()
    .slice(0, maxLogTextLength)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(
      /\b(access_token|refresh_token|token|apikey|authorization)\b\s*[:=]\s*\S+/gi,
      '$1=[REDACTED]',
    );
}

export function getSafeAuthErrorDetails(error: unknown): SafeAuthErrorDetails {
  const authError = error as { code?: unknown; message?: unknown } | null;

  return {
    code: sanitizeLogText(authError?.code, fallbackCode),
    message: sanitizeLogText(authError?.message, fallbackMessage),
  };
}

export function getPasswordResetFriendlyError(error: unknown): string {
  const { code, message } = getSafeAuthErrorDetails(error);
  const normalizedMessage = message.toLowerCase();

  if (
    code === 'over_email_send_rate_limit' ||
    normalizedMessage.includes('email rate limit exceeded')
  ) {
    return 'E-posta gönderim sınırına ulaşıldı. Lütfen bir süre bekleyip tekrar deneyin.';
  }

  if (code === 'email_address_not_authorized') {
    return 'Bu e-posta adresine gönderim yapılamıyor. Lütfen uygulama yöneticisiyle iletişime geçin.';
  }

  return getFriendlyError(error);
}

export function logPasswordResetErrorInDevelopment(error: unknown): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;

  console.warn('[auth:password-reset]', getSafeAuthErrorDetails(error));
}
