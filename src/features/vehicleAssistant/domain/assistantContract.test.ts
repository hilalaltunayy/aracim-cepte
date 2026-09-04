import { describe, expect, it } from 'vitest';
import {
  applyDeterministicSafety,
  canonicalEvidenceCodes,
  classifyQuestion,
  containsUnsupportedDefiniteDiagnosis,
  diagnoseVehicleAssistantResponse,
  normalizeVehicleAssistantEvidence,
  requiresSafetyEscalation,
  validateVehicleAssistantResponse,
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
  it('accepts valid grounded structured output', () => {
    expect(validateVehicleAssistantResponse(valid, canonicalEvidenceCodes(context))).toEqual(valid);
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
  it('rejects fabricated evidence IDs', () => {
    expect(
      validateVehicleAssistantResponse(
        {
          ...valid,
          evidence: [{ factCode: 'facts.engine.failure', label: 'Motor', value: 'Arızalı' }],
        },
        canonicalEvidenceCodes(context),
      ),
    ).toBeNull();
  });
  it('rejects malformed provider output', () => {
    expect(
      validateVehicleAssistantResponse({ answer: 'Eksik' }, canonicalEvidenceCodes(context)),
    ).toBeNull();
  });
  it('rejects a top-level non-object payload (malformed JSON shape)', () => {
    expect(validateVehicleAssistantResponse('not an object', canonicalEvidenceCodes(context))).toBeNull();
    expect(validateVehicleAssistantResponse([valid], canonicalEvidenceCodes(context))).toBeNull();
    expect(validateVehicleAssistantResponse(null, canonicalEvidenceCodes(context))).toBeNull();
  });
  it('rejects a wrong enum value even when every other field is valid', () => {
    expect(
      validateVehicleAssistantResponse(
        { ...valid, domain: 'not_a_real_domain' },
        canonicalEvidenceCodes(context),
      ),
    ).toBeNull();
    expect(
      validateVehicleAssistantResponse(
        { ...valid, severity: 'urgent' },
        canonicalEvidenceCodes(context),
      ),
    ).toBeNull();
  });
  it('accepts real Gemini output that omits evidence label/value — the AI_RESPONSE_INVALID root cause', () => {
    // The system prompt only ever asks the model for {factCode}; label/value
    // are always rebuilt from the canonical catalog afterward. Requiring them
    // here rejected every real answer that cited any evidence.
    const factCodeOnly = {
      ...valid,
      evidence: [{ factCode: 'maintenanceFacts.kmSinceLast' }],
    };
    const result = validateVehicleAssistantResponse(factCodeOnly, canonicalEvidenceCodes(context));
    expect(result).not.toBeNull();
    expect(result?.evidence).toEqual([
      { factCode: 'maintenanceFacts.kmSinceLast', label: '', value: '' },
    ]);
    // And normalization still fills the real label/value from trusted context.
    const normalized = normalizeVehicleAssistantEvidence(result as VehicleAssistantResponse, context);
    expect(normalized.evidence).toEqual([
      { factCode: 'maintenanceFacts.kmSinceLast', label: 'Son bakımdan beri', value: '9.400' },
    ]);
  });
  it('diagnoseVehicleAssistantResponse reports structural facts only, never content', () => {
    const missing = diagnoseVehicleAssistantResponse(
      { answer: 'Eksik' },
      canonicalEvidenceCodes(context),
    );
    expect(missing.parseSucceeded).toBe(true);
    expect(missing.topLevelKeys).toEqual(['answer']);
    expect(missing.missingFields).toEqual(
      expect.arrayContaining(['domain', 'severity', 'evidence', 'suggestions']),
    );

    const badEnum = diagnoseVehicleAssistantResponse(
      { ...valid, domain: 'not_a_real_domain' },
      canonicalEvidenceCodes(context),
    );
    expect(badEnum.invalidEnumField).toBe('domain');

    const badEvidence = diagnoseVehicleAssistantResponse(
      { ...valid, evidence: [{ factCode: 'facts.engine.failure' }] },
      canonicalEvidenceCodes(context),
    );
    expect(badEvidence.invalidFieldPath).toBe('evidence[0].factCode');
    expect(badEvidence.expectedType).toBe('allowlisted factCode');

    const blob = JSON.stringify([missing, badEnum, badEvidence]);
    expect(blob.includes('Eksik')).toBe(false);
    expect(blob.includes('engine.failure')).toBe(false);
  });
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
