import {
  ATTACHMENT_CONFIG,
  getAttachmentLimits,
  type SupportedAttachmentMime,
} from '../config/attachmentConfig';
import type { AttachmentListItem, PendingAttachment } from './types';

export type AttachmentValidationCode =
  | 'ATTACHMENT_TYPE_NOT_ALLOWED'
  | 'ATTACHMENT_FILE_TOO_LARGE'
  | 'ATTACHMENT_COUNT_LIMIT_REACHED'
  | 'ATTACHMENT_ENTITY_BYTES_LIMIT_REACHED'
  | 'ATTACHMENT_DUPLICATE_SELECTION';

export type AttachmentValidationResult =
  | { valid: true }
  | { valid: false; code: AttachmentValidationCode };

export function normalizeAttachmentMime(
  value: string | null | undefined,
): SupportedAttachmentMime | null {
  const normalized = value?.split(';', 1)[0]?.trim().toLowerCase();
  return ATTACHMENT_CONFIG.supportedMimeTypes.includes(normalized as SupportedAttachmentMime)
    ? (normalized as SupportedAttachmentMime)
    : null;
}

export function attachmentBytes(items: readonly AttachmentListItem[]): number {
  return items.reduce((total, item) => total + (item.sizeBytes ?? 0), 0);
}

export function validateAttachmentCandidate(
  candidate: Pick<PendingAttachment, 'uri' | 'mimeType' | 'sizeBytes'>,
  current: readonly AttachmentListItem[],
): AttachmentValidationResult {
  const limits = getAttachmentLimits();
  if (!normalizeAttachmentMime(candidate.mimeType)) {
    return { valid: false, code: 'ATTACHMENT_TYPE_NOT_ALLOWED' };
  }
  if (candidate.sizeBytes < 1 || candidate.sizeBytes > ATTACHMENT_CONFIG.maxFileBytes) {
    return { valid: false, code: 'ATTACHMENT_FILE_TOO_LARGE' };
  }
  if (current.length >= limits.maxAttachmentsPerEntity) {
    return { valid: false, code: 'ATTACHMENT_COUNT_LIMIT_REACHED' };
  }
  if (current.some((item) => 'uri' in item && item.uri === candidate.uri)) {
    return { valid: false, code: 'ATTACHMENT_DUPLICATE_SELECTION' };
  }
  if (
    attachmentBytes(current) + candidate.sizeBytes >
    limits.maxTotalBytesPerEntity
  ) {
    return { valid: false, code: 'ATTACHMENT_ENTITY_BYTES_LIMIT_REACHED' };
  }
  return { valid: true };
}

export function getAttachmentValidationMessage(code: AttachmentValidationCode): string {
  switch (code) {
    case 'ATTACHMENT_TYPE_NOT_ALLOWED':
      return 'Bu dosya türü desteklenmiyor.';
    case 'ATTACHMENT_FILE_TOO_LARGE':
      return 'Dosya boyutu izin verilen sınırı aşıyor.';
    case 'ATTACHMENT_COUNT_LIMIT_REACHED':
      return 'Bu kayıt için ek dosya sınırına ulaştınız.';
    case 'ATTACHMENT_ENTITY_BYTES_LIMIT_REACHED':
      return 'Bu kaydın ek dosyaları için toplam boyut sınırına ulaştınız.';
    case 'ATTACHMENT_DUPLICATE_SELECTION':
      return 'Bu dosya zaten seçildi.';
  }
}
