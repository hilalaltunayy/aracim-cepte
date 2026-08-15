import { getSupabaseClient } from '@/data/supabase/client';
import { createRequestId } from '@/shared/utils/requestId';
import { AppError } from '@/shared/utils/errors';
import type { AssistantQuotaState, VehicleAssistantResult } from '../domain/assistantContract';

const genericUnavailable =
  'Araç Asistanı şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.';

function isQuota(value: unknown): value is AssistantQuotaState {
  if (!value || typeof value !== 'object') return false;
  const quota = value as Partial<AssistantQuotaState>;
  return (
    ['used', 'limit', 'remaining'].every(
      (key) => typeof quota[key as keyof AssistantQuotaState] === 'number',
    ) && typeof quota.periodStart === 'string'
  );
}

function isResult(value: unknown): value is VehicleAssistantResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<VehicleAssistantResult>;
  return Boolean(
    result.response &&
    typeof result.response.answer === 'string' &&
    Array.isArray(result.response.evidence) &&
    Array.isArray(result.response.suggestions) &&
    isQuota(result.quota),
  );
}

async function safeFunctionCode(error: unknown): Promise<string | null> {
  const context = (error as { context?: Response })?.context;
  if (!context || typeof context.clone !== 'function') return null;
  const payload = (await context
    .clone()
    .json()
    .catch(() => null)) as { code?: unknown } | null;
  return typeof payload?.code === 'string' ? payload.code : null;
}

export async function askVehicleAssistant(
  vehicleId: string,
  question: string,
  operationId = createRequestId(),
): Promise<VehicleAssistantResult> {
  const { data, error } = await getSupabaseClient().functions.invoke('vehicle-ai-assistant', {
    body: { vehicleId, question, operationId },
  });
  if (error) {
    const code = await safeFunctionCode(error);
    if (code === 'AI_MONTHLY_QUOTA_EXCEEDED') {
      throw new AppError('Bu ayki Araç Asistanı kullanım sınırınıza ulaştınız.', 'AI_QUOTA');
    }
    if (code === 'VEHICLE_FORBIDDEN' || code === 'AUTH_REQUIRED') {
      throw new AppError('Bu araç için asistan erişimi doğrulanamadı.', 'AUTH');
    }
    throw new AppError(genericUnavailable, 'AI_UNAVAILABLE');
  }
  if (!isResult(data)) throw new AppError(genericUnavailable, 'AI_UNAVAILABLE');
  return data;
}

export async function loadAiAssistantQuota(): Promise<AssistantQuotaState | null> {
  const { data, error } = await getSupabaseClient().rpc('get_my_ai_usage');
  if (error || !data?.[0]) return null;
  const row = data[0];
  return {
    used: row.used_count,
    limit: row.monthly_quota,
    remaining: Math.max(0, row.monthly_quota - row.used_count),
    periodStart: row.period_start,
  };
}
