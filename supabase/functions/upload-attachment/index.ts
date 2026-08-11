import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { readBodyWithLimit, RequestBodyTooLargeError } from '../_shared/bodyReader.ts';
import { isSupportedAttachmentParent, safeStoredFilename } from '../_shared/attachmentMetadata.ts';
import { MAX_ATTACHMENT_BYTES, validateAttachment } from '../_shared/fileValidation.ts';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';

const bucketName = 'vehicle-attachments';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function objectExists(
  bucket: {
    list: (
      path: string,
      options: { limit: number; search: string },
    ) => Promise<{ data: { name: string }[] | null; error: unknown }>;
  },
  path: string,
): Promise<boolean> {
  const slash = path.lastIndexOf('/');
  const folder = path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data, error } = await bucket.list(folder, { limit: 2, search: name });
  return !error && Boolean(data?.some((item) => item.name === name));
}

function quotaErrorCode(message: string): string {
  const knownCodes = [
    'ATTACHMENT_COUNT_QUOTA_EXCEEDED',
    'ATTACHMENT_BYTES_QUOTA_EXCEEDED',
    'ATTACHMENT_FILE_TOO_LARGE',
    'ATTACHMENT_TYPE_NOT_ALLOWED',
    'ATTACHMENT_VEHICLE_FORBIDDEN',
    'ATTACHMENT_PARENT_FORBIDDEN',
    'ATTACHMENT_ENTITY_COUNT_EXCEEDED',
    'ATTACHMENT_ENTITY_BYTES_EXCEEDED',
  ];
  return knownCodes.find((code) => message.includes(code)) ?? 'ATTACHMENT_UPLOAD_FAILED';
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, context) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return jsonResponse(405, { code: 'METHOD_NOT_ALLOWED' });

    const vehicleId = request.headers.get('x-vehicle-id')?.trim();
    if (!vehicleId) return jsonResponse(400, { code: 'ATTACHMENT_VEHICLE_REQUIRED' });
    const requestId = request.headers.get('x-upload-request-id')?.trim();
    if (!requestId || !uuidPattern.test(requestId)) {
      return jsonResponse(400, { code: 'ATTACHMENT_REQUEST_ID_REQUIRED' });
    }
    const parentType = request.headers.get('x-attachment-parent-type')?.trim() ?? null;
    const parentId = request.headers.get('x-attachment-parent-id')?.trim() ?? null;
    const source = request.headers.get('x-attachment-source')?.trim() ?? null;
    const parentUpload = Boolean(parentType || parentId || source);
    if (
      parentUpload &&
      (!isSupportedAttachmentParent(parentType) ||
        !parentId ||
        !uuidPattern.test(parentId) ||
        !source ||
        !['camera', 'gallery', 'document'].includes(source))
    ) {
      return jsonResponse(400, { code: 'ATTACHMENT_PARENT_REQUIRED' });
    }

    const declaredFileSize = Number(request.headers.get('x-file-size'));
    if (!Number.isSafeInteger(declaredFileSize) || declaredFileSize < 0) {
      return jsonResponse(400, { code: 'ATTACHMENT_SIZE_REQUIRED' });
    }
    if (declaredFileSize > MAX_ATTACHMENT_BYTES) {
      return jsonResponse(413, { code: 'ATTACHMENT_FILE_TOO_LARGE' });
    }

    const declaredLength = Number(request.headers.get('content-length') ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_ATTACHMENT_BYTES) {
      return jsonResponse(413, { code: 'ATTACHMENT_FILE_TOO_LARGE' });
    }

    const { data: userData, error: userError } = await context.supabase.auth.getUser();
    if (userError || !userData.user) return jsonResponse(401, { code: 'AUTH_REQUIRED' });

    let bytes: Uint8Array;
    try {
      bytes = await readBodyWithLimit(request.body, MAX_ATTACHMENT_BYTES);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return jsonResponse(413, { code: 'ATTACHMENT_FILE_TOO_LARGE' });
      }
      return jsonResponse(400, { code: 'ATTACHMENT_UPLOAD_FAILED' });
    }
    if (bytes.byteLength !== declaredFileSize) {
      return jsonResponse(400, { code: 'ATTACHMENT_SIZE_MISMATCH' });
    }
    const validation = validateAttachment(bytes, request.headers.get('content-type'));
    if (!validation.ok) return jsonResponse(400, { code: validation.code });

    const reservationRpc = parentUpload
      ? 'reserve_attachment_upload_for_parent'
      : 'reserve_attachment_upload';
    const reservationArgs = parentUpload
      ? {
          p_owner_id: userData.user.id,
          p_vehicle_id: vehicleId,
          p_parent_type: parentType,
          p_parent_id: parentId,
          p_source: source,
          p_original_filename: safeStoredFilename(source!, validation.mimeType),
          p_size_bytes: bytes.byteLength,
          p_mime_type: validation.mimeType,
          p_request_id: requestId,
        }
      : {
          p_owner_id: userData.user.id,
          p_vehicle_id: vehicleId,
          p_size_bytes: bytes.byteLength,
          p_mime_type: validation.mimeType,
          p_request_id: requestId,
        };
    const { data: reservations, error: reservationError } = await context.supabaseAdmin.rpc(
      reservationRpc,
      reservationArgs,
    );

    if (reservationError || !reservations?.[0]) {
      return jsonResponse(400, {
        code: quotaErrorCode(reservationError?.message ?? 'ATTACHMENT_UPLOAD_FAILED'),
      });
    }

    const reservation = reservations[0] as {
      reservation_id: string;
      attachment_id?: string;
      object_path: string;
      reservation_status: 'reserved' | 'uploaded' | 'completed';
    };
    const adminBucket = context.supabaseAdmin.storage.from(bucketName);
    if (
      reservation.reservation_status !== 'reserved' &&
      (await objectExists(adminBucket, reservation.object_path))
    ) {
      return jsonResponse(200, {
        path: reservation.object_path,
        attachmentId: reservation.attachment_id,
        idempotent: true,
      });
    }
    const { error: uploadError } = await context.supabase.storage
      .from(bucketName)
      .upload(reservation.object_path, bytes, {
        contentType: validation.mimeType,
        upsert: false,
      });

    if (uploadError && !(await objectExists(adminBucket, reservation.object_path))) {
      await context.supabaseAdmin
        .from('attachment_upload_reservations')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_code: 'STORAGE_UPLOAD_FAILED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservation.reservation_id)
        .eq('owner_id', userData.user.id);
      return jsonResponse(400, { code: 'ATTACHMENT_UPLOAD_FAILED' });
    }

    const { data: marked, error: markError } = await context.supabaseAdmin.rpc(
      'mark_attachment_uploaded',
      { p_reservation_id: reservation.reservation_id, p_owner_id: userData.user.id },
    );
    if (markError || marked !== true) {
      await context.supabaseAdmin.from('attachment_cleanup_queue').upsert(
        {
          owner_id: userData.user.id,
          object_path: reservation.object_path,
          status: 'pending',
          last_error_code: 'UPLOAD_STATE_FAILED',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner_id,object_path' },
      );
      await context.supabaseAdmin
        .from('attachment_upload_reservations')
        .update({ status: 'cleanup_required', failure_code: 'UPLOAD_STATE_FAILED' })
        .eq('id', reservation.reservation_id)
        .eq('owner_id', userData.user.id);
      return jsonResponse(500, { code: 'ATTACHMENT_UPLOAD_FAILED' });
    }

    return jsonResponse(201, {
      path: reservation.object_path,
      attachmentId: reservation.attachment_id,
    });
  }),
};
