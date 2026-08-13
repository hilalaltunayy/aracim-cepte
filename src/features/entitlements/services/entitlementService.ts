import { getSupabaseClient } from '@/data/supabase/client';
import {
  loadEntitlementsWithFallback,
  type EntitlementRecord,
  type EntitlementRecordLoader,
  type PlanEntitlements,
} from '../domain/entitlements';

export type { EntitlementRecordLoader } from '../domain/entitlements';

/** Database errors are not entitlements: every unsuccessful read remains Free. */
export async function loadCurrentEntitlements(
  loadRecord: EntitlementRecordLoader = loadCurrentEntitlementRecord,
): Promise<Readonly<PlanEntitlements>> {
  return loadEntitlementsWithFallback(loadRecord);
}

async function loadCurrentEntitlementRecord(): Promise<EntitlementRecord | null> {
  const client = getSupabaseClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return null;
  const { data, error } = await client.from('user_entitlements')
    .select('plan_id, valid_until, source').eq('user_id', userData.user.id).maybeSingle();
  if (error) throw error;
  return data ? { planId: data.plan_id, validUntil: data.valid_until, source: data.source } : null;
}
