import {
  VEHICLE_ASSISTANT_MODEL_RESPONSE_SCHEMA,
  type ModelVehicleAssistantResponse,
  type VehicleAssistantContext,
} from '../../../src/features/vehicleAssistant/domain/assistantContract.ts';

/**
 * A real, currently-available Generative Language API model. Two prior
 * defaults each failed on physical go-live: `gemini-3.6-flash` (invalid id,
 * 404) and `gemini-2.5-flash` (404 NOT_FOUND on this project/key — some
 * Gemini projects do not expose 2.5 generation). `gemini-3.1-flash-lite` is
 * the current low-latency Flash-Lite model. Override with the `GEMINI_MODEL`
 * secret if the account exposes a different one.
 */
export const GEMINI_DEFAULT_MODEL = 'gemini-3.1-flash-lite';
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
  /** candidates[0].finishReason on a 200 (STOP / MAX_TOKENS / SAFETY / …). */
  finishReason: string | null;
  /** Whether the model returned any answer text at all. */
  hasText: boolean;
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

/**
 * Names EVERY model-owned field, and only those. It must stay in lockstep with
 * VEHICLE_ASSISTANT_MODEL_RESPONSE_SCHEMA (sent as `responseSchema`) and with
 * validateModelVehicleAssistantResponse. Backend-owned fields
 * (`evidence[].label`, `evidence[].value`, `safetyEscalation`) are explicitly
 * NOT requested.
 */
export const VEHICLE_ASSISTANT_SYSTEM_INSTRUCTION = `Sen “Aracım Cepte Araç Asistanı”sın. Türkçe, kısa, profesyonel ve pratik yanıt ver. Kullanıcıya özel her iddiada yalnızca sağlanan araç bağlamını kullan. Fact, possibility ve action ayrımını koru. Araç geçmişi, güncel dış veri veya kesin mekanik teşhis uydurma. Güvenlik kritik belirtilerde sürüşe devam etmeme ve profesyonel kontrol önerisini uygun ölçüde belirt. Araçla ilgisiz soruları reddet. İç sağlık skorlarını gösterme.

BAĞLAM KULLANIMI — bunlar zorunludur:
- Bağlamdaki değerler kullanıcının uygulamaya kendi girdiği KAYITLI verilerdir; doğru kabul et ve olduğu gibi kullan. Bağlamda bir değer varsa "bilgi bulunmamaktadır" DEME.
- "vehicle" bloğu (marka, model, yıl, renk, yakıt tipi, gövde tipi, güncel kilometre) kesin kayıtlı bilgidir.
- "bodyCondition" bloğu kullanıcının Gövde durumu ekranında girdiği güncel parça durumudur. "hasDirectData" true ise doğrudan gövde verisi VARDIR; ekspertiz raporuna yönlendirme yapma. Her panelin "state" alanı (örn. "Boyalı + Hasarlı", "Durum girilmedi") hazır cevaptır.
- Çelişki halinde öncelik: güncel araç profili ve güncel bodyCondition > en güncel yapılandırılmış kayıt > ekspertiz raporu > geçmiş veri > çıkarım. "provenance" bloğundaki kaynak ve tarihi koru; iki kaynağı sessizce birleştirme.
- "retrieval" bloğunda bir alan "unavailable" ise o veri OKUNAMADI. Bunu "kayıt yok" diye sunma; geçici bir erişim sorunu olduğunu söyle ve tekrar denemeyi öner.
- "details" bloğu yoksa bu "veri yok" anlamına gelmez; yalnız o soru için getirilmemiştir.
- Bir değer null ise o alan girilmemiştir; kullanıcıya nereden ekleyebileceğini söyleyebilirsin.

Yanıtı yalnızca şu JSON nesnesi olarak üret ve bu altı alanın HEPSİNİ doldur:
- "answer": string. Kullanıcıya gösterilecek Türkçe cevap. Boş olamaz.
- "domain": şu değerlerden biri: "maintenance" | "fuel" | "documents" | "cost" | "general" | "safety" | "out_of_domain" | "external_data".
- "severity": şu değerlerden biri: "info" | "low" | "medium" | "high".
- "suggestions": string dizisi. Önerilen sonraki adımlar; öneri yoksa boş dizi [].
- "evidence": dizi. Her öğe yalnızca {"factCode": "..."} biçiminde olur; factCode yalnızca sana verilen allowlist değerlerinden biri olabilir; kanıt yoksa boş dizi []. "label" veya "value" EKLEME, onları sistem kendisi üretir.
- "externalDataRequired": boolean. Güncel fiyat, yakın istasyon/tamirci, trafik veya yol bilgisi bağlı araç olmadan verilemez; böyle bir şey istendiyse true olmalı.

"safetyEscalation" alanını üretme; güvenlik kararını sistem deterministik olarak verir. Şemada olmayan başka alan ekleme.`;

function promptText(input: AiVehicleAssistantProviderInput): string {
  return [
    `Soru: ${input.question}`,
    `Araç bağlamı (kullanıcının kayıtlı verisi, doğru kabul et):\n${JSON.stringify(input.context)}`,
    `İzin verilen evidence factCode değerleri:\n${input.allowedEvidenceCodes.join('\n')}`,
  ].join('\n\n');
}

type JsonSchemaNode = {
  type: string;
  enum?: readonly string[];
  required?: readonly string[];
  properties?: Readonly<Record<string, JsonSchemaNode>>;
  items?: JsonSchemaNode;
};

/**
 * Gemini's `responseSchema` accepts an OpenAPI 3.0 subset: type, enum,
 * properties, required and items. `additionalProperties` is NOT in that subset
 * and makes the request a 400, so it is stripped here while everything else is
 * carried over verbatim from the one canonical model schema.
 */
export function toGeminiResponseSchema(node: JsonSchemaNode): JsonSchemaNode {
  const sanitized: JsonSchemaNode = { type: node.type };
  if (node.enum) sanitized.enum = [...node.enum];
  if (node.required) sanitized.required = [...node.required];
  if (node.properties) {
    sanitized.properties = Object.fromEntries(
      Object.entries(node.properties).map(([key, child]) => [key, toGeminiResponseSchema(child)]),
    );
  }
  if (node.items) sanitized.items = toGeminiResponseSchema(node.items);
  return sanitized;
}

export const GEMINI_RESPONSE_SCHEMA = toGeminiResponseSchema(
  VEHICLE_ASSISTANT_MODEL_RESPONSE_SCHEMA as unknown as JsonSchemaNode,
);

/**
 * Standard Gemini `:generateContent` request.
 *
 * - `responseSchema` makes the model-owned contract structurally enforced by
 *   the API instead of merely described in prose. Prose alone produced only
 *   {answer, evidence, externalDataRequired} and every answer was rejected as
 *   AI_RESPONSE_INVALID — the fields the prompt did not name were simply never
 *   generated. Schema keywords the API rejects are stripped by
 *   {@link toGeminiResponseSchema}.
 * - `thinkingBudget: 0` disables the legacy 2.5-flash "thinking" pass. Without
 *   it that family spends the whole `maxOutputTokens` budget on hidden
 *   reasoning and returns `finishReason: MAX_TOKENS` with an EMPTY answer —
 *   a real go-live failure mode. The current default (`gemini-3.1-flash-lite`)
 *   does not match this gate, so no thinkingConfig is sent for it; only a
 *   `GEMINI_MODEL` override back to the 2.5 family needs the workaround.
 * - `maxOutputTokens` is generous so a full grounded JSON answer always fits.
 */
export function buildGenerateContentRequest(
  input: AiVehicleAssistantProviderInput,
  model = GEMINI_DEFAULT_MODEL,
) {
  // Only the legacy 2.5 "thinking" family understands (and needs)
  // thinkingConfig; sending it to other models is a 400.
  const thinking = /gemini-2\.5|gemini-flash-latest|gemini-pro-latest/i.test(model)
    ? { thinkingConfig: { thinkingBudget: 0 } }
    : {};
  return {
    systemInstruction: { parts: [{ text: VEHICLE_ASSISTANT_SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: promptText(input) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      maxOutputTokens: 2048,
      temperature: 0.2,
      ...thinking,
    },
  } as const;
}

/** Gemini occasionally wraps JSON in a ```json fence even in JSON mode. */
function stripJsonFence(text: string): string {
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text.trim());
  return fenced ? fenced[1].trim() : text.trim();
}

export function extractGenerateContentFinishReason(payload: unknown): string | null {
  const candidate = (payload as { candidates?: { finishReason?: unknown }[] } | null)?.candidates?.[0];
  return typeof candidate?.finishReason === 'string' ? candidate.finishReason : null;
}

export function parseGenerateContentResponse(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') throw new VehicleAssistantProviderError('malformed');
  const response = payload as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  const finishReason = response.candidates?.[0]?.finishReason;
  if (response.promptFeedback?.blockReason || finishReason === 'SAFETY' || finishReason === 'RECITATION') {
    throw new VehicleAssistantProviderError('unavailable');
  }
  const text = stripJsonFence(
    (response.candidates ?? [])
      .flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join(''),
  );
  // Empty output (typically finishReason MAX_TOKENS after thinking) is not a
  // usable answer.
  if (!text) throw new VehicleAssistantProviderError('malformed');
  try {
    return JSON.parse(text) as ModelVehicleAssistantResponse;
  } catch {
    throw new VehicleAssistantProviderError('malformed');
  }
}

export function buildGeminiInteractionRequest(input: AiVehicleAssistantProviderInput) {
  return {
    model: GEMINI_DEFAULT_MODEL,
    input: [
      `Soru: ${input.question}`,
      `Araç bağlamı (kullanıcının kayıtlı verisi, doğru kabul et):\n${JSON.stringify(input.context)}`,
      `İzin verilen evidence factCode değerleri:\n${input.allowedEvidenceCodes.join('\n')}`,
    ].join('\n\n'),
    system_instruction: VEHICLE_ASSISTANT_SYSTEM_INSTRUCTION,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: VEHICLE_ASSISTANT_MODEL_RESPONSE_SCHEMA,
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
    return JSON.parse(outputText) as ModelVehicleAssistantResponse;
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
      finishReason: null as string | null,
      hasText: false,
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
        : buildGenerateContentRequest(input, this.config.model);
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
    if (this.config.style === 'generate_content') {
      base.finishReason = extractGenerateContentFinishReason(payload);
      const anyText = ((payload as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      } | null)?.candidates ?? [])
        .flatMap((candidate) => candidate.content?.parts ?? [])
        .some((part) => Boolean(part.text && part.text.trim()));
      base.hasText = anyText;
    }
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
