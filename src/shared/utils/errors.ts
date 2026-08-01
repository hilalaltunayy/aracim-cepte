export class AppError extends Error {
  constructor(
    message: string,
    public readonly code = 'UNKNOWN',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function getFriendlyError(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) {
    const text = error.message.toLowerCase();
    if (text.includes('invalid login credentials')) return 'E-posta veya şifre hatalı.';
    if (text.includes('email not confirmed')) return 'E-posta adresinizi doğrulamanız gerekiyor.';
    if (text.includes('user already registered')) return 'Bu e-posta adresi zaten kayıtlı.';
    if (
      text.includes('jwt expired') ||
      text.includes('refresh token') ||
      (text.includes('session') && text.includes('expired'))
    )
      return 'Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.';
    if (text.includes('weak password') || text.includes('password should be'))
      return 'Şifre güvenlik koşullarını karşılamıyor.';
    if (text.includes('same password')) return 'Yeni şifre önceki şifrenizden farklı olmalıdır.';
    if (text.includes('network') || text.includes('fetch'))
      return 'Ağ bağlantısı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.';
  }
  return 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
}
