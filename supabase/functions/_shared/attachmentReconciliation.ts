/**
 * Pure orphan-cleanup decision for the private attachment bucket.
 *
 * This logic used to live inline in `reconcile-attachments/index.ts` with no
 * test. A stale deployment of that function — one built before the unified
 * `attachments` table existed — kept deciding that every vehicle-photo,
 * document and maintenance-receipt object was an orphan and deleting it,
 * because its "referenced" set only looked at the legacy
 * `vehicle_documents.attachment_path` / `expertise_reports.attachment_path`
 * columns. Extracting the decision here makes that class of bug a failing test
 * instead of silent data loss.
 */

export type ReservationStatus =
  | 'reserved'
  | 'uploaded'
  | 'completed'
  | 'failed'
  | 'cleanup_required';

export interface ReconciliationReservation {
  id: string;
  object_path: string;
  status: ReservationStatus;
  /** ISO timestamp of the last status change. */
  updated_at: string;
}

export interface OrphanCleanupInput {
  /** Every object currently under the owner's storage prefix. */
  objectPaths: readonly string[];
  /**
   * Every storage path a live database row points at. MUST include
   * `attachments.storage_path` — that table is where vehicle photos, unified
   * documents and maintenance receipts keep their files.
   */
  referencedPaths: Iterable<string>;
  /** Paths sitting in the cleanup queue (pending/failed). */
  queuedPaths: Iterable<string>;
  reservations: readonly ReconciliationReservation[];
  /** Grace period before an unreferenced fresh upload is treated as an orphan. */
  graceMs: number;
  /** Current time in ms; injectable for tests. */
  now: number;
}

export interface OrphanCleanupPlan {
  /** Objects safe to delete now. */
  cleanupPaths: string[];
  /** Queue rows whose object is already gone — close them out. */
  alreadyMissingQueuePaths: string[];
  /** Reservations whose object exists and is referenced — force to `completed`. */
  reservationsToComplete: ReconciliationReservation[];
  /** `reserved` reservations whose object turned up — advance to `uploaded`. */
  reservationsToRecover: ReconciliationReservation[];
}

export function planOrphanCleanup(input: OrphanCleanupInput): OrphanCleanupPlan {
  const objectSet = new Set(input.objectPaths);
  const referenced = new Set<string>();
  for (const path of input.referencedPaths) if (path) referenced.add(path);
  const queued = new Set<string>();
  for (const path of input.queuedPaths) if (path) queued.add(path);

  const reservationByPath = new Map(input.reservations.map((r) => [r.object_path, r]));
  const cutoff = input.now - input.graceMs;

  const cleanupPaths = input.objectPaths.filter((path) => {
    // A live database row owns this file — never touch it.
    if (referenced.has(path)) return false;
    // Explicitly queued for removal.
    if (queued.has(path)) return true;
    const reservation = reservationByPath.get(path);
    // No reservation and nothing references it: a true stray object.
    if (!reservation) return true;
    if (reservation.status === 'failed' || reservation.status === 'cleanup_required') return true;
    // A `completed` reservation with no referencing row means the metadata row
    // really was deleted — but only after the grace period, so an upload that
    // just finished (its `attachments` row not yet visible to this pass) is not
    // deleted out from under a successful save.
    if (reservation.status === 'completed') {
      return new Date(reservation.updated_at).getTime() <= cutoff;
    }
    if (reservation.status === 'uploaded') {
      return new Date(reservation.updated_at).getTime() <= cutoff;
    }
    return false;
  });

  const alreadyMissingQueuePaths = [...queued].filter((path) => !objectSet.has(path));

  const reservationsToComplete = input.reservations.filter(
    (r) =>
      r.status !== 'completed' &&
      referenced.has(r.object_path) &&
      objectSet.has(r.object_path),
  );

  const reservationsToRecover = input.reservations.filter(
    (r) => r.status === 'reserved' && objectSet.has(r.object_path),
  );

  return {
    cleanupPaths,
    alreadyMissingQueuePaths,
    reservationsToComplete,
    reservationsToRecover,
  };
}
