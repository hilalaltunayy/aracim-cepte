import { getSupabaseClient } from '@/data/supabase/client';

export type EntitlementReconciliationOutcome = 'applied' | 'unavailable' | 'disabled';

export type InvokeSyncFunction = () => Promise<{ error: unknown; data: unknown }>;

async function invokeSyncEntitlement(): Promise<{ error: unknown; data: unknown }> {
  return getSupabaseClient().functions.invoke('sync-entitlement', { body: {} });
}

/**
 * Asks the backend to re-verify this account against RevenueCat, right now.
 *
 * The webhook is the primary mirror writer but it is asynchronous, so a fresh
 * purchase or a cold start can find server-side Premium enforcement still
 * looking at a Free mirror. This is the pull path that closes that gap.
 *
 * The client sends no identity and no plan — it cannot. The Edge Function reads
 * the user from the caller's JWT, asks RevenueCat over a server-only secret and
 * writes through a service-role-only RPC, so nothing here can self-grant
 * Premium. An unreachable or unconfigured backend is reported, never assumed.
 */
export async function reconcileEntitlement(
  invoke: InvokeSyncFunction = invokeSyncEntitlement,
): Promise<EntitlementReconciliationOutcome> {
  try {
    const { error, data } = await invoke();
    // supabase-js turns a non-2xx into an error and leaves `data` null, so the
    // handler's own code has to be recovered from the failed response body.
    const code = error ? await readErrorCode(error) : readCode(data);
    if (code === 'BILLING_SYNC_DISABLED') return 'disabled';
    if (error) return 'unavailable';
    return code === 'BILLING_SYNC_APPLIED' ? 'applied' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

function readCode(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const code = (data as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

async function readErrorCode(error: unknown): Promise<string | null> {
  const context = (error as { context?: unknown })?.context;
  if (!context || typeof context !== 'object') return null;
  const json = (context as { json?: unknown }).json;
  if (typeof json !== 'function') return null;
  try {
    return readCode(await (json as () => Promise<unknown>).call(context));
  } catch {
    return null;
  }
}
