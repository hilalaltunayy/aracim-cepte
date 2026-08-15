import {
  applyDeterministicSafety,
  canonicalEvidenceCodes,
  classifyQuestion,
  normalizeVehicleAssistantEvidence,
  validateVehicleAssistantResponse,
  type AssistantQuotaState,
  type VehicleAssistantContext,
  type VehicleAssistantResult,
} from '../../../src/features/vehicleAssistant/domain/assistantContract.ts';
import type { AiVehicleAssistantProvider } from './vehicleAssistantProvider.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class VehicleAssistantHttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export interface VehicleAssistantRequestBody {
  vehicleId: string;
  operationId: string;
  question: string;
}

interface QuotaRow {
  used_count: number;
  monthly_quota: number;
  period_start: string;
}

export interface VehicleAssistantHandlerDependencies {
  loadContext(vehicleId: string, userId: string): Promise<VehicleAssistantContext | null>;
  getQuota(): Promise<QuotaRow>;
  reserveQuota(operationId: string, vehicleId: string): Promise<QuotaRow>;
  commitQuota(operationId: string): Promise<QuotaRow>;
  releaseQuota(operationId: string): Promise<void>;
  provider: AiVehicleAssistantProvider | null;
  signal?: AbortSignal;
}

export function parseVehicleAssistantRequest(value: unknown): VehicleAssistantRequestBody {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new VehicleAssistantHttpError(400, 'AI_REQUEST_INVALID');
  }
  const body = value as Record<string, unknown>;
  if ('userId' in body || 'plan' in body || 'quota' in body) {
    throw new VehicleAssistantHttpError(400, 'AI_REQUEST_INVALID');
  }
  const vehicleId = typeof body.vehicleId === 'string' ? body.vehicleId.trim() : '';
  const operationId = typeof body.operationId === 'string' ? body.operationId.trim() : '';
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (
    !UUID.test(vehicleId) ||
    !UUID.test(operationId) ||
    question.length < 2 ||
    question.length > 600
  ) {
    throw new VehicleAssistantHttpError(400, 'AI_REQUEST_INVALID');
  }
  return { vehicleId, operationId, question };
}

function quotaState(row: QuotaRow): AssistantQuotaState {
  const used = Math.max(0, Number(row.used_count) || 0);
  const limit = Math.max(0, Number(row.monthly_quota) || 0);
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    periodStart: row.period_start,
  };
}

export async function handleVehicleAssistant(
  userId: string | null,
  rawBody: unknown,
  dependencies: VehicleAssistantHandlerDependencies,
): Promise<VehicleAssistantResult> {
  if (!userId) throw new VehicleAssistantHttpError(401, 'AUTH_REQUIRED');
  const request = parseVehicleAssistantRequest(rawBody);
  const context = await dependencies.loadContext(request.vehicleId, userId);
  if (!context || context.vehicleId !== request.vehicleId) {
    throw new VehicleAssistantHttpError(403, 'VEHICLE_FORBIDDEN');
  }

  const gate = classifyQuestion(request.question);
  if (gate.kind !== 'pass') {
    return {
      response: gate.response,
      quota: quotaState(await dependencies.getQuota()),
      source: 'local',
    };
  }
  if (!dependencies.provider) throw new VehicleAssistantHttpError(503, 'AI_ASSISTANT_UNAVAILABLE');

  let reserved = false;
  try {
    await dependencies.reserveQuota(request.operationId, request.vehicleId);
    reserved = true;
    const allowedEvidenceCodes = canonicalEvidenceCodes(context);
    const rawResponse = await dependencies.provider.generateVehicleAssistantResponse(
      {
        question: request.question,
        context,
        allowedEvidenceCodes: [...allowedEvidenceCodes].sort(),
      },
      dependencies.signal,
    );
    const validated = validateVehicleAssistantResponse(rawResponse, allowedEvidenceCodes);
    if (!validated) throw new VehicleAssistantHttpError(502, 'AI_RESPONSE_INVALID');
    const response = applyDeterministicSafety(
      normalizeVehicleAssistantEvidence(validated, context),
      request.question,
      gate.externalDataMentioned,
    );
    if (dependencies.signal?.aborted) {
      throw new VehicleAssistantHttpError(499, 'AI_REQUEST_CANCELLED');
    }
    const committed = await dependencies.commitQuota(request.operationId);
    reserved = false;
    return { response, quota: quotaState(committed), source: 'provider' };
  } catch (error) {
    if (reserved) await dependencies.releaseQuota(request.operationId).catch(() => undefined);
    if (error instanceof VehicleAssistantHttpError) throw error;
    const message = error instanceof Error ? error.message : '';
    if (message.includes('AI_MONTHLY_QUOTA_EXCEEDED')) {
      throw new VehicleAssistantHttpError(429, 'AI_MONTHLY_QUOTA_EXCEEDED');
    }
    throw new VehicleAssistantHttpError(503, 'AI_ASSISTANT_UNAVAILABLE');
  }
}
