import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { readBodyWithLimit, RequestBodyTooLargeError } from '../_shared/bodyReader.ts';
import { MAX_ATTACHMENT_BYTES, validateAttachment } from '../_shared/fileValidation.ts';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';

const bucketName = 'vehicle-attachments';

function quotaErrorCode(message: string): string {
  const knownCodes = [
    'ATTACHMENT_COUNT_QUOTA_EXCEEDED',
    'ATTACHMENT_BYTES_QUOTA_EXCEEDED',
    'ATTACHMENT_FILE_TOO_LARGE',
    'ATTACHMENT_TYPE_NOT_ALLOWED',
    'ATTACHMENT_VEHICLE_FORBIDDEN',
  ];
  return knownCodes.find((code) => message.includes(code)) ?? 'ATTACHMENT_UPLOAD_FAILED';
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, context) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return jsonResponse(405, { code: 'METHOD_NOT_ALLOWED' });

    const vehicleId = request.headers.get('x-vehicle-id')?.trim();
    if (!vehicleId) return jsonResponse(400, { code: 'ATTACHMENT_VEHICLE_REQUIRED' });

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
    const validation = validateAttachment(bytes, request.headers.get('content-type'));
    if (!validation.ok) return jsonResponse(400, { code: validation.code });

    const { data: reservations, error: reservationError } = await context.supabaseAdmin.rpc(
      'reserve_attachment_upload',
      {
        p_owner_id: userData.user.id,
        p_vehicle_id: vehicleId,
        p_size_bytes: bytes.byteLength,
        p_mime_type: validation.mimeType,
      },
    );

    if (reservationError || !reservations?.[0]) {
      return jsonResponse(400, {
        code: quotaErrorCode(reservationError?.message ?? 'ATTACHMENT_UPLOAD_FAILED'),
      });
    }

    const reservation = reservations[0] as { reservation_id: string; object_path: string };
    const { error: uploadError } = await context.supabase.storage
      .from(bucketName)
      .upload(reservation.object_path, bytes, {
        contentType: validation.mimeType,
        upsert: false,
      });

    await context.supabaseAdmin
      .from('attachment_upload_reservations')
      .delete()
      .eq('id', reservation.reservation_id)
      .eq('owner_id', userData.user.id);

    if (uploadError) return jsonResponse(400, { code: 'ATTACHMENT_UPLOAD_FAILED' });

    return jsonResponse(201, { path: reservation.object_path });
  }),
};
