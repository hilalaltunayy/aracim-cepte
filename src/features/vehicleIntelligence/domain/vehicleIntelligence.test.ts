import { describe, expect, it } from 'vitest';
import type { ExpertiseReport, Reminder, Vehicle, VehicleDocument, VehicleRecord } from '@/domain/entities';
import { buildVehicleAssistantContext } from '../services/vehicleAssistantContext';
import { buildVehicleIntelligence } from './vehicleIntelligence';

const anchor = new Date('2026-08-14T12:00:00');

const vehicle = (id = 'vehicle-a'): Vehicle => ({
  id,
  ownerId: 'owner-a',
  brand: 'Kia',
  model: 'Sportage',
  year: 2023,
  plate: null,
  currentKm: 50_000,
  fuelType: 'gasoline',
  bodyType: 'suv',
  colorId: 'white',
  color: 'Beyaz',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  archivedAt: null,
});

const record = (overrides: Partial<VehicleRecord> = {}): VehicleRecord => ({
  id: `record-${Math.random()}`,
  vehicleId: 'vehicle-a',
  ownerId: 'owner-a',
  recordType: 'fuel',
  category: 'Yakıt',
  amount: 1_000,
  recordDate: '2026-08-01',
  kilometer: 49_900,
  liters: 20,
  description: null,
  createdAt: '2026-08-01T12:00:00Z',
  updatedAt: '2026-08-01T12:00:00Z',
  ...overrides,
});

const document = (overrides: Partial<VehicleDocument> = {}): VehicleDocument => ({
  id: `document-${Math.random()}`,
  vehicleId: 'vehicle-a',
  ownerId: 'owner-a',
  documentType: 'traffic_insurance',
  title: 'Trafik sigortası',
  documentNumber: null,
  issuerName: null,
  startDate: null,
  eventDate: null,
  issueDate: null,
  expiryDate: null,
  note: null,
  attachmentPath: null,
  attachments: [],
  createdAt: '2026-01-01T12:00:00Z',
  updatedAt: '2026-01-01T12:00:00Z',
  ...overrides,
});

const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: `reminder-${Math.random()}`,
  vehicleId: 'vehicle-a',
  ownerId: 'owner-a',
  title: 'Bakım',
  reminderType: 'periodic_maintenance',
  dueDate: null,
  dueTime: '09:00',
  dueKilometer: null,
  completed: false,
  completedAt: null,
  notificationId: null,
  notificationStatus: 'pending',
  notificationLastAttemptAt: null,
  notificationErrorCode: null,
  createdAt: '2026-01-01T12:00:00Z',
  updatedAt: '2026-01-01T12:00:00Z',
  ...overrides,
});

const expertise = (overrides: Partial<ExpertiseReport> = {}): ExpertiseReport => ({
  id: `expertise-${Math.random()}`,
  vehicleId: 'vehicle-a',
  ownerId: 'owner-a',
  reportDate: '2026-05-20',
  companyName: 'Ekspertiz Merkezi',
  overallNote: null,
  reportNumber: null,
  attachmentPath: null,
  attachments: [],
  createdAt: '2026-05-20T12:00:00Z',
  updatedAt: '2026-05-20T12:00:00Z',
  ...overrides,
});

function snapshot(input: Partial<Parameters<typeof buildVehicleIntelligence>[0]> = {}) {
  return buildVehicleIntelligence({ vehicle: vehicle(), records: [], documents: [], expertiseReports: [], reminders: [], now: anchor, ...input });
}

const codes = (value: ReturnType<typeof snapshot>) => value.signals.map((item) => item.code);

describe('vehicle intelligence foundation', () => {
  it('derives expired, expiring inspection and insurance facts from normalized documents', () => {
    const result = snapshot({ documents: [
      document({ id: 'expired', expiryDate: '2026-08-01' }),
      document({ id: 'inspection', documentType: 'inspection', expiryDate: '2026-08-20' }),
      document({ id: 'insurance', expiryDate: '2026-08-24' }),
    ] });
    expect(result.facts.documents).toMatchObject({ expiredCount: 1, expiringSoonCount: 2, inspectionDaysUntil: 6, insuranceDaysUntil: 10 });
    expect(codes(result)).toEqual(expect.arrayContaining(['document_expired', 'document_expiring_soon', 'inspection_expiring_soon', 'insurance_expiring_soon']));
  });

  it('represents an applicable document with no expiry as missing information instead of expired', () => {
    const result = snapshot({ documents: [document({ expiryDate: null })] });
    expect(result.facts.documents.missingExpiryCount).toBe(1);
    expect(codes(result)).toContain('document_expiry_unknown');
    expect(codes(result)).not.toContain('document_expired');
  });

  it('keeps the newest valid expertise fact without reading attachment contents', () => {
    const result = snapshot({ expertiseReports: [expertise({ reportDate: '2025-01-01' }), expertise({ reportDate: '2026-06-01' })] });
    expect(result.facts.expertise).toEqual({ latestDate: '2026-06-01', ageDays: 74, hasReport: true });
  });

  it('calculates last-maintenance date, odometer, elapsed days and kilometres', () => {
    const result = snapshot({ records: [
      record({ id: 'old', recordType: 'maintenance', recordDate: '2026-04-01', kilometer: 45_000, amount: 1_000 }),
      record({ id: 'latest', recordType: 'maintenance', recordDate: '2026-08-01', kilometer: 49_000, amount: 2_000 }),
    ] });
    expect(result.facts.maintenance).toMatchObject({ lastDate: '2026-08-01', lastOdometer: 49_000, daysSinceLast: 13, kmSinceLast: 1_000, recentCount: 1, recentSpend: 2_000, highestRecentCost: 2_000 });
  });

  it('uses only existing maintenance reminders for due and overdue maintenance signals', () => {
    const result = snapshot({ reminders: [
      reminder({ dueDate: '2026-08-10' }),
      reminder({ id: 'soon', dueDate: '2026-08-18' }),
    ] });
    expect(codes(result)).toEqual(expect.arrayContaining(['maintenance_overdue', 'maintenance_due_soon', 'reminder_overdue', 'reminder_due_soon']));
  });

  it('does not invent a maintenance interval when no maintenance reminder or manufacturer schedule exists', () => {
    const result = snapshot({ records: [record({ recordType: 'maintenance', recordDate: '2026-08-01' })] });
    expect(codes(result)).not.toEqual(expect.arrayContaining(['maintenance_due_soon', 'maintenance_overdue']));
  });

  it('creates a long-time-since-maintenance signal only from an actual last maintenance event', () => {
    const result = snapshot({ records: [record({ recordType: 'maintenance', recordDate: '2025-01-01', kilometer: 40_000 })] });
    expect(codes(result)).toContain('long_time_since_maintenance');
  });

  it('derives fuel spend, litres, weighted price, consumption, cost per km and frequency when coverage is valid', () => {
    const result = snapshot({ records: [
      record({ id: 'one', recordDate: '2026-06-01', amount: 1_000, liters: 20, kilometer: 49_000 }),
      record({ id: 'two', recordDate: '2026-08-01', amount: 1_500, liters: 25, kilometer: 49_300 }),
    ] });
    expect(result.facts.fuel).toMatchObject({ recentSpend: 2_500, totalLiters: 45, averagePricePerLiter: 2_500 / 45, averageConsumption: 15, costPerKm: 2_500 / 300, refuelFrequency: 2 });
  });

  it('emits insufficient fuel and distance data rather than a false poor health score for sparse legacy records', () => {
    const result = snapshot({ records: [record({ liters: null, kilometer: null })] });
    expect(codes(result)).toEqual(expect.arrayContaining(['insufficient_fuel_data', 'insufficient_distance_data']));
    expect(result.scores.fuelEfficiencyHealth).toEqual({ value: null, confidence: 0 });
    expect(result.scores.overallVehicleHealth.value).not.toBe(0);
  });

  it('detects a sustained consumption increase from equivalent three-month windows', () => {
    const result = snapshot({ records: [
      record({ id: 'prior-a', recordDate: '2026-03-01', kilometer: 47_000, liters: 10, amount: 400 }),
      record({ id: 'prior-b', recordDate: '2026-05-01', kilometer: 47_200, liters: 10, amount: 400 }),
      record({ id: 'current-a', recordDate: '2026-06-01', kilometer: 49_000, liters: 20, amount: 1_000 }),
      record({ id: 'current-b', recordDate: '2026-08-01', kilometer: 49_200, liters: 20, amount: 1_000 }),
    ] });
    expect(result.trends.fuelConsumptionChangePercent).toBe(100);
    expect(codes(result)).toContain('fuel_consumption_increasing');
  });

  it('detects consumption decrease without presenting it as a mechanical diagnosis', () => {
    const result = snapshot({ records: [
      record({ id: 'prior-a', recordDate: '2026-03-01', kilometer: 47_000, liters: 20, amount: 800 }),
      record({ id: 'prior-b', recordDate: '2026-05-01', kilometer: 47_200, liters: 20, amount: 800 }),
      record({ id: 'current-a', recordDate: '2026-06-01', kilometer: 49_000, liters: 10, amount: 500 }),
      record({ id: 'current-b', recordDate: '2026-08-01', kilometer: 49_200, liters: 10, amount: 500 }),
    ] });
    const signal = result.signals.find((item) => item.code === 'fuel_consumption_decreasing');
    expect(signal?.facts.changePercent).toBe(-50);
    expect(signal?.explanationKey).toBe('fuel_consumption_decreasing');
  });

  it('detects a meaningful fuel-cost increase from valid fuel records', () => {
    const result = snapshot({ records: [
      record({ id: 'prior-a', recordDate: '2026-03-01', kilometer: 47_000, liters: 10, amount: 500 }),
      record({ id: 'prior-b', recordDate: '2026-05-01', kilometer: 47_200, liters: 10, amount: 500 }),
      record({ id: 'current-a', recordDate: '2026-06-01', kilometer: 49_000, liters: 10, amount: 1_000 }),
      record({ id: 'current-b', recordDate: '2026-08-01', kilometer: 49_200, liters: 10, amount: 1_000 }),
    ] });
    expect(result.trends.fuelCostChangePercent).toBe(100);
    expect(codes(result)).toContain('fuel_cost_increasing');
  });

  it('creates cost trend and maintenance-spike signals from comparison data', () => {
    const result = snapshot({ records: [
      record({ id: 'prior', recordDate: '2026-05-01', amount: 1_000, recordType: 'maintenance', kilometer: 48_000 }),
      record({ id: 'current', recordDate: '2026-08-01', amount: 2_000, recordType: 'maintenance', kilometer: 49_000 }),
      record({ id: 'current-fuel', recordDate: '2026-08-05', amount: 1_000, kilometer: 49_100 }),
    ] });
    expect(codes(result)).toEqual(expect.arrayContaining(['recorded_cost_increasing', 'maintenance_cost_spike']));
  });

  it('keeps TASK-016 historical lower odometer values out of derived distance', () => {
    const result = snapshot({ records: [
      record({ id: 'high', recordDate: '2026-07-01', kilometer: 49_500 }),
      record({ id: 'historical', recordDate: '2026-08-01', kilometer: 48_000 }),
    ] });
    expect(result.facts.currentOdometer).toBe(50_000);
    expect(result.dataQuality.hasSufficientDistanceData).toBe(false);
    expect(codes(result)).toContain('insufficient_distance_data');
  });

  it('filters every input to the requested vehicle before calculating facts, signals and scores', () => {
    const result = snapshot({ records: [record({ vehicleId: 'vehicle-b', amount: 99_999, kilometer: 1 }), record({ amount: 100, kilometer: 49_000 }), record({ id: 'own', amount: 100, kilometer: 49_100 })], documents: [document({ vehicleId: 'vehicle-b', expiryDate: '2026-01-01' })] });
    expect(result.facts.cost.recordedCost).toBe(200);
    expect(result.facts.documents.expiredCount).toBe(0);
  });

  it('bounds every available domain score and computes a weighted overall score from available domains only', () => {
    const result = snapshot({ documents: [document({ expiryDate: '2026-08-01' })], records: [record({ recordType: 'maintenance', recordDate: '2025-01-01', kilometer: 45_000 })] });
    Object.values(result.scores).forEach((score) => {
      expect(score.value === null || (score.value >= 0 && score.value <= 100)).toBe(true);
    });
    expect(result.scores.overallVehicleHealth.value).not.toBeNull();
  });

  it('lowers only the available domain score for a high-severity document condition', () => {
    const result = snapshot({ documents: [document({ expiryDate: '2026-08-01' })] });
    expect(result.scores.documentHealth.value).toBeLessThan(100);
    expect(result.scores.maintenanceHealth.value).toBeNull();
    expect(result.scores.fuelEfficiencyHealth.value).toBeNull();
  });

  it('orders high-priority, explainable signals before low-confidence data-quality notes', () => {
    const result = snapshot({ documents: [document({ expiryDate: '2026-08-01' })], records: [record({ liters: null, kilometer: null })] });
    expect(result.signals[0]?.code).toBe('document_expired');
    expect(result.signals.at(-1)?.domain).toBe('data_quality');
  });

  it('is deterministic for identical input and a fixed generation time', () => {
    const input = { records: [record({ id: 'fixed', amount: 500 })], documents: [document({ id: 'fixed-doc', expiryDate: '2026-09-01' })] };
    expect(snapshot(input)).toEqual(snapshot(input));
  });

  it('builds a minimal assistant context with normalized facts and no raw records, OCR or attachments', () => {
    const result = snapshot({ records: [record({ description: 'private note that must not leave the domain' })], documents: [document({ note: 'private document note' })] });
    const context = buildVehicleAssistantContext(result);
    expect(context.highPrioritySignals).toEqual(result.signals.slice(0, 5));
    expect(context.vehicle.currentOdometer).toBe(result.facts.currentOdometer);
    expect(context.trends).toEqual(result.trends);
    expect(context.dataQuality.availableScoreDomains).toBe(result.dataQuality.availableScoreDomains.join(','));
    expect(context).not.toHaveProperty('records');
    expect(JSON.stringify(context)).not.toContain('private note');
    expect(JSON.stringify(context)).not.toContain('attachments');
  });
});
