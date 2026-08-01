import { describe, expect, it } from 'vitest';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  getAttachmentErrorMessage,
  getAttachmentPickerErrorMessage,
  normalizeAttachmentMime,
} from './attachmentRules';

describe('attachment upload rules', () => {
  it('allows only PDF, JPEG and PNG MIME types', () => {
    expect(ALLOWED_ATTACHMENT_MIME_TYPES).toEqual(['application/pdf', 'image/jpeg', 'image/png']);
    expect(normalizeAttachmentMime('IMAGE/JPEG')).toBe('image/jpeg');
    expect(normalizeAttachmentMime('image/png; charset=binary')).toBe('image/png');
    expect(normalizeAttachmentMime('image/webp')).toBeNull();
  });

  it('uses the five-megabyte binary limit', () => {
    expect(MAX_ATTACHMENT_BYTES).toBe(5_242_880);
  });

  it('returns safe Turkish quota errors', () => {
    expect(getAttachmentErrorMessage('ATTACHMENT_FILE_TOO_LARGE')).toBe(
      'Dosya en fazla 5 MB olabilir.',
    );
    expect(getAttachmentErrorMessage('ATTACHMENT_COUNT_QUOTA_EXCEEDED')).toBe(
      'Ücretsiz planda en fazla 10 belge yükleyebilirsiniz.',
    );
    expect(getAttachmentErrorMessage('ATTACHMENT_BYTES_QUOTA_EXCEEDED')).toBe(
      'Ücretsiz belge alanınız 25 MB ile sınırlıdır.',
    );
    expect(getAttachmentErrorMessage('unknown')).toBe('Dosya yüklenemedi. Lütfen tekrar deneyin.');
  });

  it('uses source-specific safe format messages', () => {
    expect(getAttachmentPickerErrorMessage('image', 'ATTACHMENT_TYPE_NOT_ALLOWED')).toBe(
      'Yalnızca JPG, JPEG ve PNG biçimindeki fotoğrafları yükleyebilirsiniz.',
    );
    expect(getAttachmentPickerErrorMessage('document', 'ATTACHMENT_CONTENT_MISMATCH')).toBe(
      'Yalnızca PDF, JPG, JPEG ve PNG dosyalarını yükleyebilirsiniz.',
    );
  });

  it('returns a safe Turkish error when server-side size validation fails', () => {
    expect(getAttachmentErrorMessage('ATTACHMENT_SIZE_REQUIRED')).toContain('doğrulanamadı');
    expect(getAttachmentErrorMessage('ATTACHMENT_SIZE_MISMATCH')).toContain('doğrulanamadı');
  });
});
