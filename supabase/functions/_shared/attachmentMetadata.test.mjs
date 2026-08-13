import assert from 'node:assert/strict';
import test from 'node:test';
import { isSupportedAttachmentParent, safeStoredFilename } from './attachmentMetadata.ts';

test('stores only generic PII-free attachment display names', () => {
  assert.equal(safeStoredFilename('camera', 'image/jpeg'), 'kamera-fotografi.jpg');
  assert.equal(safeStoredFilename('gallery', 'image/png'), 'galeri-fotografi.png');
  assert.equal(safeStoredFilename('document', 'application/pdf'), 'belge.pdf');
});

test('allows only implemented unified attachment parent types', () => {
  assert.equal(isSupportedAttachmentParent('expertise_report'), true);
  assert.equal(isSupportedAttachmentParent('vehicle_document'), true);
  assert.equal(isSupportedAttachmentParent('maintenance_record'), true);
  assert.equal(isSupportedAttachmentParent('vehicle_photo'), true);
  assert.equal(isSupportedAttachmentParent(null), false);
});
