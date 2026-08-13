export class AppError extends Error {
  constructor(
    message: string,
    public readonly code = 'UNKNOWN',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isSessionExpiredError(error: unknown): boolean {
  if (error instanceof AppError && error.code === 'AUTH') return true;
  if (!(error instanceof Error)) return false;
  const text = error.message.toLowerCase();
  return (
    text.includes('jwt expired') ||
    text.includes('refresh token') ||
    (text.includes('session') && text.includes('expired')) ||
    text.includes('oturumunuz sona er')
  );
}

export function getFriendlyError(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) {
    const text = error.message.toLowerCase();
    if (text.includes('invalid login credentials')) return 'E-posta veya şifre hatalı.';
    if (text.includes('email not confirmed')) return 'E-posta adresinizi doğrulamanız gerekiyor.';
    if (text.includes('user already registered')) return 'Bu e-posta adresi zaten kayıtlı.';
    if (isSessionExpiredError(error)) return 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.';
    if (text.includes('weak password') || text.includes('password should be'))
      return 'Şifre güvenlik koşullarını karşılamıyor.';
    if (text.includes('same password')) return 'Yeni şifre önceki şifrenizden farklı olmalıdır.';
    if (text.includes('vehicle_limit_reached'))
      return 'Araç limitinize ulaştınız. Mevcut araçlarınız korunur.';
    if (text.includes('network') || text.includes('fetch'))
      return 'Ağ bağlantısı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.';
  }
  return 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
}
