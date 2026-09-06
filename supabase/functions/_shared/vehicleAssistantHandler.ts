import {
  canonicalEvidenceCodes,
  classifyAssistantOutcome,
  classifyQuestion,
  diagnoseVehicleAssistantResponse,
  outcomeConsumesQuota,
  resolveDeterministicVehicleFact,
  toTrustedVehicleAssistantResponse,
  validateFinalVehicleAssistantResponse,
  validateModelVehicleAssistantResponse,
  type AssistantOutcome,
  type AssistantQuotaState,
  type AssistantResponseValidationDiagnostic,
  type VehicleAssistantContext,
  type VehicleAssistantPrivateFacts,
  type VehicleAssistantResult,
} from '../../../src/features/vehicleAssistant/domain/assistantContract.ts';
import type {
  AiVehicleAssistantProvider,
  ProviderCallDiagnostic,
} from './vehicleAssistantProvider.ts';

/** Redacted lifecycle trace. Never carries key, prompt, context, tokens or output. */
export type AssistantHandlerDiagnostic =
  | { stage: 'config'; providerConfigured: boolean }
  | { stage: 'gate'; kind: string }
  | { stage: 'reserve'; ok: boolean }
  | ({ stage: 'provider' } & ProviderCallDiagnostic)
  | ({ stage: 'validate' } & AssistantResponseValidationDiagnostic)
  | { stage: 'normalize'; normalizationStage: string; finalValidationPassed: boolean }
  | { stage: 'outcome'; answerOutcome: AssistantOutcome; consumesQuota: boolean }
  | { stage: 'commit'; ok: boolean }
  | { stage: 'release'; attempted: boolean; confirmed: boolean }
  | { stage: 'result'; outcome: 'committed' | 'local' | 'unbilled' | 'failed'; code?: string };

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

export interface LoadedAssistantContext {
  context: VehicleAssistantContext;
  /** Never reaches the provider; only the deterministic lookup path reads it. */
  privateFacts?: VehicleAssistantPrivateFacts;
}

export interface VehicleAssistantHandlerDependencies {
  loadContext(vehicleId: string, userId: string): Promise<LoadedAssistantContext | null>;
  getQuota(): Promise<QuotaRow>;
  reserveQuota(operationId: string, vehicleId: string): Promise<QuotaRow>;
  commitQuota(operationId: string): Promise<QuotaRow>;
  /** Best-effort; resolves `true` only when the reservation is confirmed released. */
  releaseQuota(operationId: string): Promise<boolean>;
  provider: AiVehicleAssistantProvider | null;
  signal?: AbortSignal;
  onDiagnostic?: (diagnostic: AssistantHandlerDiagnostic) => void;
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
  const loaded = await dependencies.loadContext(request.vehicleId, userId);
  if (!loaded || loaded.context.vehicleId !== request.vehicleId) {
    throw new VehicleAssistantHttpError(403, 'VEHICLE_FORBIDDEN');
  }
  const context = loaded.context;

  const trace = dependencies.onDiagnostic ?? (() => undefined);
  trace({ stage: 'config', providerConfigured: Boolean(dependencies.provider) });

  const gate = classifyQuestion(request.question);
  if (gate.kind !== 'pass') {
    trace({ stage: 'gate', kind: gate.kind });
    trace({ stage: 'result', outcome: 'local' });
    return {
      response: gate.response,
      quota: quotaState(await dependencies.getQuota()),
      source: 'local',
    };
  }

  // A stored-profile lookup ("Rengim ne?") is answered from trusted context.
  // It never calls the provider, so it never reserves or spends the allowance.
  const deterministicFact = resolveDeterministicVehicleFact(
    request.question,
    context,
    loaded.privateFacts,
  );
  if (deterministicFact) {
    trace({ stage: 'gate', kind: 'deterministic_fact' });
    trace({ stage: 'result', outcome: 'local' });
    return {
      response: deterministicFact,
      quota: quotaState(await dependencies.getQuota()),
      source: 'local',
    };
  }
  if (!dependencies.provider) {
    // Distinguishes "secrets missing" from "provider errored" in the logs.
    trace({ stage: 'result', outcome: 'failed', code: 'AI_PROVIDER_NOT_CONFIGURED' });
    throw new VehicleAssistantHttpError(503, 'AI_ASSISTANT_UNAVAILABLE');
  }

  let reserved = false;
  let committedOk = false;
  try {
    await dependencies.reserveQuota(request.operationId, request.vehicleId);
    reserved = true;
    trace({ stage: 'reserve', ok: true });
    const allowedEvidenceCodes = canonicalEvidenceCodes(context);
    const rawResponse = await dependencies.provider.generateVehicleAssistantResponse(
      {
        question: request.question,
        context,
        allowedEvidenceCodes: [...allowedEvidenceCodes].sort(),
      },
      dependencies.signal,
      (diagnostic) => trace({ stage: 'provider', ...diagnostic }),
    );
    // A) model-owned contract — exactly what the prompt and responseSchema ask for.
    const model = validateModelVehicleAssistantResponse(rawResponse, allowedEvidenceCodes);
    if (!model) {
      // Structural-only: never the answer text, evidence values or context.
      trace({
        stage: 'validate',
        ...diagnoseVehicleAssistantResponse(rawResponse, allowedEvidenceCodes),
      });
      throw new VehicleAssistantHttpError(502, 'AI_RESPONSE_INVALID');
    }
    // B) backend enrichment -> final trusted contract, then re-validate it.
    const response = toTrustedVehicleAssistantResponse(
      model,
      context,
      request.question,
      gate.externalDataMentioned,
    );
    const finalValidationPassed = Boolean(validateFinalVehicleAssistantResponse(response));
    trace({ stage: 'normalize', normalizationStage: 'trusted', finalValidationPassed });
    if (!finalValidationPassed) throw new VehicleAssistantHttpError(502, 'AI_RESPONSE_INVALID');
    if (dependencies.signal?.aborted) {
      throw new VehicleAssistantHttpError(499, 'AI_REQUEST_CANCELLED');
    }

    // A provider 200 is not a useful answer. Charge on the classification, so
    // "bu konuda kayıt bulunmuyor" gives the allowance back.
    const answerOutcome = classifyAssistantOutcome(response);
    const consumesQuota = outcomeConsumesQuota(answerOutcome);
    trace({ stage: 'outcome', answerOutcome, consumesQuota });
    if (!consumesQuota) {
      const confirmed = await dependencies.releaseQuota(request.operationId).catch(() => false);
      reserved = false;
      trace({ stage: 'release', attempted: true, confirmed });
      trace({ stage: 'result', outcome: 'unbilled', code: answerOutcome });
      // The user still sees the answer; it simply did not cost an allowance.
      return {
        response,
        quota: quotaState(await dependencies.getQuota()),
        source: 'provider',
      };
    }

    // Only a validated, safety-checked, substantive answer reaches commit.
    const committed = await dependencies.commitQuota(request.operationId);
    committedOk = true;
    reserved = false;
    trace({ stage: 'commit', ok: true });
    trace({ stage: 'result', outcome: 'committed' });
    return { response, quota: quotaState(committed), source: 'provider' };
  } catch (error) {
    // Any exit before a confirmed commit must return the reservation.
    if (reserved && !committedOk) {
      const confirmed = await dependencies.releaseQuota(request.operationId).catch(() => false);
      trace({ stage: 'release', attempted: true, confirmed });
    }
    if (error instanceof VehicleAssistantHttpError) {
      trace({ stage: 'result', outcome: 'failed', code: error.code });
      throw error;
    }
    const message = error instanceof Error ? error.message : '';
    // A reservation-window conflict is NOT a spent quota — surface it distinctly
    // so it never reads as "daily limit reached".
    if (message.includes('AI_USAGE_IN_PROGRESS')) {
      trace({ stage: 'result', outcome: 'failed', code: 'AI_USAGE_IN_PROGRESS' });
      throw new VehicleAssistantHttpError(409, 'AI_USAGE_IN_PROGRESS');
    }
    if (
      message.includes('AI_MONTHLY_QUOTA_EXCEEDED') ||
      message.includes('AI_DAILY_QUOTA_EXCEEDED')
    ) {
      trace({ stage: 'result', outcome: 'failed', code: 'AI_MONTHLY_QUOTA_EXCEEDED' });
      throw new VehicleAssistantHttpError(429, 'AI_MONTHLY_QUOTA_EXCEEDED');
    }
    trace({ stage: 'result', outcome: 'failed', code: 'AI_ASSISTANT_UNAVAILABLE' });
    throw new VehicleAssistantHttpError(503, 'AI_ASSISTANT_UNAVAILABLE');
  }
}
