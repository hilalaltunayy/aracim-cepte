import { findBackendErrorMessage } from './backendErrorMessages';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code = 'UNKNOWN',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Pulls the message out of anything a Supabase sub-client may reject with.
 *
 * PostgREST errors are `Error` subclasses, but Storage, Functions and a few
 * transport paths reject with a plain `{ message }` object. Reading both is what
 * keeps a real backend reason from being reported as a generic failure purely
 * because of which client produced it.
 */
function errorMessage(error: unknown): string | null {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return null;
}

export function isSessionExpiredError(error: unknown): boolean {
  if (error instanceof AppError && error.code === 'AUTH') return true;
  const message = errorMessage(error);
  if (message === null) return false;
  const text = message.toLowerCase();
  return (
    text.includes('jwt expired') ||
    text.includes('refresh token') ||
    (text.includes('session') && text.includes('expired')) ||
    text.includes('oturumunuz sona er')
  );
}

export function getFriendlyError(error: unknown): string {
  if (error instanceof AppError) return error.message;
  const message = errorMessage(error);
  if (message !== null) {
    const text = message.toLowerCase();
    if (text.includes('invalid login credentials')) return 'E-posta veya şifre hatalı.';
    if (text.includes('email not confirmed')) return 'E-posta adresinizi doğrulamanız gerekiyor.';
    if (text.includes('user already registered')) return 'Bu e-posta adresi zaten kayıtlı.';
    if (isSessionExpiredError(error)) return 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.';
    if (text.includes('weak password') || text.includes('password should be'))
      return 'Şifre güvenlik koşullarını karşılamıyor.';
    // Known database/Edge guard codes. Checked before the network fallback so a
    // real quota or entitlement rejection is never reported as a network problem.
    const backendMessage = findBackendErrorMessage(message);
    if (backendMessage) return backendMessage;
    if (text.includes('network') || text.includes('fetch'))
      return 'Ağ bağlantısı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.';
  }
  return 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
}
