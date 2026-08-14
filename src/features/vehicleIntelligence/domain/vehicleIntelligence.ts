import type {
  ExpertiseReport,
  Reminder,
  Vehicle,
  VehicleDocument,
  VehicleRecord,
} from '@/domain/entities';
import { getDocumentStatus } from '@/features/documents/domain/documentStatus';
import { buildVehicleReport } from '@/features/reports/domain/vehicleReports';
import { getReminderStatus } from '@/shared/utils/analytics';
import { parseDateOnly, toDateOnly } from '@/shared/utils/format';
import { VEHICLE_INTELLIGENCE_CONFIG as config } from '../config/intelligenceConfig';

export type IntelligenceDomain = 'documents' | 'maintenance' | 'fuel' | 'cost' | 'reminders' | 'data_quality';
export type IntelligenceSeverity = 'info' | 'low' | 'medium' | 'high';

export interface VehicleIntelligenceSignal {
  code:
    | 'document_expired'
    | 'document_expiring_soon'
    | 'inspection_expiring_soon'
    | 'insurance_expiring_soon'
    | 'document_expiry_unknown'
    | 'maintenance_due_soon'
    | 'maintenance_overdue'
    | 'long_time_since_maintenance'
    | 'fuel_consumption_increasing'
    | 'fuel_consumption_decreasing'
    | 'fuel_cost_increasing'
    | 'recorded_cost_increasing'
    | 'maintenance_cost_spike'
    | 'reminder_overdue'
    | 'reminder_due_soon'
    | 'insufficient_fuel_data'
    | 'insufficient_distance_data';
  domain: IntelligenceDomain;
  severity: IntelligenceSeverity;
  confidence: number;
  facts: Readonly<Record<string, string | number | null>>;
  explanationKey: string;
  generatedAt: string;
}

export interface IntelligenceScore {
  value: number | null;
  confidence: number;
}

export interface VehicleIntelligenceSnapshot {
  vehicleId: string;
  generatedAt: string;
  facts: {
    currentOdometer: number;
    documents: {
      expiredCount: number;
      expiringSoonCount: number;
      inspectionDaysUntil: number | null;
      insuranceDaysUntil: number | null;
      cascoDaysUntil: number | null;
      missingExpiryCount: number;
    };
    expertise: { latestDate: string | null; ageDays: number | null; hasReport: boolean };
    maintenance: {
      lastDate: string | null;
      lastOdometer: number | null;
      daysSinceLast: number | null;
      kmSinceLast: number | null;
      recentCount: number;
      recentSpend: number;
      highestRecentCost: number | null;
      partsCost: number | null;
      laborCost: number | null;
    };
    fuel: {
      recentSpend: number;
      totalLiters: number | null;
      averagePricePerLiter: number | null;
      averageConsumption: number | null;
      costPerKm: number | null;
      refuelFrequency: number | null;
    };
    cost: { recordedCost: number; costPerKm: number | null; previousPeriodChange: number | null };
    reminders: {
      overdueCount: number;
      dueWithin7Days: number;
      dueWithin30Days: number;
      nearestDueDate: string | null;
    };
  };
  trends: {
    fuelConsumptionChangePercent: number | null;
    fuelCostChangePercent: number | null;
    recordedCostChangePercent: number | null;
    maintenanceCostChangePercent: number | null;
  };
  signals: VehicleIntelligenceSignal[];
  scores: {
    overallVehicleHealth: IntelligenceScore;
    maintenanceHealth: IntelligenceScore;
    documentHealth: IntelligenceScore;
    fuelEfficiencyHealth: IntelligenceScore;
    costHealth: IntelligenceScore;
  };
  dataQuality: {
    validFuelRecords: number;
    knownOdometerRecords: number;
    hasSufficientFuelTrendData: boolean;
    hasSufficientDistanceData: boolean;
    availableScoreDomains: IntelligenceDomain[];
  };
}

export interface VehicleIntelligenceInput {
  vehicle: Pick<Vehicle, 'id' | 'brand' | 'model' | 'year' | 'currentKm'>;
  records: readonly VehicleRecord[];
  documents: readonly VehicleDocument[];
  expertiseReports: readonly ExpertiseReport[];
  reminders: readonly Reminder[];
  now?: Date;
}

const dayDifference = (from: Date, to: Date): number | null => {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Number.isNaN(end.getTime()) ? null : Math.round((end.getTime() - start.getTime()) / 86_400_000);
};

const positive = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

const clampConfidence = (value: number) => Math.max(0, Math.min(1, value));

function confidenceForRecords(count: number, expected = 4) {
  return clampConfidence(count / expected);
}

function trendSeverity(percent: number, increasing = true): IntelligenceSeverity {
  const magnitude = Math.abs(percent);
  if (magnitude >= config.trend.strongPercent) return 'high';
  if (magnitude >= config.trend.meaningfulPercent) return 'medium';
  return increasing ? 'low' : 'info';
}

function signal(
  generatedAt: string,
  code: VehicleIntelligenceSignal['code'],
  domain: IntelligenceDomain,
  severity: IntelligenceSeverity,
  confidence: number,
  facts: VehicleIntelligenceSignal['facts'],
): VehicleIntelligenceSignal {
  return { code, domain, severity, confidence: clampConfidence(confidence), facts, explanationKey: code, generatedAt };
}

function sortedByDate<T extends { recordDate?: string | null; reportDate?: string | null; createdAt: string }>(items: readonly T[]) {
  return [...items].sort((a, b) => {
    const aDate = a.recordDate ?? a.reportDate ?? a.createdAt;
    const bDate = b.recordDate ?? b.reportDate ?? b.createdAt;
    return bDate.localeCompare(aDate);
  });
}

function documentDays(document: VehicleDocument, now: Date): number | null {
  const expiry = document.expiryDate ? parseDateOnly(document.expiryDate) : null;
  return expiry ? dayDifference(now, expiry) : null;
}

function dateForReminder(reminder: Reminder): string | null {
  return reminder.dueDate && parseDateOnly(reminder.dueDate) ? reminder.dueDate : null;
}

function priorities(signalValue: VehicleIntelligenceSignal): number {
  const domainPriority: Record<IntelligenceDomain, number> = {
    documents: 6, maintenance: 5, reminders: 4, fuel: 3, cost: 2, data_quality: 1,
  };
  const severityPriority: Record<IntelligenceSeverity, number> = { high: 40, medium: 30, low: 20, info: 10 };
  return severityPriority[signalValue.severity] + domainPriority[signalValue.domain];
}

function scoreForDomain(
  domain: IntelligenceDomain,
  signals: readonly VehicleIntelligenceSignal[],
  available: boolean,
  confidence: number,
): IntelligenceScore {
  if (!available) return { value: null, confidence: 0 };
  const penalty = signals.filter((item) => item.domain === domain)
    .reduce((total, item) => total + config.severityPenalty[item.severity] * item.confidence, 0);
  return { value: Math.max(0, Math.min(100, Math.round(100 - penalty))), confidence: clampConfidence(confidence) };
}

function overallScore(scores: VehicleIntelligenceSnapshot['scores']) {
  const weighted = [
    ['maintenance', scores.maintenanceHealth],
    ['documents', scores.documentHealth],
    ['fuelEfficiency', scores.fuelEfficiencyHealth],
    ['cost', scores.costHealth],
  ] as const;
  const available = weighted.filter(([, score]) => score.value !== null);
  if (!available.length) return { value: null, confidence: 0 };
  const denominator = available.reduce((sum, [key]) => sum + config.scoreWeights[key], 0);
  const value = available.reduce((sum, [key, score]) => sum + (score.value ?? 0) * config.scoreWeights[key], 0) / denominator;
  const confidence = available.reduce((sum, [key, score]) => sum + score.confidence * config.scoreWeights[key], 0) / denominator;
  return { value: Math.round(value), confidence: clampConfidence(confidence) };
}

export function buildVehicleIntelligence(input: VehicleIntelligenceInput): VehicleIntelligenceSnapshot {
  const now = input.now ?? new Date();
  const generatedAt = now.toISOString();
  const today = toDateOnly(now);
  const records = input.records.filter((record) => record.vehicleId === input.vehicle.id);
  const documents = input.documents.filter((document) => document.vehicleId === input.vehicle.id);
  const expertiseReports = input.expertiseReports.filter((report) => report.vehicleId === input.vehicle.id);
  const reminders = input.reminders.filter((reminder) => reminder.vehicleId === input.vehicle.id);
  const report = buildVehicleReport([...records], input.vehicle, config.recentReportPeriod, now);
  const maintenance = sortedByDate(records.filter((record) => record.recordType === 'maintenance'));
  const lastMaintenance = maintenance[0] ?? null;
  const lastDate = lastMaintenance?.recordDate ?? null;
  const lastOdometer = lastMaintenance?.kilometer ?? null;
  const parsedLastMaintenanceDate = lastDate ? parseDateOnly(lastDate) : null;
  const maintenanceDays = parsedLastMaintenanceDate ? dayDifference(parsedLastMaintenanceDate, now) : null;
  const maintenanceKm = lastOdometer !== null && input.vehicle.currentKm >= lastOdometer
    ? input.vehicle.currentKm - lastOdometer : null;
  const documentStates = documents.map((document) => ({ document, days: documentDays(document, now), status: getDocumentStatus(document.expiryDate, today) }));
  const expired = documentStates.filter((item) => item.status === 'expired');
  const expiring = documentStates.filter((item) => item.status === 'expiring_soon');
  const missingExpiry = documentStates.filter((item) => ['traffic_insurance', 'comprehensive_insurance', 'inspection'].includes(item.document.documentType) && item.days === null);
  const daysByType = (type: VehicleDocument['documentType']) => {
    const values = documentStates
      .filter((item) => item.document.documentType === type && item.days !== null)
      .map((item) => item.days as number)
      .sort((left, right) => left - right);
    return values.find((value) => value >= 0) ?? values[0] ?? null;
  };
  const latestExpertise = sortedByDate(expertiseReports)[0] ?? null;
  const expertiseDate = latestExpertise?.reportDate ?? null;
  const expertiseAge = expertiseDate ? dayDifference(parseDateOnly(expertiseDate) ?? now, now) : null;
  const activeReminders = reminders.filter((reminder) => !reminder.completed);
  const reminderStates = activeReminders.map((reminder) => ({ reminder, status: getReminderStatus(reminder, input.vehicle.currentKm, today) }));
  const overdueReminders = reminderStates.filter((item) => ['date_overdue', 'mileage_due', 'mileage_overdue', 'both_overdue'].includes(item.status));
  const dueSoonReminders = reminderStates.filter((item) => item.status === 'approaching' || item.status === 'today');
  const datedReminders = activeReminders.map((reminder) => dateForReminder(reminder)).filter((date): date is string => Boolean(date)).sort();
  const dueWithin = (days: number) => datedReminders.filter((date) => {
    const parsed = parseDateOnly(date); const remaining = parsed ? dayDifference(now, parsed) : null;
    return remaining !== null && remaining >= 0 && remaining <= days;
  }).length;
  const validFuel = records.filter((record) => record.recordType === 'fuel' && positive(record.liters) !== null && record.kilometer !== null);
  const knownOdometer = records.filter((record) => record.kilometer !== null && Number.isFinite(record.kilometer));
  const hasFuelTrend = validFuel.length >= config.minimumFuelTrendSamples && report.consumption !== null && report.comparisons.consumption.previousValue > 0;
  const trends = {
    fuelConsumptionChangePercent: hasFuelTrend ? report.comparisons.consumption.percentage : null,
    fuelCostChangePercent: report.comparisons.fuel.percentage,
    recordedCostChangePercent: report.comparisons.total.percentage,
    maintenanceCostChangePercent: report.comparisons.maintenance.percentage,
  };
  const facts: VehicleIntelligenceSnapshot['facts'] = {
    currentOdometer: input.vehicle.currentKm,
    documents: { expiredCount: expired.length, expiringSoonCount: expiring.length, inspectionDaysUntil: daysByType('inspection'), insuranceDaysUntil: daysByType('traffic_insurance'), cascoDaysUntil: daysByType('comprehensive_insurance'), missingExpiryCount: missingExpiry.length },
    expertise: { latestDate: expertiseDate, ageDays: expertiseAge, hasReport: Boolean(latestExpertise) },
    maintenance: { lastDate, lastOdometer, daysSinceLast: maintenanceDays, kmSinceLast: maintenanceKm, recentCount: report.maintenanceCount, recentSpend: report.maintenanceCost, highestRecentCost: report.highestMaintenance?.amount ?? null, partsCost: report.partsCost, laborCost: report.laborCost },
    fuel: { recentSpend: report.fuelCost, totalLiters: report.fuelLiters, averagePricePerLiter: report.averageFuelPrice, averageConsumption: report.consumption, costPerKm: report.fuelCostPerKm, refuelFrequency: report.refuelFrequency },
    cost: { recordedCost: report.totalCost, costPerKm: report.costPerKm, previousPeriodChange: report.comparisons.total.percentage },
    reminders: { overdueCount: overdueReminders.length, dueWithin7Days: dueWithin(config.reminderDueSoonDays), dueWithin30Days: dueWithin(30), nearestDueDate: datedReminders[0] ?? null },
  };
  const signals: VehicleIntelligenceSignal[] = [];
  if (expired.length) signals.push(signal(generatedAt, 'document_expired', 'documents', 'high', confidenceForRecords(expired.length, 2), { count: expired.length },));
  if (expiring.length) signals.push(signal(generatedAt, 'document_expiring_soon', 'documents', 'medium', confidenceForRecords(expiring.length, 2), { count: expiring.length },));
  if ((facts.documents.inspectionDaysUntil ?? Infinity) >= 0 && (facts.documents.inspectionDaysUntil ?? Infinity) <= config.documentExpiringSoonDays) signals.push(signal(generatedAt, 'inspection_expiring_soon', 'documents', 'medium', 1, { daysUntil: facts.documents.inspectionDaysUntil },));
  if ((facts.documents.insuranceDaysUntil ?? Infinity) >= 0 && (facts.documents.insuranceDaysUntil ?? Infinity) <= config.documentExpiringSoonDays) signals.push(signal(generatedAt, 'insurance_expiring_soon', 'documents', 'medium', 1, { daysUntil: facts.documents.insuranceDaysUntil },));
  if (missingExpiry.length) signals.push(signal(generatedAt, 'document_expiry_unknown', 'documents', 'info', confidenceForRecords(missingExpiry.length), { count: missingExpiry.length },));
  if (overdueReminders.some((item) => item.reminder.reminderType === 'periodic_maintenance')) signals.push(signal(generatedAt, 'maintenance_overdue', 'maintenance', 'high', 1, { count: overdueReminders.length },));
  if (dueSoonReminders.some((item) => item.reminder.reminderType === 'periodic_maintenance')) signals.push(signal(generatedAt, 'maintenance_due_soon', 'maintenance', 'medium', 1, { count: dueSoonReminders.length },));
  if (maintenanceDays !== null && maintenanceDays > config.maintenanceLongTimeDays) signals.push(signal(generatedAt, 'long_time_since_maintenance', 'maintenance', 'low', lastMaintenance ? 1 : 0, { daysSinceLast: maintenanceDays },));
  if (trends.fuelConsumptionChangePercent !== null && trends.fuelConsumptionChangePercent >= config.trend.informationPercent) signals.push(signal(generatedAt, 'fuel_consumption_increasing', 'fuel', trendSeverity(trends.fuelConsumptionChangePercent), confidenceForRecords(validFuel.length), { changePercent: trends.fuelConsumptionChangePercent },));
  if (trends.fuelConsumptionChangePercent !== null && trends.fuelConsumptionChangePercent <= -config.trend.informationPercent) signals.push(signal(generatedAt, 'fuel_consumption_decreasing', 'fuel', trendSeverity(trends.fuelConsumptionChangePercent, false), confidenceForRecords(validFuel.length), { changePercent: trends.fuelConsumptionChangePercent },));
  if (trends.fuelCostChangePercent !== null && trends.fuelCostChangePercent >= config.trend.meaningfulPercent) signals.push(signal(generatedAt, 'fuel_cost_increasing', 'fuel', trendSeverity(trends.fuelCostChangePercent), confidenceForRecords(validFuel.length), { changePercent: trends.fuelCostChangePercent },));
  if (trends.recordedCostChangePercent !== null && trends.recordedCostChangePercent >= config.trend.meaningfulPercent) signals.push(signal(generatedAt, 'recorded_cost_increasing', 'cost', trendSeverity(trends.recordedCostChangePercent), confidenceForRecords(records.length), { changePercent: trends.recordedCostChangePercent },));
  if (trends.maintenanceCostChangePercent !== null && trends.maintenanceCostChangePercent >= config.trend.costSpikePercent) signals.push(signal(generatedAt, 'maintenance_cost_spike', 'cost', 'high', confidenceForRecords(maintenance.length), { changePercent: trends.maintenanceCostChangePercent },));
  if (overdueReminders.length) signals.push(signal(generatedAt, 'reminder_overdue', 'reminders', 'high', confidenceForRecords(overdueReminders.length, 2), { count: overdueReminders.length },));
  if (dueSoonReminders.length) signals.push(signal(generatedAt, 'reminder_due_soon', 'reminders', 'medium', confidenceForRecords(dueSoonReminders.length, 2), { count: dueSoonReminders.length },));
  if (!hasFuelTrend) signals.push(signal(generatedAt, 'insufficient_fuel_data', 'data_quality', 'info', 1, { validFuelRecords: validFuel.length },));
  if (report.distanceKm === null) signals.push(signal(generatedAt, 'insufficient_distance_data', 'data_quality', 'info', 1, { knownOdometerRecords: knownOdometer.length },));
  signals.sort((left, right) => priorities(right) - priorities(left) || left.code.localeCompare(right.code));
  const maintenanceHealth = scoreForDomain('maintenance', signals, maintenance.length > 0 || overdueReminders.length > 0, confidenceForRecords(maintenance.length));
  const documentHealth = scoreForDomain('documents', signals, documents.length > 0, confidenceForRecords(documents.length));
  const fuelEfficiencyHealth = scoreForDomain('fuel', signals, hasFuelTrend, confidenceForRecords(validFuel.length));
  const costHealth = scoreForDomain('cost', signals, records.length > 0, confidenceForRecords(records.length));
  const scores: VehicleIntelligenceSnapshot['scores'] = {
    overallVehicleHealth: { value: null, confidence: 0 },
    maintenanceHealth,
    documentHealth,
    fuelEfficiencyHealth,
    costHealth,
  };
  scores.overallVehicleHealth = overallScore(scores);
  return { vehicleId: input.vehicle.id, generatedAt, facts, trends, signals, scores, dataQuality: { validFuelRecords: validFuel.length, knownOdometerRecords: knownOdometer.length, hasSufficientFuelTrendData: hasFuelTrend, hasSufficientDistanceData: report.distanceKm !== null, availableScoreDomains: (['maintenance', 'documents', 'fuel', 'cost'] as const).filter((domain) => ({ maintenance: maintenanceHealth, documents: documentHealth, fuel: fuelEfficiencyHealth, cost: costHealth })[domain].value !== null) } };
}
