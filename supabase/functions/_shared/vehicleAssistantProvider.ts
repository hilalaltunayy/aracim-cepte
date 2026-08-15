import {
  VEHICLE_ASSISTANT_RESPONSE_SCHEMA,
  type VehicleAssistantContext,
  type VehicleAssistantResponse,
} from '../../../src/features/vehicleAssistant/domain/assistantContract.ts';

export const GEMINI_MODEL = 'gemini-3.6-flash';
export const GEMINI_INTERACTIONS_URL =
  'https://generativelanguage.googleapis.com/v1beta/interactions';

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

export function buildGeminiInteractionRequest(input: AiVehicleAssistantProviderInput) {
  return {
    model: GEMINI_MODEL,
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
    steps?: Array<{ type?: string; content?: Array<{ text?: string }> }>;
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
  private readonly apiKey: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(apiKey: string, fetchImplementation: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.fetchImplementation = fetchImplementation;
  }

  async generateVehicleAssistantResponse(
    input: AiVehicleAssistantProviderInput,
    signal?: AbortSignal,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImplementation(GEMINI_INTERACTIONS_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify(buildGeminiInteractionRequest(input)),
        signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new VehicleAssistantProviderError('timeout');
      }
      throw new VehicleAssistantProviderError('unavailable');
    }
    if (response.status === 429) throw new VehicleAssistantProviderError('rate_limit');
    if (!response.ok) throw new VehicleAssistantProviderError('unavailable');
    const payload = await response.json().catch(() => null);
    return parseGeminiInteractionResponse(payload);
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
  return new GeminiVehicleAssistantProvider(apiKey);
}
