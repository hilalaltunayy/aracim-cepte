import { describe, expect, it } from 'vitest';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  getAttachmentErrorMessage,
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
    expect(getAttachmentErrorMessage('ATTACHMENT_COUNT_QUOTA_EXCEEDED')).toContain('10');
    expect(getAttachmentErrorMessage('ATTACHMENT_BYTES_QUOTA_EXCEEDED')).toContain('25 MB');
    expect(getAttachmentErrorMessage('unknown')).not.toContain('unknown');
  });
});
