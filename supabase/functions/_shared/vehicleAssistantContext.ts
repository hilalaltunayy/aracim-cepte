import type { VehicleAssistantContext } from '../../../src/features/vehicleAssistant/domain/assistantContract.ts';

type SupabaseLike = { from: (table: string) => any };

const DAY_MS = 86_400_000;

function finiteNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateValue(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(from: Date, to: Date | null): number | null {
  return to ? Math.round((to.getTime() - from.getTime()) / DAY_MS) : null;
}

function percentChange(current: number, previous: number): number | null {
  return previous > 0 ? Math.round(((current - previous) / previous) * 1_000) / 10 : null;
}

function within(value: unknown, start: Date, end: Date): boolean {
  const date = dateValue(value);
  return Boolean(date && date >= start && date < end);
}

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function sum(rows: readonly Record<string, unknown>[], key: string): number {
  return rows.reduce((total, row) => total + (finiteNumber(row[key]) ?? 0), 0);
}

function latestByDate(rows: readonly Record<string, unknown>[], key: string) {
  return (
    [...rows].sort((left, right) =>
      String(right[key] ?? '').localeCompare(String(left[key] ?? '')),
    )[0] ?? null
  );
}

export interface LoadedVehicleAssistantContext {
  context: VehicleAssistantContext;
  ownerVerified: true;
}

/**
 * Loads only purpose-limited structured columns through the caller's RLS-scoped client.
 * Plate, title/note text, document numbers, OCR and attachment metadata are never selected.
 */
export async function loadVehicleAssistantContext(
  client: SupabaseLike,
  vehicleId: string,
  userId: string,
  now = new Date(),
): Promise<LoadedVehicleAssistantContext | null> {
  const vehicleResult = await client
    .from('vehicles')
    .select('id,owner_id,brand,model,year,current_km')
    .eq('id', vehicleId)
    .eq('owner_id', userId)
    .is('archived_at', null)
    .maybeSingle();
  if (vehicleResult.error || !vehicleResult.data || vehicleResult.data.owner_id !== userId)
    return null;

  const [recordResult, documentResult, expertiseResult, reminderResult] = await Promise.all([
    client
      .from('vehicle_records')
      .select('record_type,amount,record_date,kilometer,liters')
      .eq('vehicle_id', vehicleId)
      .eq('owner_id', userId),
    client
      .from('vehicle_documents')
      .select('document_type,issue_date,expiry_date')
      .eq('vehicle_id', vehicleId)
      .eq('owner_id', userId),
    client
      .from('expertise_reports')
      .select('report_date')
      .eq('vehicle_id', vehicleId)
      .eq('owner_id', userId),
    client
      .from('reminders')
      .select('reminder_type,due_date,due_kilometer,completed')
      .eq('vehicle_id', vehicleId)
      .eq('owner_id', userId),
  ]);
  if (recordResult.error || documentResult.error || expertiseResult.error || reminderResult.error) {
    throw new Error('CONTEXT_LOAD_FAILED');
  }

  const vehicle = vehicleResult.data as Record<string, unknown>;
  const records = (recordResult.data ?? []) as Record<string, unknown>[];
  const documents = (documentResult.data ?? []) as Record<string, unknown>[];
  const expertise = (expertiseResult.data ?? []) as Record<string, unknown>[];
  const reminders = (reminderResult.data ?? []) as Record<string, unknown>[];
  const fuel = records.filter((row) => row.record_type === 'fuel');
  const maintenance = records.filter((row) => row.record_type === 'maintenance');
  const today = startOfUtcDay(now);
  const recentStart = new Date(today.getTime() - 90 * DAY_MS);
  const previousStart = new Date(today.getTime() - 180 * DAY_MS);
  const recent = records.filter((row) =>
    within(row.record_date, recentStart, new Date(today.getTime() + DAY_MS)),
  );
  const previous = records.filter((row) => within(row.record_date, previousStart, recentStart));
  const recentFuel = fuel.filter((row) =>
    within(row.record_date, recentStart, new Date(today.getTime() + DAY_MS)),
  );
  const previousFuel = fuel.filter((row) => within(row.record_date, previousStart, recentStart));
  const recentMaintenance = maintenance.filter((row) =>
    within(row.record_date, recentStart, new Date(today.getTime() + DAY_MS)),
  );
  const previousMaintenance = maintenance.filter((row) =>
    within(row.record_date, previousStart, recentStart),
  );
  const latestMaintenance = latestByDate(maintenance, 'record_date');
  const latestExpertise = latestByDate(expertise, 'report_date');
  const currentOdometer = finiteNumber(vehicle.current_km) ?? 0;
  const lastMaintenanceOdometer = finiteNumber(latestMaintenance?.kilometer);
  const lastMaintenanceDate = dateValue(latestMaintenance?.record_date);
  const validFuel = fuel.filter(
    (row) => (finiteNumber(row.liters) ?? 0) > 0 && finiteNumber(row.kilometer) !== null,
  );
  const fuelOdometers = validFuel
    .map((row) => finiteNumber(row.kilometer))
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);
  const distanceKm =
    fuelOdometers.length >= 2 ? fuelOdometers[fuelOdometers.length - 1] - fuelOdometers[0] : null;
  const totalLiters = sum(fuel, 'liters');
  const totalFuelSpend = sum(fuel, 'amount');
  const consumption =
    distanceKm && distanceKm > 0 && totalLiters > 0
      ? Math.round((totalLiters / distanceKm) * 10_000) / 100
      : null;

  const documentDays = (type: string) => {
    const target = documents
      .filter((row) => row.document_type === type)
      .map((row) => daysBetween(today, dateValue(row.expiry_date)))
      .filter((value): value is number => value !== null)
      .sort((left, right) => left - right)[0];
    return target ?? null;
  };
  const expiredDocuments = documents.filter((row) => {
    const days = daysBetween(today, dateValue(row.expiry_date));
    return days !== null && days < 0;
  }).length;
  const expiringDocuments = documents.filter((row) => {
    const days = daysBetween(today, dateValue(row.expiry_date));
    return days !== null && days >= 0 && days <= 30;
  }).length;
  const openReminders = reminders.filter((row) => row.completed !== true);
  const overdueReminders = openReminders.filter((row) => {
    const dateDays = daysBetween(today, dateValue(row.due_date));
    const dueKm = finiteNumber(row.due_kilometer);
    return (dateDays !== null && dateDays < 0) || (dueKm !== null && dueKm < currentOdometer);
  });
  const dueSoonReminders = openReminders.filter((row) => {
    const dateDays = daysBetween(today, dateValue(row.due_date));
    const dueKm = finiteNumber(row.due_kilometer);
    return (
      (dateDays !== null && dateDays >= 0 && dateDays <= 7) ||
      (dueKm !== null && dueKm >= currentOdometer && dueKm - currentOdometer <= 1_000)
    );
  });

  const signals: VehicleAssistantContext['highPrioritySignals'] = [];
  if (expiredDocuments)
    signals.push({
      code: 'document_expired',
      domain: 'documents',
      severity: 'high',
      confidence: 1,
      facts: { count: expiredDocuments },
    });
  if (expiringDocuments)
    signals.push({
      code: 'document_expiring_soon',
      domain: 'documents',
      severity: 'medium',
      confidence: 1,
      facts: { count: expiringDocuments },
    });
  if (overdueReminders.some((row) => row.reminder_type === 'periodic_maintenance'))
    signals.push({
      code: 'maintenance_overdue',
      domain: 'maintenance',
      severity: 'high',
      confidence: 1,
      facts: { count: overdueReminders.length },
    });
  if (dueSoonReminders.some((row) => row.reminder_type === 'periodic_maintenance'))
    signals.push({
      code: 'maintenance_due_soon',
      domain: 'maintenance',
      severity: 'medium',
      confidence: 1,
      facts: { count: dueSoonReminders.length },
    });
  if (overdueReminders.length)
    signals.push({
      code: 'reminder_overdue',
      domain: 'reminders',
      severity: 'high',
      confidence: 1,
      facts: { count: overdueReminders.length },
    });
  if (validFuel.length < 4)
    signals.push({
      code: 'insufficient_fuel_data',
      domain: 'data_quality',
      severity: 'info',
      confidence: 1,
      facts: { validFuelRecords: validFuel.length },
    });
  if (distanceKm === null || distanceKm <= 0)
    signals.push({
      code: 'insufficient_distance_data',
      domain: 'data_quality',
      severity: 'info',
      confidence: 1,
      facts: { knownOdometerRecords: fuelOdometers.length },
    });

  const context: VehicleAssistantContext = {
    vehicleId,
    generatedAt: now.toISOString(),
    vehicle: {
      displayName: `${String(vehicle.brand ?? '')} ${String(vehicle.model ?? '')}`.trim(),
      year: finiteNumber(vehicle.year),
      currentOdometer,
    },
    maintenanceFacts: {
      lastDate:
        typeof latestMaintenance?.record_date === 'string' ? latestMaintenance.record_date : null,
      lastOdometer: lastMaintenanceOdometer,
      daysSinceLast: lastMaintenanceDate
        ? Math.max(0, -daysBetween(today, lastMaintenanceDate)!)
        : null,
      kmSinceLast:
        lastMaintenanceOdometer === null
          ? null
          : Math.max(0, currentOdometer - lastMaintenanceOdometer),
      recentCount: recentMaintenance.length,
      recentSpend: sum(recentMaintenance, 'amount'),
    },
    documentFacts: {
      expiredCount: expiredDocuments,
      expiringSoonCount: expiringDocuments,
      inspectionDaysUntil: documentDays('inspection'),
      insuranceDaysUntil: documentDays('traffic_insurance'),
      cascoDaysUntil: documentDays('comprehensive_insurance'),
      missingExpiryCount: documents.filter((row) => !row.expiry_date).length,
    },
    expertiseFacts: {
      hasReport: Boolean(latestExpertise),
      latestDate:
        typeof latestExpertise?.report_date === 'string' ? latestExpertise.report_date : null,
      ageDays: latestExpertise
        ? Math.max(0, -daysBetween(today, dateValue(latestExpertise.report_date))!)
        : null,
    },
    fuelFacts: {
      recentSpend: sum(recentFuel, 'amount'),
      totalLiters: totalLiters > 0 ? Math.round(totalLiters * 100) / 100 : null,
      averagePricePerLiter:
        totalLiters > 0 ? Math.round((totalFuelSpend / totalLiters) * 100) / 100 : null,
      averageConsumption: consumption,
      costPerKm:
        distanceKm && distanceKm > 0 ? Math.round((totalFuelSpend / distanceKm) * 100) / 100 : null,
      validRecords: validFuel.length,
    },
    costFacts: {
      recordedCost: sum(recent, 'amount'),
      fuelSpend: sum(recentFuel, 'amount'),
      maintenanceSpend: sum(recentMaintenance, 'amount'),
      costPerKm:
        distanceKm && distanceKm > 0
          ? Math.round((sum(recent, 'amount') / distanceKm) * 100) / 100
          : null,
    },
    reminderFacts: {
      overdueCount: overdueReminders.length,
      dueWithin7Days: dueSoonReminders.length,
    },
    trends: {
      fuelCostChangePercent: percentChange(sum(recentFuel, 'amount'), sum(previousFuel, 'amount')),
      maintenanceCostChangePercent: percentChange(
        sum(recentMaintenance, 'amount'),
        sum(previousMaintenance, 'amount'),
      ),
      recordedCostChangePercent: percentChange(sum(recent, 'amount'), sum(previous, 'amount')),
      fuelConsumptionChangePercent: null,
    },
    highPrioritySignals: signals.slice(0, 5),
    dataQuality: {
      validFuelRecords: validFuel.length,
      knownOdometerRecords: fuelOdometers.length,
      hasSufficientFuelTrendData: validFuel.length >= 4,
      hasSufficientDistanceData: distanceKm !== null && distanceKm > 0,
    },
  };
  return { context, ownerVerified: true };
}
