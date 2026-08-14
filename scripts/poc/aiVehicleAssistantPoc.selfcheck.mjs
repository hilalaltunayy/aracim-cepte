import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CASES,
  RESPONSE_SCHEMA,
  ProviderRequestError,
  canonicalEvidenceCodes,
  classifyFailure,
  geminiResponseSchema,
  groqResponseFormat,
  retryAfterMs,
  validateResponse,
} from './aiVehicleAssistantPoc.mjs';

const context = CASES[1].context;
const allowed = canonicalEvidenceCodes(context);
assert(allowed.has('facts.maintenance.kmUntilKnownInterval'));
assert(allowed.has('signals.maintenance_due_soon'));
assert.equal(validateResponse({ answer: 'Bakım yaklaşıyor.', domain: 'maintenance', severity: 'low', evidence: [{ factCode: 'facts.maintenance.kmUntilKnownInterval', label: 'Kalan km', value: '600' }], suggestions: [], safetyEscalation: false, externalDataRequired: false }, context).length, 0);
assert(validateResponse({ answer: 'Uydurma.', domain: 'maintenance', severity: 'low', evidence: [{ factCode: 'facts.engine.failure', label: 'X', value: '1' }], suggestions: [], safetyEscalation: false, externalDataRequired: false }, context).some((error) => error.includes('unknown evidence')));
assert.deepEqual(geminiResponseSchema().required, RESPONSE_SCHEMA.required);
assert.equal(geminiResponseSchema().additionalProperties, false);
assert.equal(groqResponseFormat().json_schema.strict, true);
const rateError = new ProviderRequestError('groq', 429, 'rate_limit', 'slow down', { retryAfter: '2' });
assert.equal(retryAfterMs(rateError), 2000);
assert.equal(classifyFailure(rateError).status, 'rate_limit');
assert.equal(classifyFailure(new SyntaxError('invalid JSON')).status, 'invalid_json');
const artifact = await readFile('docs/research/ai-vehicle-assistant-poc-review.md', 'utf8');
assert(!/AIza|Bearer\s+[A-Za-z0-9._-]+|sk-[A-Za-z0-9]/i.test(artifact));
console.log('POC self-check: 9 passed');
