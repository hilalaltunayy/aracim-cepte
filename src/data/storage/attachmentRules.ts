import { ATTACHMENT_CONFIG } from '@/features/attachments/config/attachmentConfig';

export const MAX_ATTACHMENT_BYTES = ATTACHMENT_CONFIG.maxFileBytes;
export const ALLOWED_ATTACHMENT_MIME_TYPES = ATTACHMENT_CONFIG.supportedMimeTypes;

export type AllowedAttachmentMime = (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number];
export type AttachmentPickerSource = 'image' | 'document';

export const ATTACHMENT_OPEN_ERROR_MESSAGE =
  'Dosya açılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.';

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
    case 'ATTACHMENT_SIZE_REQUIRED':
    case 'ATTACHMENT_SIZE_MISMATCH':
      return 'Dosya boyutu güvenli biçimde doğrulanamadı. Lütfen dosyayı yeniden seçin.';
    case 'ATTACHMENT_TYPE_NOT_ALLOWED':
    case 'ATTACHMENT_CONTENT_MISMATCH':
      return 'Yalnızca PDF, JPG, JPEG ve PNG dosyalarını yükleyebilirsiniz.';
    case 'ATTACHMENT_COUNT_QUOTA_EXCEEDED':
      return 'Ücretsiz planda en fazla 10 belge yükleyebilirsiniz.';
    case 'ATTACHMENT_BYTES_QUOTA_EXCEEDED':
      return 'Ücretsiz belge alanınız 25 MB ile sınırlıdır.';
    case 'ATTACHMENT_ENTITY_COUNT_EXCEEDED':
      return 'Bu kayıt için ek dosya sınırına ulaştınız.';
    case 'ATTACHMENT_ENTITY_BYTES_EXCEEDED':
      return 'Bu kaydın ek dosyaları için toplam boyut sınırına ulaştınız.';
    case 'ATTACHMENT_PARENT_FORBIDDEN':
    case 'ATTACHMENT_VEHICLE_FORBIDDEN':
      return 'Bu araç için dosya yükleme yetkiniz yok.';
    case 'AUTH_REQUIRED':
      return 'Dosya yüklemek için yeniden giriş yapın.';
    default:
      return 'Dosya yüklenemedi. Lütfen tekrar deneyin.';
  }
}

export function getAttachmentPickerErrorMessage(
  source: AttachmentPickerSource,
  code: string | null,
): string {
  if (code === 'ATTACHMENT_TYPE_NOT_ALLOWED' || code === 'ATTACHMENT_CONTENT_MISMATCH') {
    return source === 'image'
      ? 'Yalnızca JPG, JPEG ve PNG biçimindeki fotoğrafları yükleyebilirsiniz.'
      : 'Yalnızca PDF, JPG, JPEG ve PNG dosyalarını yükleyebilirsiniz.';
  }
  return getAttachmentErrorMessage(code);
}
