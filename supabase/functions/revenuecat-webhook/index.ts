/* eslint-disable import/no-unresolved */
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { readBodyWithLimit, RequestBodyTooLargeError } from '../_shared/bodyReader.ts';
import { jsonResponse } from '../_shared/http.ts';
import {
  handleRevenueCatWebhook,
  type RevenueCatWebhookRecord,
} from '../_shared/revenuecatWebhookHandler.ts';

const MAX_WEBHOOK_BYTES = 64 * 1024;

export default {
  fetch: withSupabase({ auth: 'none' }, async (request, context) => {
    if (request.method !== 'POST') return jsonResponse(405, { code: 'METHOD_NOT_ALLOWED' });
    let payload: unknown;
    try {
      const bytes = await readBodyWithLimit(request.body, MAX_WEBHOOK_BYTES);
      payload = JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
      return jsonResponse(error instanceof RequestBodyTooLargeError ? 413 : 400, {
        code: error instanceof RequestBodyTooLargeError ? 'WEBHOOK_TOO_LARGE' : 'WEBHOOK_INVALID',
      });
    }

    const response = await handleRevenueCatWebhook(request.headers.get('authorization'), payload, {
      enabled: Deno.env.get('REVENUECAT_WEBHOOK_ENABLED') === 'true',
      expectedAuthorization: Deno.env.get('REVENUECAT_WEBHOOK_AUTHORIZATION') ?? null,
      processEvent: async (event: RevenueCatWebhookRecord) => {
        const { data, error } = await context.supabaseAdmin.rpc(
          'process_revenuecat_subscription_event',
          {
            p_event_id: event.eventId,
            p_user_id: event.userId,
            p_event_type: event.eventType,
            p_status: event.status,
            p_product_id: event.productId,
            p_expires_at: event.expiresAt,
            p_will_renew: event.willRenew,
            p_event_at: event.eventAt,
            p_environment: event.environment,
          },
        );
        if (error || typeof data !== 'string') throw new Error('BILLING_SYNC_FAILED');
        return data;
      },
    });
    return jsonResponse(response.status, response.body);
  }),
};
