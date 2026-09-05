import { getFriendlyError } from '@/shared/utils/errors';
import { logRecoveryTrace } from './recoveryTrace';

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

/**
 * Dev-only redacted trace of the recovery deep-link handling so a physical
 * Android test tells us exactly which stage stops (capture / route / parse /
 * verify / result). Never receives a token, URL or email — the incoming
 * diagnostic is structural by construction, and is re-emitted here under the
 * single `[auth:recovery:trace]` prefix shared with the capture and route
 * stages so one log filter shows the whole chain.
 */
export function logRecoveryDiagnosticInDevelopment(diagnostic: unknown): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;

  const event = diagnostic as {
    stage?: string;
    kind?: string;
    ok?: boolean;
    recoveryEventSeen?: boolean;
  } | null;
  if (event?.stage === 'parse') {
    logRecoveryTrace({ stage: 'parse', callbackAccepted: event.kind !== 'error' });
    return;
  }
  if (event?.stage === 'exchange') {
    logRecoveryTrace({
      stage: 'verify',
      verifyOtpAttempted: true,
      verifyOtpSucceeded: Boolean(event.ok),
    });
    return;
  }
  if (event?.stage === 'result') {
    logRecoveryTrace({
      stage: 'result',
      callbackAccepted: Boolean(event.ok),
      recoveryEventSeen: Boolean(event.recoveryEventSeen),
    });
    return;
  }
  logRecoveryTrace({ stage: 'result' });
}
