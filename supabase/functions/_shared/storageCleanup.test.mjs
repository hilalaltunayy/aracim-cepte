import assert from 'node:assert/strict';
import test from 'node:test';
import { listFilesRecursively, removeFilesInBatches } from './storageCleanup.ts';

test('lists nested user files without exposing another prefix', async () => {
  const listings = new Map([
    ['owner-a', [{ id: null, name: 'vehicle-a', metadata: null }]],
    [
      'owner-a/vehicle-a',
      [
        { id: 'one', name: 'one.pdf', metadata: { size: 100 } },
        { id: 'two', name: 'two.jpg', metadata: { size: 200 } },
      ],
    ],
  ]);
  const bucket = {
    async list(path) {
      return { data: listings.get(path) ?? [], error: null };
    },
    async remove() {
      return { error: null };
    },
  };

  await assert.doesNotReject(async () => {
    assert.deepEqual(await listFilesRecursively(bucket, 'owner-a'), [
      'owner-a/vehicle-a/one.pdf',
      'owner-a/vehicle-a/two.jpg',
    ]);
  });
});

test('removes files in bounded batches', async () => {
  const batches = [];
  const bucket = {
    async list() {
      return { data: [], error: null };
    },
    async remove(paths) {
      batches.push(paths);
      return { error: null };
    },
  };
  const paths = Array.from({ length: 205 }, (_, index) => `owner/vehicle/${index}.pdf`);
  await removeFilesInBatches(bucket, paths);
  assert.deepEqual(
    batches.map((batch) => batch.length),
    [100, 100, 5],
  );
});

test('stops account deletion when storage removal fails', async () => {
  const bucket = {
    async list() {
      return { data: [], error: null };
    },
    async remove() {
      return { error: { message: 'provider detail' } };
    },
  };
  await assert.rejects(() => removeFilesInBatches(bucket, ['owner/vehicle/file.pdf']), {
    message: 'STORAGE_DELETE_FAILED',
  });
});
