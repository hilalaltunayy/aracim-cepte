import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_ATTACHMENT_BYTES,
  detectAttachmentMime,
  normalizeDeclaredMime,
  validateAttachment,
} from './fileValidation.ts';

test('recognizes only PDF, JPEG and PNG signatures', () => {
  assert.equal(
    detectAttachmentMime(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d])),
    'application/pdf',
  );
  assert.equal(detectAttachmentMime(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(
    detectAttachmentMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/png',
  );
  assert.equal(detectAttachmentMime(Uint8Array.from([0x52, 0x49, 0x46, 0x46])), null);
});

test('normalizes allowed MIME types and rejects WebP', () => {
  assert.equal(normalizeDeclaredMime('image/jpeg; charset=binary'), 'image/jpeg');
  assert.equal(normalizeDeclaredMime('IMAGE/PNG'), 'image/png');
  assert.equal(normalizeDeclaredMime('image/webp'), null);
});

test('rejects empty, oversized and mismatched content', () => {
  assert.deepEqual(validateAttachment(new Uint8Array(), 'application/pdf'), {
    ok: false,
    code: 'ATTACHMENT_EMPTY',
  });
  assert.deepEqual(
    validateAttachment(new Uint8Array(MAX_ATTACHMENT_BYTES + 1), 'application/pdf'),
    { ok: false, code: 'ATTACHMENT_FILE_TOO_LARGE' },
  );
  assert.deepEqual(
    validateAttachment(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]), 'image/jpeg'),
    { ok: false, code: 'ATTACHMENT_CONTENT_MISMATCH' },
  );
});
