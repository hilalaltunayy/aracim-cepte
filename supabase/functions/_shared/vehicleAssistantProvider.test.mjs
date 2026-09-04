import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GEMINI_INTERACTIONS_URL,
  GeminiVehicleAssistantProvider,
  VehicleAssistantProviderError,
  buildGeminiInteractionRequest,
  buildGenerateContentRequest,
  createConfiguredVehicleAssistantProvider,
  parseGeminiInteractionResponse,
  parseGenerateContentResponse,
} from './vehicleAssistantProvider.ts';

const input = {
  question: 'Bakım durumum nedir?',
  context: {
    vehicleId: 'vehicle-a',
    generatedAt: '2026-08-15T00:00:00Z',
    vehicle: { displayName: 'Kia Sportage', year: 2022, currentOdometer: 10000 },
    maintenanceFacts: { kmSinceLast: 9000 },
    documentFacts: {},
    expertiseFacts: {},
    fuelFacts: {},
    costFacts: {},
    reminderFacts: {},
    trends: {},
    highPrioritySignals: [],
    dataQuality: { validFuelRecords: 0 },
  },
  allowedEvidenceCodes: ['maintenanceFacts.kmSinceLast'],
};

test('builds the stateless Gemini Interactions request with the default model', () => {
  const request = buildGeminiInteractionRequest(input);
  assert.equal(request.model, 'gemini-3.1-flash-lite');
  assert.equal(request.store, false);
  assert.equal(request.response_format.type, 'text');
  assert.equal(request.response_format.mime_type, 'application/json');
  assert.equal(request.response_format.schema.additionalProperties, false);
  assert.equal('previous_interaction_id' in request, false);
  assert.equal('temperature' in request.generation_config, false);
  assert.match(request.input, /maintenanceFacts\.kmSinceLast/);
});

test('parses output_text and model_output step responses', () => {
  const value = { answer: 'Tamam' };
  assert.deepEqual(
    parseGeminiInteractionResponse({ status: 'completed', output_text: JSON.stringify(value) }),
    value,
  );
  assert.deepEqual(
    parseGeminiInteractionResponse({
      status: 'completed',
      steps: [{ type: 'model_output', content: [{ text: JSON.stringify(value) }] }],
    }),
    value,
  );
});

test('rejects malformed or incomplete provider output', () => {
  assert.throws(
    () => parseGeminiInteractionResponse({ status: 'failed' }),
    VehicleAssistantProviderError,
  );
  assert.throws(
    () => parseGeminiInteractionResponse({ status: 'completed', output_text: 'not json' }),
    VehicleAssistantProviderError,
  );
});

test('fails closed unless enablement, privacy approval and key all exist', () => {
  const values = new Map([['GEMINI_API_KEY', 'synthetic-key']]);
  assert.equal(createConfiguredVehicleAssistantProvider({ get: (key) => values.get(key) }), null);
  values.set('AI_VEHICLE_ASSISTANT_ENABLED', 'true');
  assert.equal(createConfiguredVehicleAssistantProvider({ get: (key) => values.get(key) }), null);
  values.set('AI_PROVIDER_PRIVACY_APPROVED', 'true');
  const provider = createConfiguredVehicleAssistantProvider({ get: (key) => values.get(key) });
  assert.equal(provider?.id, 'gemini');
});

test('generate_content request disables thinking for legacy 2.5 and omits it otherwise', () => {
  const flash25 = buildGenerateContentRequest(input, 'gemini-2.5-flash');
  assert.equal(flash25.generationConfig.thinkingConfig.thinkingBudget, 0);
  assert.equal(flash25.generationConfig.maxOutputTokens, 2048);
  const flash20 = buildGenerateContentRequest(input, 'gemini-2.0-flash');
  assert.equal('thinkingConfig' in flash20.generationConfig, false);
  // Current default: no thinkingConfig gate applies to it.
  const defaultModel = buildGenerateContentRequest(input);
  assert.equal(defaultModel.generationConfig.responseMimeType, 'application/json');
  assert.equal('thinkingConfig' in defaultModel.generationConfig, false);
});

test('generate_content style calls :generateContent and parses candidate JSON', async () => {
  const request = buildGenerateContentRequest(input);
  assert.equal(request.generationConfig.responseMimeType, 'application/json');
  assert.equal(request.contents[0].role, 'user');
  assert.equal('additionalProperties' in JSON.parse(JSON.stringify(request)), false);

  const seen = {};
  const provider = new GeminiVehicleAssistantProvider(
    { apiKey: 'k', model: 'gemini-x', baseUrl: 'https://example.test', style: 'generate_content' },
    async (url) => {
      seen.url = url;
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"answer":"ok"}' }] } }] }),
        { status: 200 },
      );
    },
  );
  const result = await provider.generateVehicleAssistantResponse(input);
  assert.deepEqual(result, { answer: 'ok' });
  assert.equal(seen.url, 'https://example.test/v1beta/models/gemini-x:generateContent');
});

test('parseGenerateContentResponse rejects blocked, empty and MAX_TOKENS-empty output', () => {
  assert.throws(
    () => parseGenerateContentResponse({ promptFeedback: { blockReason: 'SAFETY' } }),
    VehicleAssistantProviderError,
  );
  assert.throws(() => parseGenerateContentResponse({ candidates: [] }), VehicleAssistantProviderError);
  // finishReason MAX_TOKENS with no text (all budget spent thinking) -> not usable.
  assert.throws(
    () =>
      parseGenerateContentResponse({
        candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }],
      }),
    (error) => error instanceof VehicleAssistantProviderError && error.category === 'malformed',
  );
  assert.throws(
    () =>
      parseGenerateContentResponse({
        candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: '{}' }] } }],
      }),
    (error) => error instanceof VehicleAssistantProviderError && error.category === 'unavailable',
  );
});

test('parseGenerateContentResponse tolerates a ```json fence', () => {
  assert.deepEqual(
    parseGenerateContentResponse({
      candidates: [{ content: { parts: [{ text: '```json\n{"answer":"x"}\n```' }] } }],
    }),
    { answer: 'x' },
  );
});

function generateContentProvider(fetchImpl) {
  return new GeminiVehicleAssistantProvider(
    { apiKey: 'k', model: 'gemini-2.5-flash', baseUrl: 'https://example.test', style: 'generate_content' },
    fetchImpl,
  );
}

test('reports a redacted diagnostic on a 404 with the provider error status and no body text', async () => {
  const diagnostics = [];
  const provider = generateContentProvider(async () =>
    new Response(
      JSON.stringify({
        error: { code: 404, status: 'NOT_FOUND', message: 'models/gemini-2.5-flash prompt leak' },
      }),
      { status: 404 },
    ),
  );
  await assert.rejects(
    () => provider.generateVehicleAssistantResponse(input, undefined, (d) => diagnostics.push(d)),
    VehicleAssistantProviderError,
  );
  const trace = diagnostics.at(-1);
  assert.equal(trace.ok, false);
  assert.equal(trace.httpStatus, 404);
  assert.equal(trace.providerStatus, 'NOT_FOUND');
  assert.equal(trace.category, 'unavailable');
  assert.equal(trace.model, 'gemini-2.5-flash');
  assert.equal(JSON.stringify(trace).includes('prompt leak'), false);
  assert.equal(JSON.stringify(trace).includes('maintenanceFacts'), false);
});

test('maps 429 to rate_limit, 5xx to unavailable, abort to timeout, non-JSON body to malformed', async () => {
  for (const [status, category] of [
    [429, 'rate_limit'],
    [500, 'unavailable'],
    [503, 'unavailable'],
  ]) {
    const diagnostics = [];
    const provider = generateContentProvider(async () => new Response('{}', { status }));
    await assert.rejects(() =>
      provider.generateVehicleAssistantResponse(input, undefined, (d) => diagnostics.push(d)),
    );
    assert.equal(diagnostics.at(-1).category, category);
  }

  const timeoutDiag = [];
  const aborting = generateContentProvider(async () => {
    throw new DOMException('aborted', 'AbortError');
  });
  await assert.rejects(
    () => aborting.generateVehicleAssistantResponse(input, undefined, (d) => timeoutDiag.push(d)),
    (error) => error.category === 'timeout',
  );
  assert.equal(timeoutDiag.at(-1).category, 'timeout');

  const malformedDiag = [];
  const garbage = generateContentProvider(async () =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] }), {
      status: 200,
    }),
  );
  await assert.rejects(
    () => garbage.generateVehicleAssistantResponse(input, undefined, (d) => malformedDiag.push(d)),
    (error) => error.category === 'malformed',
  );
  assert.equal(malformedDiag.at(-1).category, 'malformed');
});

test('reports ok:true only on a clean parsed answer', async () => {
  const diagnostics = [];
  const provider = generateContentProvider(async () =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"answer":"ok"}' }] } }] }), {
      status: 200,
    }),
  );
  await provider.generateVehicleAssistantResponse(input, undefined, (d) => diagnostics.push(d));
  assert.equal(diagnostics.at(-1).ok, true);
  assert.equal(diagnostics.at(-1).httpStatus, 200);
});

test('a 200 with finishReason MAX_TOKENS and no text is a redacted malformed failure', async () => {
  const diagnostics = [];
  const provider = generateContentProvider(async () =>
    new Response(
      JSON.stringify({
        candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }],
        usageMetadata: { thoughtsTokenCount: 2048 },
      }),
      { status: 200 },
    ),
  );
  await assert.rejects(
    () => provider.generateVehicleAssistantResponse(input, undefined, (d) => diagnostics.push(d)),
    (error) => error.category === 'malformed',
  );
  const trace = diagnostics.at(-1);
  assert.equal(trace.finishReason, 'MAX_TOKENS');
  assert.equal(trace.hasText, false);
  assert.equal(trace.ok, false);
  assert.equal(JSON.stringify(trace).includes('maintenanceFacts'), false);
});

test('uses the backend key only in the provider request header and sanitizes failures', async () => {
  const seen = {};
  const provider = new GeminiVehicleAssistantProvider('synthetic-secret', async (url, init) => {
    seen.url = url;
    seen.headers = init.headers;
    seen.body = init.body;
    return new Response('{}', { status: 500 });
  });
  await assert.rejects(
    () => provider.generateVehicleAssistantResponse(input),
    (error) => {
      assert.equal(error.message.includes('synthetic-secret'), false);
      return error instanceof VehicleAssistantProviderError;
    },
  );
  assert.equal(seen.url, GEMINI_INTERACTIONS_URL);
  assert.equal(seen.headers['x-goog-api-key'], 'synthetic-secret');
  assert.equal(seen.body.includes('synthetic-secret'), false);
});
