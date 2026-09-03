import {
  VEHICLE_ASSISTANT_RESPONSE_SCHEMA,
  type VehicleAssistantContext,
  type VehicleAssistantResponse,
} from '../../../src/features/vehicleAssistant/domain/assistantContract.ts';

/**
 * A real, currently-available Generative Language API model. The previous
 * default `gemini-3.6-flash` is not a valid model id and returns 404 NOT_FOUND
 * on `:generateContent`, which was the physical-device go-live failure. Override
 * with the `GEMINI_MODEL` secret if the account exposes a different one.
 */
export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
export const GEMINI_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';
export const GEMINI_INTERACTIONS_URL = `${GEMINI_DEFAULT_BASE_URL}/v1beta/interactions`;
/** @deprecated use {@link GEMINI_DEFAULT_MODEL} */
export const GEMINI_MODEL = GEMINI_DEFAULT_MODEL;

export type GeminiApiStyle = 'generate_content' | 'interactions';

export interface GeminiProviderConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  style: GeminiApiStyle;
}

/** Redacted trace of one provider call. Never carries key, prompt, context or output. */
export interface ProviderCallDiagnostic {
  style: GeminiApiStyle;
  model: string;
  httpStatus: number | null;
  /** Provider-reported error status such as NOT_FOUND / PERMISSION_DENIED / INVALID_ARGUMENT. */
  providerStatus: string | null;
  category: VehicleAssistantProviderError['category'] | null;
  elapsedMs: number;
  ok: boolean;
}

export interface AiVehicleAssistantProviderInput {
  question: string;
  context: VehicleAssistantContext;
  allowedEvidenceCodes: readonly string[];
}

export interface AiVehicleAssistantProvider {
  readonly id: string;
  generateVehicleAssistantResponse(
    input: AiVehicleAssistantProviderInput,
    signal?: AbortSignal,
    onDiagnostic?: (diagnostic: ProviderCallDiagnostic) => void,
  ): Promise<unknown>;
}

export class VehicleAssistantProviderError extends Error {
  readonly category: 'timeout' | 'rate_limit' | 'unavailable' | 'malformed';

  constructor(category: 'timeout' | 'rate_limit' | 'unavailable' | 'malformed') {
    super(`AI_PROVIDER_${category.toUpperCase()}`);
    this.category = category;
  }
}

export const VEHICLE_ASSISTANT_SYSTEM_INSTRUCTION = `Sen “Aracım Cepte Araç Asistanı”sın. Türkçe, kısa, profesyonel ve pratik yanıt ver. Kullanıcıya özel her iddiada yalnızca sağlanan TASK-034 araç facts/signals bağlamını kullan. Fact, possibility ve action ayrımını koru. Araç geçmişi, güncel dış veri veya kesin mekanik teşhis uydurma. Güvenlik kritik belirtilerde sürüşe devam etmeme ve profesyonel kontrol önerisini uygun ölçüde belirt. Araçla ilgisiz soruları reddet. Güncel fiyat, yakın istasyon/tamirci, trafik veya yol bilgisi bağlı araç olmadan verilemez; externalDataRequired=true olmalı. Evidence factCode yalnızca sağlanan allowlist değerlerinden biri olabilir; kanıt yoksa boş dizi kullan. İç sağlık skorlarını gösterme. Yanıtı yalnızca istenen JSON şemasında üret.`;

function promptText(input: AiVehicleAssistantProviderInput): string {
  return [
    `Soru: ${input.question}`,
    `TASK-034 araç bağlamı:\n${JSON.stringify(input.context)}`,
    `İzin verilen evidence factCode değerleri:\n${input.allowedEvidenceCodes.join('\n')}`,
  ].join('\n\n');
}

/** Standard Gemini `:generateContent` request (no unsupported schema keywords). */
export function buildGenerateContentRequest(input: AiVehicleAssistantProviderInput) {
  return {
    systemInstruction: { parts: [{ text: VEHICLE_ASSISTANT_SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: promptText(input) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 900,
      temperature: 0.2,
    },
  } as const;
}

export function parseGenerateContentResponse(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') throw new VehicleAssistantProviderError('malformed');
  const response = payload as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  if (response.promptFeedback?.blockReason) {
    throw new VehicleAssistantProviderError('unavailable');
  }
  const text = (response.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();
  if (!text) throw new VehicleAssistantProviderError('malformed');
  try {
    return JSON.parse(text) as VehicleAssistantResponse;
  } catch {
    throw new VehicleAssistantProviderError('malformed');
  }
}

export function buildGeminiInteractionRequest(input: AiVehicleAssistantProviderInput) {
  return {
    model: GEMINI_DEFAULT_MODEL,
    input: [
      `Soru: ${input.question}`,
      `TASK-034 araç bağlamı:\n${JSON.stringify(input.context)}`,
      `İzin verilen evidence factCode değerleri:\n${input.allowedEvidenceCodes.join('\n')}`,
    ].join('\n\n'),
    system_instruction: VEHICLE_ASSISTANT_SYSTEM_INSTRUCTION,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: VEHICLE_ASSISTANT_RESPONSE_SCHEMA,
    },
    generation_config: { thinking_level: 'low', max_output_tokens: 900 },
    store: false,
  } as const;
}

export function parseGeminiInteractionResponse(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') throw new VehicleAssistantProviderError('malformed');
  const response = payload as {
    status?: string;
    output_text?: string;
    steps?: { type?: string; content?: { text?: string }[] }[];
  };
  if (response.status && response.status !== 'completed')
    throw new VehicleAssistantProviderError('malformed');
  const outputText =
    response.output_text ??
    response.steps
      ?.filter((step) => step.type === 'model_output')
      .flatMap((step) => step.content ?? [])
      .map((content) => content.text ?? '')
      .join('');
  if (!outputText) throw new VehicleAssistantProviderError('malformed');
  try {
    return JSON.parse(outputText) as VehicleAssistantResponse;
  } catch {
    throw new VehicleAssistantProviderError('malformed');
  }
}

export class GeminiVehicleAssistantProvider implements AiVehicleAssistantProvider {
  readonly id = 'gemini';
  private readonly config: GeminiProviderConfig;
  private readonly fetchImplementation: typeof fetch;

  constructor(config: string | GeminiProviderConfig, fetchImplementation: typeof fetch = fetch) {
    this.config =
      typeof config === 'string'
        ? {
            apiKey: config,
            model: GEMINI_DEFAULT_MODEL,
            baseUrl: GEMINI_DEFAULT_BASE_URL,
            style: 'interactions',
          }
        : config;
    this.fetchImplementation = fetchImplementation;
  }

  private endpoint(): string {
    if (this.config.style === 'interactions') {
      return `${this.config.baseUrl}/v1beta/interactions`;
    }
    return `${this.config.baseUrl}/v1beta/models/${this.config.model}:generateContent`;
  }

  async generateVehicleAssistantResponse(
    input: AiVehicleAssistantProviderInput,
    signal?: AbortSignal,
    onDiagnostic?: (diagnostic: ProviderCallDiagnostic) => void,
  ): Promise<unknown> {
    const startedAt = Date.now();
    const base = {
      style: this.config.style,
      model: this.config.model,
      httpStatus: null as number | null,
      providerStatus: null as string | null,
    };
    const report = (
      extra: Partial<ProviderCallDiagnostic> & Pick<ProviderCallDiagnostic, 'ok'>,
    ) => {
      onDiagnostic?.({
        ...base,
        category: null,
        elapsedMs: Date.now() - startedAt,
        ...extra,
      });
    };
    const fail = (
      category: VehicleAssistantProviderError['category'],
      httpStatus: number | null,
      providerStatus: string | null,
    ): never => {
      report({ ok: false, category, httpStatus, providerStatus });
      throw new VehicleAssistantProviderError(category);
    };

    const body =
      this.config.style === 'interactions'
        ? buildGeminiInteractionRequest(input)
        : buildGenerateContentRequest(input);
    let response: Response;
    try {
      response = await this.fetchImplementation(this.endpoint(), {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.config.apiKey },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return fail('timeout', null, null);
      }
      return fail('unavailable', null, null);
    }
    base.httpStatus = response.status;
    if (!response.ok) {
      // Pull only the provider error *status* (NOT_FOUND, PERMISSION_DENIED, …);
      // never the message body (could echo prompt fragments).
      const errorStatus = await response
        .json()
        .then((payload) => {
          const value = (payload as { error?: { status?: unknown } } | null)?.error?.status;
          return typeof value === 'string' ? value : null;
        })
        .catch(() => null);
      return fail(
        response.status === 429 ? 'rate_limit' : 'unavailable',
        response.status,
        errorStatus,
      );
    }
    const payload = await response.json().catch(() => null);
    try {
      const parsed =
        this.config.style === 'interactions'
          ? parseGeminiInteractionResponse(payload)
          : parseGenerateContentResponse(payload);
      report({ ok: true, httpStatus: response.status });
      return parsed;
    } catch (error) {
      const category =
        error instanceof VehicleAssistantProviderError ? error.category : 'malformed';
      return fail(category, response.status, null);
    }
  }
}

export function createConfiguredVehicleAssistantProvider(environment: {
  get(key: string): string | undefined;
}): AiVehicleAssistantProvider | null {
  const enabled = environment.get('AI_VEHICLE_ASSISTANT_ENABLED') === 'true';
  const privacyApproved = environment.get('AI_PROVIDER_PRIVACY_APPROVED') === 'true';
  const provider = environment.get('AI_VEHICLE_ASSISTANT_PROVIDER') ?? 'gemini';
  const apiKey = environment.get('GEMINI_API_KEY')?.trim();
  if (!enabled || !privacyApproved || provider !== 'gemini' || !apiKey) return null;
  const style: GeminiApiStyle =
    environment.get('GEMINI_API_STYLE') === 'interactions' ? 'interactions' : 'generate_content';
  return new GeminiVehicleAssistantProvider({
    apiKey,
    model: environment.get('GEMINI_MODEL')?.trim() || GEMINI_DEFAULT_MODEL,
    baseUrl: environment.get('GEMINI_API_BASE_URL')?.trim() || GEMINI_DEFAULT_BASE_URL,
    style,
  });
}
