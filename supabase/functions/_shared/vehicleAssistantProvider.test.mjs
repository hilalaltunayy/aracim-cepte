import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GEMINI_INTERACTIONS_URL,
  GeminiVehicleAssistantProvider,
  VehicleAssistantProviderError,
  buildGeminiInteractionRequest,
  createConfiguredVehicleAssistantProvider,
  parseGeminiInteractionResponse,
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

test('builds the current stateless Gemini 3.6 Interactions request', () => {
  const request = buildGeminiInteractionRequest(input);
  assert.equal(request.model, 'gemini-3.6-flash');
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
