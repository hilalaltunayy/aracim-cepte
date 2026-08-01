import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';
import { listFilesRecursively, removeFilesInBatches } from '../_shared/storageCleanup.ts';

const bucketName = 'vehicle-attachments';

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, context) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return jsonResponse(405, { code: 'METHOD_NOT_ALLOWED' });

    const { data: userData, error: userError } = await context.supabase.auth.getUser();
    if (userError || !userData.user) return jsonResponse(401, { code: 'AUTH_REQUIRED' });

    const bucket = context.supabaseAdmin.storage.from(bucketName);
    try {
      const paths = await listFilesRecursively(bucket, userData.user.id);
      await removeFilesInBatches(bucket, paths);
    } catch {
      return jsonResponse(500, { code: 'ACCOUNT_STORAGE_DELETE_FAILED' });
    }

    const { error: deleteError } = await context.supabaseAdmin.auth.admin.deleteUser(
      userData.user.id,
    );
    if (deleteError) return jsonResponse(500, { code: 'ACCOUNT_DELETE_FAILED' });

    return jsonResponse(200, { deleted: true });
  }),
};
