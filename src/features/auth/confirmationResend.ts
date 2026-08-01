export const CONFIRMATION_RESEND_COOLDOWN_MS = 30_000;
export const CONFIRMATION_RESEND_SUCCESS_MESSAGE =
  'Doğrulama e-postası yeniden gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.';

export interface ConfirmationResendClient {
  resend: (credentials: { type: 'signup'; email: string }) => Promise<{ error: Error | null }>;
}

export function getConfirmationCooldownSeconds(until: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((until - now) / 1000));
}

export function getConfirmationResendError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Doğrulama e-postası kısa süre önce gönderildi. Lütfen biraz bekleyip tekrar deneyin.';
  }
  return 'Doğrulama e-postası gönderilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.';
}

export async function resendSignupConfirmation(
  client: ConfirmationResendClient,
  email: string,
): Promise<void> {
  const { error } = await client.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
  });
  if (error) throw error;
}
