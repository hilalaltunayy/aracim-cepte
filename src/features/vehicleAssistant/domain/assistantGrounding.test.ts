import { describe, expect, it } from 'vitest';
import {
  canonicalEvidenceCodes,
  resolveDeterministicVehicleFact,
  type VehicleAssistantContext,
} from './assistantContract';
import {
  buildBodyConditionContext,
  buildDetailContext,
  formatPanelState,
  resolvePanelConditions,
} from '../../../../supabase/functions/_shared/vehicleAssistantContext';

/** The vehicle from the reference screenshots: Mavi, Van, Dizel, 97.100 km. */
const baseContext = (
  overrides: Partial<VehicleAssistantContext> = {},
): VehicleAssistantContext => ({
  vehicleId: '11111111-1111-4111-8111-111111111111',
  generatedAt: '2026-09-07T10:00:00.000Z',
  vehicle: {
    displayName: 'Lamborghini Rewangor',
    brand: 'Lamborghini',
    model: 'Rewangor',
    color: 'Mavi',
    fuelType: 'Dizel',
    bodyType: 'Van',
    year: 2018,
    currentOdometer: 97_100,
  },
  maintenanceFacts: {},
  documentFacts: {},
  expertiseFacts: { hasReport: true, latestDate: '2026-07-14' },
  fuelFacts: {},
  costFacts: {},
  reminderFacts: {},
  trends: {},
  highPrioritySignals: [],
  dataQuality: {},
  ...overrides,
});

/** The panel rows from `05-body-condition-data-exists.jpeg`. */
const panelRows = [
  { id: 'p1', part_key: 'front_bumper', condition: 'unknown', condition_set_initialized: true, updated_at: '2026-09-01T00:00:00Z' },
  { id: 'p2', part_key: 'hood', condition: 'unknown', condition_set_initialized: true, updated_at: '2026-09-02T00:00:00Z' },
  { id: 'p3', part_key: 'roof', condition: 'unknown', condition_set_initialized: true, updated_at: '2026-09-02T00:00:00Z' },
  { id: 'p4', part_key: 'cargo_bed', condition: 'unknown', condition_set_initialized: true, updated_at: '2026-09-01T00:00:00Z' },
  { id: 'p5', part_key: 'tailgate', condition: 'unknown', condition_set_initialized: true, updated_at: '2026-09-03T00:00:00Z' },
];
const valueRows = [
  { body_part_condition_id: 'p2', condition: 'painted' },
  { body_part_condition_id: 'p2', condition: 'damaged' },
  { body_part_condition_id: 'p3', condition: 'original' },
  { body_part_condition_id: 'p5', condition: 'damaged' },
];
const referenceBody = () => buildBodyConditionContext(panelRows, valueRows);
const groundedContext = () => baseContext({ bodyCondition: referenceBody() });

const answer = (question: string, context = groundedContext()) =>
  resolveDeterministicVehicleFact(question, context)?.answer ?? null;

describe('vehicle core facts are grounded in stored data', () => {
  it('never reports a stored colour as unavailable', () => {
    for (const question of ['Araç rengi ne', 'Aracımın rengi ne?', 'Rengi nedir']) {
      const text = answer(question);
      expect(text).toContain('mavi');
      expect(text).not.toContain('bulunmuyor');
      expect(text).not.toContain('bulunmamakta');
    }
  });

  it('answers model, model year, brand, fuel type and odometer from the profile', () => {
    expect(answer('Modeli ne')).toContain('Rewangor');
    expect(answer('Model yılı kaç')).toContain('2018');
    expect(answer('Markası ne')).toContain('Lamborghini');
    expect(answer('Yakıt türü ne')).toContain('Dizel');
    expect(answer('Güncel kilometrem kaç')).toContain('97.100');
  });

  it('answers the body TYPE for the label the vehicle form actually uses', () => {
    // The form says "Gövde tipi"; only "kasa tipi" used to match.
    expect(answer('Gövde tipi ne')).toContain('Van');
    expect(answer('Kasa tipi ne')).toContain('Van');
  });

  it('resolves the plate only from private facts, never from model context', () => {
    const context = groundedContext();
    expect(JSON.stringify(context)).not.toContain('42 ZBA 777');
    const withPlate = resolveDeterministicVehicleFact('Plakam ne', context, {
      plate: '42 ZBA 777',
    });
    expect(withPlate?.answer).toContain('42 ZBA 777');
  });

  it('says a field is missing only when it is genuinely null', () => {
    const context = baseContext({
      vehicle: { ...baseContext().vehicle, color: null },
      bodyCondition: referenceBody(),
    });
    expect(answer('Araç rengi ne', context)).toContain('bulunmuyor');
  });
});

describe('body condition is answered from the direct recorded state', () => {
  it('resolves a multi-state panel exactly as the screen shows it', () => {
    const body = referenceBody();
    const hood = body.panels.find((panel) => panel.partKey === 'hood');
    expect(hood?.part).toBe('Kaput');
    expect(hood?.state).toBe('Boyalı + Hasarlı');
    expect(hood?.recorded).toBe(true);
  });

  it('resolves an original panel and an unentered panel', () => {
    const body = referenceBody();
    expect(body.panels.find((panel) => panel.partKey === 'roof')?.state).toBe('Orijinal');
    const bumper = body.panels.find((panel) => panel.partKey === 'front_bumper');
    expect(bumper?.state).toBe('Durum girilmedi');
    expect(bumper?.recorded).toBe(false);
  });

  it('never claims there is no direct body data when panels are recorded', () => {
    for (const question of [
      'Araç gövde durumu nedir',
      'Gövde durumunu özetler misin',
      'Kaputun durumu ne',
    ]) {
      const text = answer(question);
      expect(text).toBeTruthy();
      expect(text).not.toContain('doğrudan bir veri bulunmamakta');
      expect(text).not.toContain('ekspertiz');
    }
  });

  it('answers a specific panel question with that panel state', () => {
    expect(answer('Kaputun durumu ne')).toContain('Boyalı + Hasarlı');
    expect(answer('Tavan orijinal mi')).toContain('Orijinal');
    expect(answer('Arka kapak durumu')).toContain('Hasarlı');
  });

  it('lists damaged, painted and original panels', () => {
    const damaged = answer('Hangi parçalar hasarlı');
    expect(damaged).toContain('Kaput');
    expect(damaged).toContain('Arka kapak');
    expect(answer('Hangi parçalar boyalı')).toContain('Kaput');
    expect(answer('Hangi parçalar orijinal')).toContain('Tavan');
  });

  it('summarises recorded panels and counts the unentered ones', () => {
    const summary = answer('Gövde durumunu özetler misin');
    expect(summary).toContain('Kaput: Boyalı + Hasarlı');
    expect(summary).toContain('Tavan: Orijinal');
    expect(summary).toContain('2 parça');
  });

  it('prefers the direct panel state over an older expertise report', () => {
    const context = groundedContext();
    // The context still carries the expertise report, but the direct answer wins
    // and never redirects the user to it.
    expect(context.expertiseFacts.hasReport).toBe(true);
    expect(answer('Araç gövde durumu nedir', context)).not.toContain('ekspertiz');
  });

  it('reports genuinely absent body data as absent, and points at the screen', () => {
    const empty = buildBodyConditionContext(
      [{ id: 'p1', part_key: 'hood', condition: 'unknown', condition_set_initialized: true }],
      [],
    );
    const text = answer('Araç gövde durumu nedir', baseContext({ bodyCondition: empty }));
    expect(text).toContain('bulunmuyor');
    expect(text).toContain('Gövde durumu ekranından');
  });

  it('reports a failed body-condition read as unreadable, not as no-data', () => {
    const text = answer(
      'Araç gövde durumu nedir',
      baseContext({ retrieval: { bodyCondition: 'unavailable' } }),
    );
    expect(text).toContain('ulaşılamıyor');
    expect(text).not.toContain('kayıtlı bir gövde durumu bulunmuyor');
  });

  it('keeps "gövde tipi" as a profile question, not a condition question', () => {
    expect(answer('Gövde tipi ne')).toContain('Van');
    expect(answer('Gövde tipi ne')).not.toContain('Kaput');
  });

  it('exposes panel evidence codes so answers can cite the panel', () => {
    const codes = canonicalEvidenceCodes(groundedContext());
    expect(codes.has('bodyCondition.panel.hood')).toBe(true);
    expect(codes.has('bodyCondition.damagedPanels')).toBe(true);
    expect(codes.has('bodyCondition.hasDirectData')).toBe(true);
  });
});

describe('panel condition resolution mirrors the app rules', () => {
  it('uses child values once the multi-select has been initialised', () => {
    expect(resolvePanelConditions('original', ['painted', 'damaged'], true)).toEqual([
      'painted',
      'damaged',
    ]);
  });

  it('treats an initialised empty set as explicitly not entered', () => {
    expect(resolvePanelConditions('painted', [], true)).toEqual([]);
    expect(formatPanelState([])).toBe('Durum girilmedi');
  });

  it('falls back to the legacy singleton only when never initialised', () => {
    expect(resolvePanelConditions('replaced', [], false)).toEqual(['replaced']);
    expect(resolvePanelConditions(null, [], false)).toEqual([]);
  });

  it('renders multi-state panels in the catalog order', () => {
    expect(formatPanelState(resolvePanelConditions(null, ['damaged', 'painted'], true))).toBe(
      'Boyalı + Hasarlı',
    );
  });
});

describe('intent-sensitive detail layer stays bounded', () => {
  const detailInput = {
    today: new Date('2026-09-07T00:00:00Z'),
    currentOdometer: 97_100,
    latestMaintenance: { record_date: '2026-06-01', amount: 4200, kilometer: 90_000, service_type: 'authorized_service' },
    latestFuel: { record_date: '2026-09-01', amount: 1500, liters: 30, kilometer: 96_800 },
    latestExpertise: { report_date: '2026-07-14', company_name: 'Test Ekspertiz' },
    documents: Array.from({ length: 12 }, (_, index) => ({
      document_type: 'inspection',
      issue_date: '2026-01-01',
      expiry_date: `2027-0${(index % 9) + 1}-01`,
    })),
    reminders: Array.from({ length: 12 }, (_, index) => ({
      reminder_type: 'periodic_maintenance',
      due_date: `2026-1${index % 2}-01`,
      due_kilometer: null,
    })),
    fuelOdometers: [80_000, 96_800],
  };

  it('attaches nothing for a question that needs no detail', () => {
    expect(buildDetailContext({ ...detailInput, question: 'Aracımın rengi ne?' })).toBeUndefined();
  });

  it('attaches only the block the question is about', () => {
    const details = buildDetailContext({ ...detailInput, question: 'Son bakım ne zaman yapıldı?' });
    expect(details?.latestMaintenance).toMatchObject({ date: '2026-06-01', amount: 4200 });
    expect(details?.latestFuel).toBeUndefined();
    expect(details?.documents).toBeUndefined();
  });

  it('derives the fuel price per litre instead of asking the model to divide', () => {
    const details = buildDetailContext({ ...detailInput, question: 'Son yakıt alımım ne zaman?' });
    expect(details?.latestFuel).toMatchObject({ liters: 30, amount: 1500, pricePerLiter: 50 });
  });

  it('caps long document and reminder lists so the prompt stays bounded', () => {
    const details = buildDetailContext({
      ...detailInput,
      question: 'Hangi belgelerimin süresi yaklaşıyor ve yaklaşan hatırlatıcılarım neler?',
    });
    expect(details?.documents?.length).toBe(6);
    expect(details?.reminders?.length).toBe(6);
  });

  it('exposes odometer history for a distance question', () => {
    const details = buildDetailContext({ ...detailInput, question: 'Son kayıttan beri kaç km yaptım?' });
    expect(details?.odometer).toMatchObject({
      current: 97_100,
      recordedDistance: 16_800,
      readings: 2,
    });
  });
});
