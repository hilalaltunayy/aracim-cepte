import assert from 'node:assert/strict';
import test from 'node:test';
import { safeStoredFilename } from './attachmentMetadata.ts';

test('stores only generic PII-free attachment display names', () => {
  assert.equal(safeStoredFilename('camera', 'image/jpeg'), 'kamera-fotografi.jpg');
  assert.equal(safeStoredFilename('gallery', 'image/png'), 'galeri-fotografi.png');
  assert.equal(safeStoredFilename('document', 'application/pdf'), 'belge.pdf');
});
