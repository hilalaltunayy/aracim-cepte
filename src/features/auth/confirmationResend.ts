export const CONFIRMATION_RESEND_COOLDOWN_MS = 60_000;
export const CONFIRMATION_RESEND_MAX_ATTEMPTS = 3;
export const CONFIRMATION_RESEND_SUCCESS_MESSAGE =
  'Doğrulama e-postası yeniden gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.';

export const CONFIRMATION_RESEND_LIMIT_MESSAGE =
  'Çok fazla doğrulama e-postası istediniz. Lütfen daha sonra tekrar deneyin.';

export interface ConfirmationResendClient {
  resend: (credentials: {
    type: 'signup';
    email: string;
    options: { emailRedirectTo: string };
  }) => Promise<{ error: Error | null }>;
}

export function getConfirmationCooldownSeconds(until: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((until - now) / 1000));
}

export function getConfirmationResendError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('already confirmed') || message.includes('already verified')) {
    return 'Bu e-posta adresi zaten doğrulanmış. Giriş ekranından devam edebilirsiniz.';
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Doğrulama e-postası kısa süre önce gönderildi. Lütfen biraz bekleyip tekrar deneyin.';
  }
  return 'Doğrulama e-postası gönderilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.';
}

export async function resendSignupConfirmation(
  client: ConfirmationResendClient,
  email: string,
  emailRedirectTo: string,
): Promise<void> {
  const { error } = await client.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo },
  });
  if (error) throw error;
}
