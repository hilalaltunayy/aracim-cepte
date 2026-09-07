import { getSupabaseClient } from '@/data/supabase/client';
import {
  getEntitlements,
  loadEntitlementsWithFallback,
  type EntitlementRecord,
  type EntitlementRecordLoader,
  type PlanEntitlements,
} from '../domain/entitlements';
import type { EntitlementMirrorStatus } from '../domain/entitlementResolution';

export type { EntitlementRecordLoader } from '../domain/entitlements';

/** Database errors are not entitlements: every unsuccessful read remains Free. */
export async function loadCurrentEntitlements(
  loadRecord: EntitlementRecordLoader = loadCurrentEntitlementRecord,
): Promise<Readonly<PlanEntitlements>> {
  return loadEntitlementsWithFallback(loadRecord);
}

/**
 * Reads the trusted Supabase mirror and reports it as a three-state status.
 *
 * A failed read is `unavailable`, not `free`: collapsing a transient network or
 * session error into Free is what makes an already-entitled user look
 * downgraded on cold start. Callers fail closed on limits, but they must not
 * render the Free upgrade lock on the strength of a failed read alone.
 */
export async function loadEntitlementMirrorStatus(
  loadRecord: EntitlementRecordLoader = loadCurrentEntitlementRecord,
): Promise<EntitlementMirrorStatus> {
  try {
    const record = await loadRecord();
    return getEntitlements(record).planId === 'premium' ? 'premium' : 'free';
  } catch {
    return 'unavailable';
  }
}

async function loadCurrentEntitlementRecord(): Promise<EntitlementRecord | null> {
  const client = getSupabaseClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  // A failed identity read is a transient failure, not a downgrade: throwing
  // keeps it `unknown` for the mirror status while the fail-closed helper above
  // still resolves it to Free.
  if (userError) throw userError;
  if (!userData.user) return null;
  const { data, error } = await client.from('user_entitlements')
    .select('plan_id, valid_until, source').eq('user_id', userData.user.id).maybeSingle();
  if (error) throw error;
  return data ? { planId: data.plan_id, validUntil: data.valid_until, source: data.source } : null;
}
