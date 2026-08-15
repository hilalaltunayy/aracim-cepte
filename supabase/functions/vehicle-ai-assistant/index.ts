import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { readBodyWithLimit, RequestBodyTooLargeError } from '../_shared/bodyReader.ts';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';
import { loadVehicleAssistantContext } from '../_shared/vehicleAssistantContext.ts';
import {
  handleVehicleAssistant,
  VehicleAssistantHttpError,
} from '../_shared/vehicleAssistantHandler.ts';
import { createConfiguredVehicleAssistantProvider } from '../_shared/vehicleAssistantProvider.ts';

const MAX_REQUEST_BYTES = 8 * 1024;
const PROVIDER_TIMEOUT_MS = 20_000;

function firstRow<T>(data: T[] | null, error: { message?: string } | null): T {
  if (error || !data?.[0]) throw new Error(error?.message ?? 'AI_QUOTA_UNAVAILABLE');
  return data[0];
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, context) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return jsonResponse(405, { code: 'METHOD_NOT_ALLOWED' });
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return jsonResponse(413, { code: 'AI_REQUEST_TOO_LARGE' });
    }

    const { data: userData, error: userError } = await context.supabase.auth.getUser();
    if (userError || !userData.user) return jsonResponse(401, { code: 'AUTH_REQUIRED' });
    let body: unknown;
    try {
      const bytes = await readBodyWithLimit(request.body, MAX_REQUEST_BYTES);
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
      return jsonResponse(error instanceof RequestBodyTooLargeError ? 413 : 400, {
        code:
          error instanceof RequestBodyTooLargeError ? 'AI_REQUEST_TOO_LARGE' : 'AI_REQUEST_INVALID',
      });
    }
    const provider = createConfiguredVehicleAssistantProvider({ get: (key) => Deno.env.get(key) });
    const controller = new AbortController();
    request.signal.addEventListener('abort', () => controller.abort(), { once: true });
    const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
    try {
      const result = await handleVehicleAssistant(userData.user.id, body, {
        provider,
        signal: controller.signal,
        loadContext: async (vehicleId, userId) =>
          (await loadVehicleAssistantContext(context.supabase, vehicleId, userId))?.context ?? null,
        getQuota: async () => {
          const { data, error } = await context.supabase.rpc('get_my_ai_usage');
          return firstRow(data, error);
        },
        reserveQuota: async (operationId, vehicleId) => {
          const { data, error } = await context.supabase.rpc('reserve_ai_usage', {
            p_operation_id: operationId,
            p_vehicle_id: vehicleId,
          });
          return firstRow(data, error);
        },
        commitQuota: async (operationId) => {
          const { data, error } = await context.supabase.rpc('commit_ai_usage', {
            p_operation_id: operationId,
          });
          return firstRow(data, error);
        },
        releaseQuota: async (operationId) => {
          const { error } = await context.supabase.rpc('release_ai_usage', {
            p_operation_id: operationId,
          });
          if (error) throw new Error('AI_QUOTA_RELEASE_FAILED');
        },
      });
      return jsonResponse(200, result as unknown as Record<string, unknown>);
    } catch (error) {
      const safe =
        error instanceof VehicleAssistantHttpError
          ? error
          : new VehicleAssistantHttpError(503, 'AI_ASSISTANT_UNAVAILABLE');
      return jsonResponse(safe.status, { code: safe.code });
    } finally {
      clearTimeout(timeout);
    }
  }),
};
