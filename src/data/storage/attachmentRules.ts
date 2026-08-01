export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type AllowedAttachmentMime = (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number];

export function normalizeAttachmentMime(
  value: string | null | undefined,
): AllowedAttachmentMime | null {
  const normalized = value?.split(';', 1)[0]?.trim().toLowerCase();
  return ALLOWED_ATTACHMENT_MIME_TYPES.includes(normalized as AllowedAttachmentMime)
    ? (normalized as AllowedAttachmentMime)
    : null;
}

export function getAttachmentErrorMessage(code: string | null): string {
  switch (code) {
    case 'ATTACHMENT_EMPTY':
      return 'Boş dosya yüklenemez.';
    case 'ATTACHMENT_FILE_TOO_LARGE':
      return 'Dosya en fazla 5 MB olabilir.';
    case 'ATTACHMENT_TYPE_NOT_ALLOWED':
    case 'ATTACHMENT_CONTENT_MISMATCH':
      return 'Yalnızca PDF, JPG/JPEG ve PNG dosyaları yüklenebilir.';
    case 'ATTACHMENT_COUNT_QUOTA_EXCEEDED':
      return 'En fazla 10 belge saklayabilirsiniz.';
    case 'ATTACHMENT_BYTES_QUOTA_EXCEEDED':
      return 'Toplam belge kotanız 25 MB ile sınırlıdır.';
    case 'ATTACHMENT_VEHICLE_FORBIDDEN':
      return 'Bu araç için dosya yükleme yetkiniz yok.';
    case 'AUTH_REQUIRED':
      return 'Dosya yüklemek için yeniden giriş yapın.';
    default:
      return 'Dosya yüklenemedi. Lütfen tekrar deneyin.';
  }
}
