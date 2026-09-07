import assert from 'node:assert/strict';
import test from 'node:test';
import { planOrphanCleanup } from './attachmentReconciliation.ts';

const NOW = Date.parse('2026-09-07T12:00:00Z');
const OLD = new Date(NOW - 60 * 60 * 1000).toISOString();
const FRESH = new Date(NOW - 30 * 1000).toISOString();
const GRACE = 10 * 60 * 1000;

const base = {
  objectPaths: [],
  referencedPaths: [],
  queuedPaths: [],
  reservations: [],
  graceMs: GRACE,
  now: NOW,
};

const photoPath =
  'owner/veh/vehicle_photo/photo-1/att-1.jpg';

test('keeps a vehicle-photo object that a live attachments row references', () => {
  const plan = planOrphanCleanup({
    ...base,
    objectPaths: [photoPath],
    // The attachments table is the only thing pointing at a vehicle photo.
    referencedPaths: [photoPath],
    reservations: [
      { id: 'r1', object_path: photoPath, status: 'completed', updated_at: OLD },
    ],
  });
  assert.deepEqual(plan.cleanupPaths, []);
});

test('regression: an unreferenced completed vehicle photo is NOT deleted immediately', () => {
  // This is the exact shape the stale deployment mishandled: object present,
  // reservation completed, but the referenced set (wrongly) missing the path.
  // With a grace window a just-saved photo survives until its row is visible.
  const plan = planOrphanCleanup({
    ...base,
    objectPaths: [photoPath],
    referencedPaths: [],
    reservations: [
      { id: 'r1', object_path: photoPath, status: 'completed', updated_at: FRESH },
    ],
  });
  assert.deepEqual(plan.cleanupPaths, []);
});

test('a genuinely orphaned completed reservation is cleaned after the grace window', () => {
  const plan = planOrphanCleanup({
    ...base,
    objectPaths: [photoPath],
    referencedPaths: [],
    reservations: [
      { id: 'r1', object_path: photoPath, status: 'completed', updated_at: OLD },
    ],
  });
  assert.deepEqual(plan.cleanupPaths, [photoPath]);
});

test('a failed or cleanup_required reservation is cleaned regardless of age', () => {
  for (const status of ['failed', 'cleanup_required']) {
    const plan = planOrphanCleanup({
      ...base,
      objectPaths: [photoPath],
      reservations: [{ id: 'r1', object_path: photoPath, status, updated_at: FRESH }],
    });
    assert.deepEqual(plan.cleanupPaths, [photoPath], status);
  }
});

test('a stray object with no reservation and no reference is cleaned', () => {
  const plan = planOrphanCleanup({
    ...base,
    objectPaths: ['owner/veh/stray.jpg'],
  });
  assert.deepEqual(plan.cleanupPaths, ['owner/veh/stray.jpg']);
});

test('an unreferenced object explicitly queued for cleanup is removed', () => {
  const plan = planOrphanCleanup({
    ...base,
    objectPaths: [photoPath],
    queuedPaths: [photoPath],
  });
  assert.deepEqual(plan.cleanupPaths, [photoPath]);
});

test('a live reference beats a stale cleanup-queue entry', () => {
  const plan = planOrphanCleanup({
    ...base,
    objectPaths: [photoPath],
    referencedPaths: [photoPath],
    queuedPaths: [photoPath],
  });
  assert.deepEqual(plan.cleanupPaths, []);
});

test('a fresh uploaded reservation is protected until the grace window passes', () => {
  const fresh = planOrphanCleanup({
    ...base,
    objectPaths: [photoPath],
    reservations: [{ id: 'r1', object_path: photoPath, status: 'uploaded', updated_at: FRESH }],
  });
  assert.deepEqual(fresh.cleanupPaths, []);

  const stale = planOrphanCleanup({
    ...base,
    objectPaths: [photoPath],
    reservations: [{ id: 'r1', object_path: photoPath, status: 'uploaded', updated_at: OLD }],
  });
  assert.deepEqual(stale.cleanupPaths, [photoPath]);
});

test('mixed owner content: documents, expertise and photos are all kept together', () => {
  const doc = 'owner/veh/vehicle_document/doc-1/att-2.pdf';
  const expertise = 'owner/veh/legacy-expertise.jpg';
  const plan = planOrphanCleanup({
    ...base,
    objectPaths: [photoPath, doc, expertise, 'owner/veh/really-orphan.jpg'],
    referencedPaths: [photoPath, doc, expertise],
    reservations: [
      { id: 'r1', object_path: photoPath, status: 'completed', updated_at: OLD },
      { id: 'r2', object_path: doc, status: 'completed', updated_at: OLD },
    ],
  });
  assert.deepEqual(plan.cleanupPaths, ['owner/veh/really-orphan.jpg']);
});

test('reports queue rows whose object is already gone', () => {
  const plan = planOrphanCleanup({
    ...base,
    objectPaths: [],
    queuedPaths: ['owner/veh/gone.jpg'],
  });
  assert.deepEqual(plan.alreadyMissingQueuePaths, ['owner/veh/gone.jpg']);
  assert.deepEqual(plan.cleanupPaths, []);
});

test('advances a reserved reservation whose object turned up, and completes a referenced one', () => {
  const plan = planOrphanCleanup({
    ...base,
    objectPaths: [photoPath, 'owner/veh/reserved.jpg'],
    referencedPaths: [photoPath],
    reservations: [
      { id: 'r1', object_path: photoPath, status: 'uploaded', updated_at: OLD },
      { id: 'r2', object_path: 'owner/veh/reserved.jpg', status: 'reserved', updated_at: OLD },
    ],
  });
  assert.deepEqual(
    plan.reservationsToComplete.map((r) => r.id),
    ['r1'],
  );
  assert.deepEqual(
    plan.reservationsToRecover.map((r) => r.id),
    ['r2'],
  );
  // The referenced photo whose reservation is only `uploaded` is not deleted.
  assert.deepEqual(plan.cleanupPaths, []);
});
