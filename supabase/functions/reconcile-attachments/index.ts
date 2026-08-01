import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';
import { listFilesRecursively, removeFilesInBatches } from '../_shared/storageCleanup.ts';

const bucketName = 'vehicle-attachments';
const orphanGraceMs = 10 * 60 * 1000;

type UploadOperation = {
  id: string;
  object_path: string;
  status: 'reserved' | 'uploaded' | 'completed' | 'failed' | 'cleanup_required';
  updated_at: string;
};

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, context) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return jsonResponse(405, { code: 'METHOD_NOT_ALLOWED' });

    const { data: userData, error: userError } = await context.supabase.auth.getUser();
    if (userError || !userData.user) return jsonResponse(401, { code: 'AUTH_REQUIRED' });
    const ownerId = userData.user.id;

    const metadataRepair = await context.supabaseAdmin.rpc(
      'reconcile_attachment_metadata_for_owner',
      { p_owner_id: ownerId },
    );
    if (metadataRepair.error) {
      return jsonResponse(500, { code: 'ATTACHMENT_RECONCILIATION_METADATA_FAILED' });
    }

    const [operationsResult, queueResult, documentsResult, expertiseResult] = await Promise.all([
      context.supabaseAdmin
        .from('attachment_upload_reservations')
        .select('id, object_path, status, updated_at')
        .eq('owner_id', ownerId),
      context.supabaseAdmin
        .from('attachment_cleanup_queue')
        .select('id, object_path')
        .eq('owner_id', ownerId)
        .in('status', ['pending', 'failed']),
      context.supabaseAdmin
        .from('vehicle_documents')
        .select('attachment_path')
        .eq('owner_id', ownerId)
        .not('attachment_path', 'is', null),
      context.supabaseAdmin
        .from('expertise_reports')
        .select('attachment_path')
        .eq('owner_id', ownerId)
        .not('attachment_path', 'is', null),
    ]);
    if (
      operationsResult.error ||
      queueResult.error ||
      documentsResult.error ||
      expertiseResult.error
    ) {
      const code = operationsResult.error
        ? 'ATTACHMENT_RECONCILIATION_OPERATIONS_QUERY_FAILED'
        : queueResult.error
          ? 'ATTACHMENT_RECONCILIATION_QUEUE_QUERY_FAILED'
          : documentsResult.error
            ? 'ATTACHMENT_RECONCILIATION_DOCUMENTS_QUERY_FAILED'
            : 'ATTACHMENT_RECONCILIATION_EXPERTISE_QUERY_FAILED';
      return jsonResponse(500, { code });
    }

    const bucket = context.supabaseAdmin.storage.from(bucketName);
    let objectPaths: string[];
    try {
      objectPaths = await listFilesRecursively(bucket, ownerId);
    } catch {
      return jsonResponse(500, { code: 'ATTACHMENT_RECONCILIATION_LIST_FAILED' });
    }

    const objectSet = new Set(objectPaths);
    const referenced = new Set(
      [...(documentsResult.data ?? []), ...(expertiseResult.data ?? [])]
        .map((row) => row.attachment_path)
        .filter((path): path is string => Boolean(path)),
    );
    const operations = (operationsResult.data ?? []) as UploadOperation[];
    const operationByPath = new Map(operations.map((operation) => [operation.object_path, operation]));
    const queuedPaths = new Set((queueResult.data ?? []).map((row) => row.object_path));
    const alreadyMissingQueuePaths = Array.from(queuedPaths).filter((path) => !objectSet.has(path));
    const cutoff = Date.now() - orphanGraceMs;
    const cleanupPaths = objectPaths.filter((path) => {
      if (referenced.has(path)) return false;
      if (queuedPaths.has(path)) return true;
      const operation = operationByPath.get(path);
      if (!operation) return true;
      if (operation.status === 'failed' || operation.status === 'cleanup_required') return true;
      return (
        operation.status === 'completed' ||
        (operation.status === 'uploaded' && new Date(operation.updated_at).getTime() <= cutoff)
      );
    });

    try {
      await removeFilesInBatches(bucket, cleanupPaths);
    } catch {
      if (cleanupPaths.length) {
        await context.supabaseAdmin
          .from('attachment_cleanup_queue')
          .update({
            status: 'failed',
            last_error_code: 'STORAGE_REMOVE_FAILED',
            updated_at: new Date().toISOString(),
          })
          .eq('owner_id', ownerId)
          .in('object_path', cleanupPaths);
      }
      return jsonResponse(500, { code: 'ATTACHMENT_RECONCILIATION_REMOVE_FAILED' });
    }

    if (cleanupPaths.length) {
      await Promise.all([
        context.supabaseAdmin
          .from('attachment_cleanup_queue')
          .update({ status: 'completed', last_error_code: null, updated_at: new Date().toISOString() })
          .eq('owner_id', ownerId)
          .in('object_path', cleanupPaths),
        context.supabaseAdmin
          .from('attachment_upload_reservations')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            failure_code: 'ORPHAN_CLEANED',
            updated_at: new Date().toISOString(),
          })
          .eq('owner_id', ownerId)
          .in('object_path', cleanupPaths),
      ]);
    }

    if (alreadyMissingQueuePaths.length) {
      await context.supabaseAdmin
        .from('attachment_cleanup_queue')
        .update({ status: 'completed', last_error_code: null, updated_at: new Date().toISOString() })
        .eq('owner_id', ownerId)
        .in('object_path', alreadyMissingQueuePaths);
    }

    const referencedOperations = operations.filter(
      (operation) => referenced.has(operation.object_path) && objectSet.has(operation.object_path),
    );
    for (const operation of referencedOperations) {
      if (operation.status === 'completed') continue;
      await context.supabaseAdmin
        .from('attachment_upload_reservations')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', operation.id)
        .eq('owner_id', ownerId);
    }

    const recoveredUploads = operations.filter(
      (operation) => operation.status === 'reserved' && objectSet.has(operation.object_path),
    );
    for (const operation of recoveredUploads) {
      await context.supabaseAdmin
        .from('attachment_upload_reservations')
        .update({ status: 'uploaded', uploaded_at: new Date().toISOString() })
        .eq('id', operation.id)
        .eq('owner_id', ownerId);
    }

    return jsonResponse(200, {
      repairedMetadata: Number(metadataRepair.data ?? 0),
      cleanedObjects: cleanupPaths.length,
      completedMissingCleanupItems: alreadyMissingQueuePaths.length,
    });
  }),
};
