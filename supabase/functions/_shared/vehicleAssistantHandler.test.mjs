import assert from 'node:assert/strict';
import test from 'node:test';
import { handleVehicleAssistant, VehicleAssistantHttpError } from './vehicleAssistantHandler.ts';

const body = {
  vehicleId: 'a3510000-0000-4000-8000-000000000001',
  operationId: 'a3520000-0000-4000-8000-000000000001',
  question: 'Bakım durumumu özetler misin?',
};
const context = {
  vehicleId: body.vehicleId,
  generatedAt: '2026-08-15T00:00:00Z',
  vehicle: {
    displayName: 'Kia Sportage',
    brand: 'Kia',
    model: 'Sportage',
    color: 'Mavi',
    fuelType: 'Dizel',
    bodyType: 'SUV',
    year: 2022,
    currentOdometer: 86400,
  },
  maintenanceFacts: { kmSinceLast: 9400 },
  documentFacts: {},
  expertiseFacts: {},
  fuelFacts: {},
  costFacts: {},
  reminderFacts: {},
  trends: {},
  highPrioritySignals: [],
  dataQuality: {},
};
const response = {
  answer: 'Bakım yaklaşıyor.',
  domain: 'maintenance',
  severity: 'medium',
  evidence: [
    { factCode: 'maintenanceFacts.kmSinceLast', label: 'Son bakımdan beri', value: '9.400 km' },
  ],
  suggestions: ['Randevu planlayın.'],
  safetyEscalation: false,
  externalDataRequired: false,
};

function dependencies(overrides = {}) {
  const calls = { reserve: 0, commit: 0, release: 0, provider: 0 };
  const deps = {
    loadContext: async () => ({ context, privateFacts: { plate: '34 ABC 123' } }),
    getQuota: async () => ({ used_count: 0, monthly_quota: 3, period_start: '2026-08-01' }),
    reserveQuota: async () => {
      calls.reserve += 1;
      return { used_count: 0, monthly_quota: 3, period_start: '2026-08-01' };
    },
    commitQuota: async () => {
      calls.commit += 1;
      return { used_count: 1, monthly_quota: 3, period_start: '2026-08-01' };
    },
    releaseQuota: async () => {
      calls.release += 1;
      return true;
    },
    provider: {
      id: 'mock',
      generateVehicleAssistantResponse: async () => {
        calls.provider += 1;
        return response;
      },
    },
    ...overrides,
  };
  return { deps, calls };
}

test('rejects unauthenticated and caller-supplied identity', async () => {
  const { deps } = dependencies();
  await assert.rejects(
    () => handleVehicleAssistant(null, body, deps),
    (error) => error.status === 401,
  );
  await assert.rejects(
    () => handleVehicleAssistant('user-a', { ...body, userId: 'user-b' }, deps),
    (error) => error.status === 400,
  );
});

test('rejects a vehicle outside the authenticated owner scope', async () => {
  const { deps } = dependencies({ loadContext: async () => null });
  await assert.rejects(
    () => handleVehicleAssistant('user-a', body, deps),
    (error) => error.status === 403,
  );
});

test('answers a stored profile lookup deterministically without spending quota', async () => {
  for (const [question, expected] of [
    ['Aracımın rengi ne?', 'Aracınızın kayıtlı rengi mavidir.'],
    ['Modelim ne?', 'Aracınızın kayıtlı modeli Sportage.'],
    ['Markam ne?', 'Aracınızın kayıtlı markası Kia.'],
    ['Kaç model?', 'Aracınızın kayıtlı model yılı 2022.'],
    ['Yakıt tipi ne?', 'Aracınızın kayıtlı yakıt tipi Dizel.'],
    ['Güncel km kaç?', 'Aracınızın kayıtlı güncel kilometresi 86.400 km.'],
  ]) {
    const { deps, calls } = dependencies();
    const result = await handleVehicleAssistant('user-a', { ...body, question }, deps);
    assert.equal(result.response.answer, expected, question);
    assert.equal(result.source, 'local');
    assert.deepEqual(calls, { reserve: 0, commit: 0, release: 0, provider: 0 }, question);
  }
});

test('answers the plate from private facts and never sends it to the provider', async () => {
  const { deps, calls } = dependencies();
  const result = await handleVehicleAssistant(
    'user-a',
    { ...body, question: 'Plakam ne?' },
    deps,
  );
  assert.equal(result.response.answer, 'Aracınızın kayıtlı plakası 34 ABC 123.');
  assert.equal(result.source, 'local');
  assert.equal(calls.provider, 0);
  // The plate has no canonical evidence code because it is not in the context.
  assert.deepEqual(result.response.evidence, []);
});

test('leaves analytical questions to the normal provider flow', async () => {
  for (const question of [
    'Km başına maliyetim ne?',
    'Ortalama tüketimim ne kadar?',
    'Bakım durumumu özetler misin?',
  ]) {
    const { deps, calls } = dependencies();
    const result = await handleVehicleAssistant('user-a', { ...body, question }, deps);
    assert.equal(result.source, 'provider', question);
    assert.equal(calls.provider, 1, question);
    assert.equal(calls.commit, 1, question);
  }
});

test('rejects unrelated questions locally without reserving quota or calling provider', async () => {
  const { deps, calls } = dependencies();
  const result = await handleVehicleAssistant(
    'user-a',
    { ...body, question: "Fransa'nın başkenti neresi?" },
    deps,
  );
  assert.equal(result.response.domain, 'out_of_domain');
  assert.equal(result.source, 'local');
  assert.deepEqual(calls, { reserve: 0, commit: 0, release: 0, provider: 0 });
});

test('rejects live-data-only questions locally without consuming quota', async () => {
  const { deps, calls } = dependencies();
  const result = await handleVehicleAssistant(
    'user-a',
    { ...body, question: 'Bugün yakıt litre fiyatı nedir?' },
    deps,
  );
  assert.equal(result.response.externalDataRequired, true);
  assert.equal(calls.reserve, 0);
});

test('commits exactly once after a valid grounded provider response', async () => {
  const { deps, calls } = dependencies();
  const result = await handleVehicleAssistant('user-a', body, deps);
  assert.equal(result.quota.used, 1);
  assert.deepEqual(calls, { reserve: 1, commit: 1, release: 0, provider: 1 });
});

test('a not_found answer is delivered but does not spend an allowance', async () => {
  const { deps, calls } = dependencies({
    provider: {
      id: 'mock',
      generateVehicleAssistantResponse: async () => ({
        ...response,
        answer: 'Aracınız için kayıtlı bir renk bilgisi bulunmuyor.',
        evidence: [],
      }),
    },
  });
  const result = await handleVehicleAssistant('user-a', body, deps);
  // The user still gets the answer...
  assert.equal(result.response.answer, 'Aracınız için kayıtlı bir renk bilgisi bulunmuyor.');
  assert.equal(result.source, 'provider');
  // ...but a provider 200 that helped nobody must not be billed.
  assert.equal(calls.reserve, 1);
  assert.equal(calls.commit, 0);
  assert.equal(calls.release, 1);
  assert.equal(result.quota.used, 0);
});

test('an insufficient_data answer does not spend an allowance either', async () => {
  const { deps, calls } = dependencies({
    provider: {
      id: 'mock',
      generateVehicleAssistantResponse: async () => ({
        ...response,
        answer: 'Tüketim eğilimi için yeterli veri yok.',
        evidence: [],
      }),
    },
  });
  const result = await handleVehicleAssistant('user-a', body, deps);
  assert.equal(calls.commit, 0);
  assert.equal(calls.release, 1);
  assert.equal(result.quota.used, 0);
});

test('a substantive answer still spends exactly one allowance', async () => {
  const { deps, calls } = dependencies();
  const result = await handleVehicleAssistant('user-a', body, deps);
  assert.equal(calls.reserve, 1);
  assert.equal(calls.commit, 1);
  assert.equal(calls.release, 0);
  assert.equal(result.quota.used, 1);
});

test('traces the answer outcome before deciding whether to bill', async () => {
  const diagnostics = [];
  const { deps } = dependencies({
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    provider: {
      id: 'mock',
      generateVehicleAssistantResponse: async () => ({
        ...response,
        answer: 'Bu konuda kayıt bulunmuyor.',
        evidence: [],
      }),
    },
  });
  await handleVehicleAssistant('user-a', body, deps);
  const outcome = diagnostics.find((entry) => entry.stage === 'outcome');
  assert.deepEqual(outcome, {
    stage: 'outcome',
    answerOutcome: 'not_found',
    consumesQuota: false,
  });
  assert.equal(
    diagnostics.some(
      (entry) => entry.stage === 'result' && entry.outcome === 'unbilled',
    ),
    true,
  );
  // The trace stays structural: no answer text leaks into the logs.
  assert.equal(JSON.stringify(diagnostics).includes('kayıt bulunmuyor'), false);
});

test('releases quota when provider fails', async () => {
  const { deps, calls } = dependencies({
    provider: {
      id: 'mock',
      generateVehicleAssistantResponse: async () => {
        throw new Error('offline');
      },
    },
  });
  await assert.rejects(
    () => handleVehicleAssistant('user-a', body, deps),
    (error) => error.status === 503,
  );
  assert.equal(calls.commit, 0);
  assert.equal(calls.release, 1);
});

test('releases quota for malformed or fabricated-evidence output', async () => {
  const { deps, calls } = dependencies({
    provider: {
      id: 'mock',
      generateVehicleAssistantResponse: async () => ({
        ...response,
        evidence: [{ factCode: 'engine.failure', label: 'Motor', value: 'Arızalı' }],
      }),
    },
  });
  await assert.rejects(
    () => handleVehicleAssistant('user-a', body, deps),
    (error) => error.status === 502,
  );
  assert.equal(calls.release, 1);
});

test('rejects the exact production payload and names the missing model-owned fields', async () => {
  const lines = [];
  const { deps, calls } = dependencies({ onDiagnostic: (d) => lines.push(d) });
  deps.provider = {
    id: 'mock',
    generateVehicleAssistantResponse: async () => {
      calls.provider += 1;
      // Verbatim shape from the failing physical trace.
      return {
        answer: 'Bakım yaklaşıyor.',
        evidence: [{ factCode: 'maintenanceFacts.kmSinceLast' }],
        externalDataRequired: false,
      };
    },
  };
  await assert.rejects(
    () => handleVehicleAssistant('user-a', body, deps),
    (error) => error.status === 502 && error.code === 'AI_RESPONSE_INVALID',
  );
  const validateLine = lines.find((line) => line.stage === 'validate');
  assert.deepEqual(validateLine.missingFields, ['severity', 'suggestions']);
  assert.equal(validateLine.parseSucceeded, true);
  // Invalid output never commits, and the reservation always comes back.
  assert.deepEqual(calls, { reserve: 1, commit: 0, release: 1, provider: 1 });
});

test('traces the normalization stage and final validation before committing', async () => {
  const lines = [];
  const { deps } = dependencies({ onDiagnostic: (d) => lines.push(d) });
  await handleVehicleAssistant('user-a', body, deps);
  const normalizeLine = lines.find((line) => line.stage === 'normalize');
  assert.equal(normalizeLine.normalizationStage, 'trusted');
  assert.equal(normalizeLine.finalValidationPassed, true);
  // Order matters: nothing commits before the final contract check passed.
  assert.ok(
    lines.findIndex((line) => line.stage === 'normalize') <
      lines.findIndex((line) => line.stage === 'commit'),
  );
});

test('accepts a real Gemini answer whose evidence carries only factCode (no label/value)', async () => {
  // This was the AI_RESPONSE_INVALID root cause: the model is only ever asked
  // for {factCode}, but validation used to also require label/value strings.
  const { deps, calls } = dependencies();
  deps.provider = {
    id: 'mock',
    generateVehicleAssistantResponse: async () => {
      calls.provider += 1;
      return { ...response, evidence: [{ factCode: 'maintenanceFacts.kmSinceLast' }] };
    },
  };
  const result = await handleVehicleAssistant('user-a', body, deps);
  assert.equal(result.source, 'provider');
  assert.equal(result.response.evidence[0].label, 'Son bakımdan beri');
  assert.deepEqual(calls, { reserve: 1, commit: 1, release: 0, provider: 1 });
});

test('provider 200 + invalid response releases quota and traces a redacted structural diagnostic', async () => {
  const lines = [];
  const { deps, calls } = dependencies({ onDiagnostic: (d) => lines.push(d) });
  deps.provider = {
    id: 'mock',
    generateVehicleAssistantResponse: async () => {
      calls.provider += 1;
      return { ...response, domain: 'not_a_real_domain' };
    },
  };
  await assert.rejects(
    () => handleVehicleAssistant('user-a', body, deps),
    (error) => error.status === 502 && error.code === 'AI_RESPONSE_INVALID',
  );
  assert.deepEqual(calls, { reserve: 1, commit: 0, release: 1, provider: 1 });
  const validateLine = lines.find((line) => line.stage === 'validate');
  assert.equal(validateLine.invalidEnumField, 'domain');
  assert.equal(validateLine.parseSucceeded, true);
  const blob = JSON.stringify(lines);
  assert.equal(blob.includes(response.answer), false);
  assert.equal(blob.includes('Kia Sportage'), false);
});

// "provider 200 + valid response commits quota exactly once" is already
// covered by 'commits exactly once after a valid grounded provider response'.

test('client cancellation before commit releases the reservation and consumes zero', async () => {
  const controller = new AbortController();
  controller.abort();
  const { deps, calls } = dependencies({ signal: controller.signal });
  await assert.rejects(
    () => handleVehicleAssistant('user-a', body, deps),
    (error) => error.status === 499,
  );
  assert.equal(calls.commit, 0);
  assert.equal(calls.release, 1);
});

test('deterministic safety override wins over provider content', async () => {
  const { deps } = dependencies({
    provider: {
      id: 'mock',
      generateVehicleAssistantResponse: async () => ({
        ...response,
        answer: 'Sürmeye devam edin.',
      }),
    },
  });
  const result = await handleVehicleAssistant(
    'user-a',
    { ...body, question: 'Fren tutmuyor, kesin sebebi ne?' },
    deps,
  );
  assert.equal(result.response.safetyEscalation, true);
  assert.equal(result.response.domain, 'safety');
  assert.match(result.response.answer, /profesyonel kontrol/);
});

test('fails closed before reservation when provider privacy configuration is unavailable', async () => {
  const lines = [];
  const { deps, calls } = dependencies({ provider: null, onDiagnostic: (d) => lines.push(d) });
  await assert.rejects(
    () => handleVehicleAssistant('user-a', body, deps),
    (error) => error.status === 503,
  );
  assert.equal(calls.reserve, 0);
  // Logs must separate "secrets missing" from "provider errored".
  assert.deepEqual(lines[0], { stage: 'config', providerConfigured: false });
  assert.equal(lines.at(-1).code, 'AI_PROVIDER_NOT_CONFIGURED');
});

test('maps the authoritative daily quota boundary without committing', async () => {
  const { deps, calls } = dependencies({
    reserveQuota: async () => {
      calls.reserve += 1;
      throw new Error('AI_MONTHLY_QUOTA_EXCEEDED');
    },
  });
  await assert.rejects(
    () => handleVehicleAssistant('user-a', body, deps),
    (error) => error instanceof VehicleAssistantHttpError && error.status === 429,
  );
  assert.equal(calls.commit, 0);
  assert.equal(calls.release, 0);
});

test('an in-flight reservation conflict is 409 AI_USAGE_IN_PROGRESS, never 429', async () => {
  const { deps } = dependencies({
    reserveQuota: async () => {
      throw new Error('AI_USAGE_IN_PROGRESS');
    },
  });
  await assert.rejects(
    () => handleVehicleAssistant('user-a', body, deps),
    (error) =>
      error instanceof VehicleAssistantHttpError &&
      error.status === 409 &&
      error.code === 'AI_USAGE_IN_PROGRESS',
  );
});

for (const [label, fail] of [
  ['provider 4xx', () => Promise.reject(new Error('AI_PROVIDER_UNAVAILABLE'))],
  ['provider 5xx', () => Promise.reject(new Error('AI_PROVIDER_UNAVAILABLE'))],
  ['provider timeout', () => Promise.reject(new Error('AI_PROVIDER_TIMEOUT'))],
  ['invalid provider response', () => Promise.resolve({ answer: 42 })],
]) {
  test(`${label} releases the reservation and consumes zero`, async () => {
    const { deps, calls } = dependencies({
      provider: { id: 'mock', generateVehicleAssistantResponse: fail },
    });
    await assert.rejects(() => handleVehicleAssistant('user-a', body, deps));
    assert.equal(calls.reserve, 1);
    assert.equal(calls.commit, 0);
    assert.equal(calls.release, 1);
  });
}

test('a retry after a failed call still reserves, and a successful retry commits exactly once', async () => {
  let attempt = 0;
  const { deps, calls } = dependencies();
  deps.provider = {
    id: 'mock',
    generateVehicleAssistantResponse: async () => {
      attempt += 1;
      calls.provider += 1;
      if (attempt === 1) throw new Error('AI_PROVIDER_UNAVAILABLE');
      return response;
    },
  };
  await assert.rejects(() => handleVehicleAssistant('user-a', body, deps));
  const ok = await handleVehicleAssistant(
    'user-a',
    { ...body, operationId: 'a3520000-0000-4000-8000-000000000002' },
    deps,
  );
  assert.equal(ok.source, 'provider');
  assert.deepEqual(calls, { reserve: 2, commit: 1, release: 1, provider: 2 });
});

test('the redacted lifecycle trace never carries the prompt, context or output', async () => {
  const lines = [];
  const { deps } = dependencies({ onDiagnostic: (d) => lines.push(JSON.stringify(d)) });
  await handleVehicleAssistant('user-a', body, deps);
  const blob = lines.join(' ');
  assert.equal(blob.includes('Bakım durumumu'), false);
  assert.equal(blob.includes('Kia Sportage'), false);
  assert.equal(blob.includes('9400'), false);
  assert.match(blob, /"stage":"commit"/);
  assert.match(blob, /"outcome":"committed"/);
});
