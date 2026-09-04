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
  vehicle: { displayName: 'Kia Sportage', year: 2022, currentOdometer: 86400 },
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
    loadContext: async () => context,
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
