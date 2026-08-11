import { describe, expect, it } from 'vitest';
import { ATTACHMENT_CONFIG } from '../config/attachmentConfig';
import {
  attachmentBytes,
  normalizeAttachmentMime,
  validateAttachmentCandidate,
} from './attachmentRules';
import type { AttachmentListItem, PendingAttachment } from './types';

const makePending = (
  source: PendingAttachment['source'],
  id: string,
  sizeBytes = 100,
): PendingAttachment => ({
  id,
  requestId: `${id}-request`,
  uri: `file:///${id}`,
  originalName: `${id}.jpg`,
  mimeType: 'image/jpeg',
  sizeBytes,
  source,
});

describe('unified attachment limits', () => {
  it.each(['camera', 'gallery', 'document'] as const)(
    'counts %s attachments in the same pool',
    (source) => {
      const existing = [makePending('camera', 'one')];
      expect(validateAttachmentCandidate(makePending(source, 'two'), existing)).toEqual({
        valid: true,
      });
    },
  );

  it('blocks every source when the combined count is full', () => {
    const existing = Array.from({ length: ATTACHMENT_CONFIG.maxAttachmentsPerEntity }, (_, index) =>
      makePending(index % 2 ? 'camera' : 'document', `item-${index}`),
    );
    for (const source of ['camera', 'gallery', 'document'] as const) {
      expect(validateAttachmentCandidate(makePending(source, `next-${source}`), existing)).toEqual({
        valid: false,
        code: 'ATTACHMENT_COUNT_LIMIT_REACHED',
      });
    }
  });

  it('rejects unsupported and oversized files', () => {
    expect(normalizeAttachmentMime('image/webp')).toBeNull();
    expect(
      validateAttachmentCandidate(
        { uri: 'file:///large', mimeType: 'image/jpeg', sizeBytes: ATTACHMENT_CONFIG.maxFileBytes + 1 },
        [],
      ),
    ).toEqual({ valid: false, code: 'ATTACHMENT_FILE_TOO_LARGE' });
  });

  it('accepts valid JPEG, PNG and PDF files and an empty pool', () => {
    expect(attachmentBytes([])).toBe(0);
    for (const mimeType of ATTACHMENT_CONFIG.supportedMimeTypes) {
      expect(
        validateAttachmentCandidate({ uri: `file:///${mimeType}`, mimeType, sizeBytes: 1024 }, []),
      ).toEqual({ valid: true });
    }
  });

  it('enforces one total-byte limit across mixed sources', () => {
    const current: AttachmentListItem[] = [
      makePending('camera', 'camera', 5 * 1024 * 1024),
      makePending('document', 'pdf', 5 * 1024 * 1024),
      makePending('gallery', 'gallery', 5 * 1024 * 1024),
    ];
    expect(validateAttachmentCandidate(makePending('document', 'next', 1), current)).toEqual({
      valid: false,
      code: 'ATTACHMENT_ENTITY_BYTES_LIMIT_REACHED',
    });
  });

  it('guards duplicate in-flight local selections', () => {
    const selected = makePending('gallery', 'same');
    expect(validateAttachmentCandidate(selected, [selected])).toEqual({
      valid: false,
      code: 'ATTACHMENT_DUPLICATE_SELECTION',
    });
  });

  it('keeps all configurable values in one config', () => {
    expect(ATTACHMENT_CONFIG).toMatchObject({
      maxAttachmentsPerEntity: 5,
      maxFileBytes: 5 * 1024 * 1024,
      maxTotalBytesPerEntity: 15 * 1024 * 1024,
      maxImageDimension: 2000,
      imageCompressionQuality: 0.86,
    });
  });
});
