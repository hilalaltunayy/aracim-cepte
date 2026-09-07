/* eslint-disable import/no-unresolved */
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { corsHeaders, jsonResponse } from '../_shared/http.ts';
import {
  handleEntitlementSync,
  type SubscriberSnapshot,
} from '../_shared/entitlementSyncHandler.ts';

const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1/subscribers';
const PROVIDER_TIMEOUT_MS = 10_000;

/**
 * On-demand Premium reconciliation for the authenticated caller.
 *
 * The RevenueCat webhook remains the primary mirror writer; this closes the gap
 * where an already-purchased account is rejected by server-side Premium
 * enforcement because the event has not arrived yet. The caller supplies no
 * identity and no plan: the user id comes from the verified JWT, the plan comes
 * from RevenueCat over a server-only secret key, and the write goes through a
 * service-role-only RPC.
 */
export default {
  fetch: withSupabase({ auth: 'user' }, async (request, context) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return jsonResponse(405, { code: 'METHOD_NOT_ALLOWED' });

    const { data: userData, error: userError } = await context.supabase.auth.getUser();
    if (userError || !userData.user) return jsonResponse(401, { code: 'AUTH_REQUIRED' });

    const secretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY') ?? null;

    const response = await handleEntitlementSync(userData.user.id, {
      // Fail closed exactly like the webhook: without the secret there is no
      // trustworthy source, so no reconciliation happens at all.
      enabled: Deno.env.get('REVENUECAT_SYNC_ENABLED') === 'true' && Boolean(secretKey),
      fetchSubscriber: async (appUserId: string) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
        try {
          const result = await fetch(
            `${REVENUECAT_API_BASE}/${encodeURIComponent(appUserId)}`,
            {
              method: 'GET',
              headers: {
                authorization: `Bearer ${secretKey}`,
                accept: 'application/json',
              },
              signal: controller.signal,
            },
          );
          if (result.status === 404) return null;
          if (!result.ok) throw new Error('REVENUECAT_UNAVAILABLE');
          return await result.json();
        } finally {
          clearTimeout(timer);
        }
      },
      applySnapshot: async (userId: string, snapshot: SubscriberSnapshot, observedAt: string) => {
        const { data, error } = await context.supabaseAdmin.rpc(
          'reconcile_revenuecat_subscriber_state',
          {
            p_user_id: userId,
            p_status: snapshot.status,
            p_product_id: snapshot.productId,
            p_expires_at: snapshot.expiresAt,
            p_will_renew: snapshot.willRenew,
            p_observed_at: observedAt,
            p_environment: snapshot.environment,
          },
        );
        if (error || typeof data !== 'string') throw new Error('BILLING_SYNC_FAILED');
        return data;
      },
    });
    return jsonResponse(response.status, response.body);
  }),
};
