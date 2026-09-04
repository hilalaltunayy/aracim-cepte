import { describe, expect, it } from 'vitest';
import {
  applyDeterministicSafety,
  canonicalEvidenceCodes,
  classifyQuestion,
  containsUnsupportedDefiniteDiagnosis,
  diagnoseVehicleAssistantResponse,
  MODEL_OWNED_RESPONSE_FIELDS,
  normalizeVehicleAssistantEvidence,
  requiresSafetyEscalation,
  toTrustedVehicleAssistantResponse,
  validateFinalVehicleAssistantResponse,
  validateModelVehicleAssistantResponse,
  VEHICLE_ASSISTANT_MODEL_RESPONSE_SCHEMA,
  type VehicleAssistantContext,
  type VehicleAssistantResponse,
} from './assistantContract';

const context: VehicleAssistantContext = {
  vehicleId: 'vehicle-a',
  generatedAt: '2026-08-15T00:00:00.000Z',
  vehicle: { displayName: 'Kia Sportage', year: 2022, currentOdometer: 86_400 },
  maintenanceFacts: { kmSinceLast: 9_400, daysSinceLast: 180 },
  documentFacts: { inspectionDaysUntil: 10 },
  expertiseFacts: { hasReport: true, latestDate: '2026-01-01' },
  fuelFacts: { averageConsumption: 8.2 },
  costFacts: { recordedCost: 12_000 },
  reminderFacts: { overdueCount: 1 },
  trends: { fuelConsumptionChangePercent: 18 },
  highPrioritySignals: [
    {
      code: 'maintenance_due_soon',
      domain: 'maintenance',
      severity: 'medium',
      confidence: 0.9,
      facts: { kmRemaining: 600 },
    },
  ],
  dataQuality: { validFuelRecords: 9, hasSufficientDistanceData: true },
};

const valid: VehicleAssistantResponse = {
  answer: 'Bakım yaklaşıyor.',
  domain: 'maintenance',
  severity: 'medium',
  evidence: [
    { factCode: 'maintenanceFacts.kmSinceLast', label: 'Son bakımdan beri', value: '9.400 km' },
  ],
  suggestions: ['Bakım randevusu planlayın.'],
  safetyEscalation: false,
  externalDataRequired: false,
};

describe('vehicle assistant contract', () => {
  it('passes valid vehicle questions through the deterministic gate', () => {
    expect(classifyQuestion('Yakıt tüketimim neden artmış olabilir?')).toEqual({
      kind: 'pass',
      externalDataMentioned: false,
    });
  });
  it('rejects obvious unrelated questions locally', () => {
    expect(classifyQuestion("Fransa'nın başkenti neresi?").kind).toBe('out_of_domain');
    expect(classifyQuestion('Bana makarna tarifi ver.').kind).toBe('out_of_domain');
  });
  it('rejects unsupported live-only requests locally', () => {
    const result = classifyQuestion("Konya'da bugün yakıt litre fiyatı nedir?");
    expect(result.kind).toBe('external_data');
    if (result.kind === 'external_data') expect(result.response.externalDataRequired).toBe(true);
  });
  it('lets mixed vehicle reasoning continue while marking external data', () => {
    expect(
      classifyQuestion('Arabamın tüketimini yorumla ve bugün yakıt litre fiyatını söyle'),
    ).toEqual({
      kind: 'pass',
      externalDataMentioned: true,
    });
  });
  it('creates exact canonical evidence IDs without raw record identifiers', () => {
    const codes = canonicalEvidenceCodes(context);
    expect(codes.has('maintenanceFacts.kmSinceLast')).toBe(true);
    expect(codes.has('signals.maintenance_due_soon.facts.kmRemaining')).toBe(true);
    expect(codes.has('vehicleId')).toBe(false);
  });
  it('replaces provider evidence labels and values with canonical context values', () => {
    const normalized = normalizeVehicleAssistantEvidence(
      {
        ...valid,
        evidence: [{ factCode: 'maintenanceFacts.kmSinceLast', label: 'Uydurma', value: '1 km' }],
      },
      context,
    );
    expect(normalized.evidence).toEqual([
      {
        factCode: 'maintenanceFacts.kmSinceLast',
        label: 'Son bakımdan beri',
        value: '9.400',
      },
    ]);
  });
});

// ------------------------------------------------------------------
// A) model-owned contract (pre-normalization)
// ------------------------------------------------------------------
describe('model-owned assistant contract', () => {
  const allowed = () => canonicalEvidenceCodes(context);
  /** Exactly the six fields the prompt + responseSchema ask for. */
  const model = {
    answer: 'Bakım yaklaşıyor.',
    domain: 'maintenance',
    severity: 'medium',
    suggestions: ['Bakım randevusu planlayın.'],
    evidence: [{ factCode: 'maintenanceFacts.kmSinceLast' }],
    externalDataRequired: false,
  };

  it('accepts a valid model-owned response with factCode-only evidence', () => {
    expect(validateModelVehicleAssistantResponse(model, allowed())).toEqual(model);
  });
  it('accepts externalDataRequired in both states', () => {
    expect(validateModelVehicleAssistantResponse(model, allowed())?.externalDataRequired).toBe(
      false,
    );
    expect(
      validateModelVehicleAssistantResponse(
        { ...model, externalDataRequired: true },
        allowed(),
      )?.externalDataRequired,
    ).toBe(true);
  });
  it('accepts the real Gemini shape once domain is the only field missing', () => {
    // `domain` has no consumer, so its absence must never fail a good answer.
    const withoutDomain: Record<string, unknown> = { ...model };
    delete withoutDomain.domain;
    const result = validateModelVehicleAssistantResponse(withoutDomain, allowed());
    expect(result).not.toBeNull();
    expect(result?.domain).toBeUndefined();
  });
  it('rejects the exact production payload that was missing required fields', () => {
    // The observed failure: {answer, evidence, externalDataRequired} only.
    const observed = {
      answer: 'Bakım yaklaşıyor.',
      evidence: [{ factCode: 'maintenanceFacts.kmSinceLast' }],
      externalDataRequired: false,
    };
    expect(validateModelVehicleAssistantResponse(observed, allowed())).toBeNull();
    const diagnostic = diagnoseVehicleAssistantResponse(observed, allowed());
    expect(diagnostic.missingFields).toEqual(['severity', 'suggestions']);
    expect(diagnostic.unexpectedFields).toEqual([]);
  });
  it('rejects a missing truly-required model-owned field', () => {
    for (const field of ['answer', 'severity', 'evidence', 'suggestions', 'externalDataRequired']) {
      const payload: Record<string, unknown> = { ...model };
      delete payload[field];
      expect(validateModelVehicleAssistantResponse(payload, allowed())).toBeNull();
    }
  });
  it('rejects an evidence factCode outside the canonical allowlist', () => {
    expect(
      validateModelVehicleAssistantResponse(
        { ...model, evidence: [{ factCode: 'facts.engine.failure' }] },
        allowed(),
      ),
    ).toBeNull();
  });
  it('rejects unknown enum values for domain and severity', () => {
    expect(
      validateModelVehicleAssistantResponse({ ...model, domain: 'not_a_real_domain' }, allowed()),
    ).toBeNull();
    expect(
      validateModelVehicleAssistantResponse({ ...model, severity: 'urgent' }, allowed()),
    ).toBeNull();
  });
  it('rejects wrong field types', () => {
    expect(validateModelVehicleAssistantResponse({ ...model, answer: 42 }, allowed())).toBeNull();
    expect(
      validateModelVehicleAssistantResponse({ ...model, suggestions: 'tek öneri' }, allowed()),
    ).toBeNull();
    expect(
      validateModelVehicleAssistantResponse({ ...model, suggestions: [42] }, allowed()),
    ).toBeNull();
    expect(
      validateModelVehicleAssistantResponse({ ...model, externalDataRequired: 'false' }, allowed()),
    ).toBeNull();
    expect(
      validateModelVehicleAssistantResponse({ ...model, evidence: [{ factCode: 7 }] }, allowed()),
    ).toBeNull();
  });
  it('rejects a top-level non-object payload (malformed JSON shape)', () => {
    expect(validateModelVehicleAssistantResponse('not an object', allowed())).toBeNull();
    expect(validateModelVehicleAssistantResponse([model], allowed())).toBeNull();
    expect(validateModelVehicleAssistantResponse(null, allowed())).toBeNull();
  });
  it('keeps safetyEscalation strict: absent is fine, a wrong type is not', () => {
    expect(validateModelVehicleAssistantResponse(model, allowed())?.safetyEscalation).toBeUndefined();
    expect(
      validateModelVehicleAssistantResponse({ ...model, safetyEscalation: 'evet' }, allowed()),
    ).toBeNull();
    expect(
      validateModelVehicleAssistantResponse({ ...model, safetyEscalation: true }, allowed())
        ?.safetyEscalation,
    ).toBe(true);
  });
  it('keeps the prompt, schema and validator in lockstep', () => {
    expect([...VEHICLE_ASSISTANT_MODEL_RESPONSE_SCHEMA.required]).toEqual([
      ...MODEL_OWNED_RESPONSE_FIELDS,
    ]);
    expect(Object.keys(VEHICLE_ASSISTANT_MODEL_RESPONSE_SCHEMA.properties)).toEqual([
      ...MODEL_OWNED_RESPONSE_FIELDS,
    ]);
    // Backend-owned fields are never requested from the model.
    const schemaBlob = JSON.stringify(VEHICLE_ASSISTANT_MODEL_RESPONSE_SCHEMA);
    expect(schemaBlob.includes('safetyEscalation')).toBe(false);
    expect(schemaBlob.includes('label')).toBe(false);
    expect(schemaBlob.includes('"value"')).toBe(false);
  });
  it('reports structural facts only, never content', () => {
    const badEnum = diagnoseVehicleAssistantResponse({ ...model, domain: 'nope' }, allowed());
    expect(badEnum.invalidEnumField).toBe('domain');

    const badEvidence = diagnoseVehicleAssistantResponse(
      { ...model, evidence: [{ factCode: 'facts.engine.failure' }] },
      allowed(),
    );
    expect(badEvidence.invalidFieldPath).toBe('evidence[0].factCode');
    expect(badEvidence.expectedType).toBe('allowlisted factCode');

    const blob = JSON.stringify([badEnum, badEvidence]);
    expect(blob.includes('Bakım yaklaşıyor')).toBe(false);
    expect(blob.includes('engine.failure')).toBe(false);
  });
});

// ------------------------------------------------------------------
// B) final trusted contract (post-normalization)
// ------------------------------------------------------------------
describe('trusted assistant response normalization', () => {
  const model = {
    answer: 'Bakım yaklaşıyor.',
    severity: 'medium' as const,
    suggestions: ['Bakım randevusu planlayın.'],
    evidence: [{ factCode: 'maintenanceFacts.kmSinceLast' }],
    externalDataRequired: false,
  };

  it('produces a final response that passes the final validator', () => {
    const trusted = toTrustedVehicleAssistantResponse(model, context, 'Bakım durumum nedir?');
    expect(validateFinalVehicleAssistantResponse(trusted)).not.toBeNull();
    expect(trusted.evidence).toEqual([
      { factCode: 'maintenanceFacts.kmSinceLast', label: 'Son bakımdan beri', value: '9.400' },
    ]);
    // Unconsumed and unclaimed by the model -> neutral bucket, never invented.
    expect(trusted.domain).toBe('general');
    expect(trusted.safetyEscalation).toBe(false);
  });
  it('cannot invent values the trusted context does not have', () => {
    const trusted = toTrustedVehicleAssistantResponse(
      { ...model, evidence: [{ factCode: 'maintenanceFacts.kmSinceLast' }] },
      { ...context, maintenanceFacts: {} },
      'Bakım durumum nedir?',
    );
    // The fact is gone from context, so the evidence row is dropped, not faked.
    expect(trusted.evidence).toEqual([]);
  });
  it('lets the deterministic rule raise safety escalation, and the model never lower it', () => {
    const escalated = toTrustedVehicleAssistantResponse(model, context, 'Fren tutmuyor.');
    expect(escalated.safetyEscalation).toBe(true);
    expect(escalated.domain).toBe('safety');
    expect(escalated.severity).toBe('high');

    const modelRaised = toTrustedVehicleAssistantResponse(
      { ...model, safetyEscalation: true },
      context,
      'Bakım durumum nedir?',
    );
    expect(modelRaised.safetyEscalation).toBe(true);
  });
  it('marks external data when the question needs live data', () => {
    const trusted = toTrustedVehicleAssistantResponse(
      model,
      context,
      'Arabamı yorumla ve bugün yakıt litre fiyatını söyle',
      true,
    );
    expect(trusted.externalDataRequired).toBe(true);
  });
  it('rejects a final response with a broken evidence row', () => {
    expect(
      validateFinalVehicleAssistantResponse({
        ...valid,
        evidence: [{ factCode: 'maintenanceFacts.kmSinceLast', label: 'X' }],
      }),
    ).toBeNull();
    expect(validateFinalVehicleAssistantResponse({ ...valid, safetyEscalation: 'no' })).toBeNull();
    expect(validateFinalVehicleAssistantResponse(valid)).toEqual(valid);
  });
});

describe('vehicle assistant contract (continued)', () => {
  it('detects high-risk Turkish questions', () => {
    expect(requiresSafetyEscalation('Fren tutmuyor, sebebi nedir?')).toBe(true);
    expect(requiresSafetyEscalation('Bakım masrafım nedir?')).toBe(false);
  });
  it('forces safety action over a provider mistake', () => {
    const result = applyDeterministicSafety(
      { ...valid, answer: 'Sürmeye devam edebilirsiniz.' },
      'Fren tutmuyor.',
    );
    expect(result).toMatchObject({ domain: 'safety', severity: 'high', safetyEscalation: true });
    expect(result.answer).toContain('profesyonel kontrol');
  });
  it('detects and replaces unsupported definite diagnosis', () => {
    expect(containsUnsupportedDefiniteDiagnosis('Enjektör kesinlikle arızalı.')).toBe(true);
    const result = applyDeterministicSafety(
      { ...valid, answer: 'Enjektör kesinlikle arızalı.' },
      'Tüketim arttı.',
    );
    expect(result.answer).toContain('kesin bir mekanik neden göstermiyor');
  });
  it('marks mixed live data even if provider omits the flag', () => {
    const result = applyDeterministicSafety(
      valid,
      'Arabamı yorumla ve güncel yakıt fiyatını söyle',
      true,
    );
    expect(result.externalDataRequired).toBe(true);
  });
});
