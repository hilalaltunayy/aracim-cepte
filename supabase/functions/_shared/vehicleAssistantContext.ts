import type {
  AssistantRetrievalStatus,
  BodyConditionContext,
  BodyConditionPanel,
  VehicleAssistantContext,
  VehicleAssistantPrivateFacts,
} from '../../../src/features/vehicleAssistant/domain/assistantContract.ts';

type SupabaseLike = { from: (table: string) => any };

/**
 * Turkish labels for the two enum-backed profile columns.
 *
 * Duplicated from `src/features/vehicles/config/vehicleColors.ts` and
 * `src/shared/constants/labels.ts` because those modules import through the
 * `@/` alias, which Deno cannot resolve. `assistantVehicleLabels.test.ts` fails
 * if the app-side catalogs and these ever drift apart.
 */
export const COLOR_LABELS: Readonly<Record<string, string>> = {
  white: 'Beyaz',
  black: 'Siyah',
  gray: 'Gri',
  silver: 'Gümüş',
  red: 'Kırmızı',
  blue: 'Mavi',
  green: 'Yeşil',
  brown: 'Kahverengi',
  beige: 'Bej',
  gold: 'Altın',
  yellow: 'Sarı',
  orange: 'Turuncu',
};

export const FUEL_LABELS: Readonly<Record<string, string>> = {
  gasoline: 'Benzin',
  diesel: 'Dizel',
  lpg: 'LPG',
  electric: 'Elektrik',
  hybrid: 'Hibrit',
};

export const BODY_LABELS: Readonly<Record<string, string>> = {
  sedan: 'Sedan',
  hatchback: 'Hatchback',
  crossover: 'Crossover',
  suv: 'SUV',
  station_wagon: 'Station Wagon',
  coupe: 'Coupe',
  cabrio: 'Cabrio',
  roadster: 'Roadster',
  pickup: 'Pickup',
  mpv_minivan: 'MPV / Minivan',
  van: 'Van',
  sports_car: 'Sports Car',
  campervan: 'Campervan',
  minibus: 'Minibus',
};

/**
 * Body-panel keys → the Turkish names the Gövde durumu screen shows.
 *
 * Mirrored from `src/features/bodyCondition/schemas.ts`, which cannot be
 * imported here: it resolves through the `@/` alias and also carries SVG
 * geometry the assistant has no use for. `assistantVehicleLabels.test.ts` fails
 * if a panel is added to a body schema without being named here, so the model
 * can never receive a raw key like `cargo_bed`.
 */
export const BODY_PART_LABELS: Readonly<Record<string, string>> = {
  front_bumper: 'Ön tampon',
  hood: 'Kaput',
  left_front_fender: 'Sol ön çamurluk',
  right_front_fender: 'Sağ ön çamurluk',
  left_front_door: 'Sol ön kapı',
  right_front_door: 'Sağ ön kapı',
  left_rear_door: 'Sol arka kapı',
  right_rear_door: 'Sağ arka kapı',
  roof: 'Tavan',
  left_rear_quarter: 'Sol arka çamurluk',
  right_rear_quarter: 'Sağ arka çamurluk',
  trunk: 'Bagaj kapağı',
  cargo_bed: 'Kasa',
  tailgate: 'Arka kapak',
  rear_bumper: 'Arka tampon',
};

/**
 * Condition enum → Turkish label, mirrored from
 * `src/features/bodyCondition/config/bodyConditions.ts`. The catalog order is
 * also the display order, so `Boyalı + Hasarlı` always reads the same way it
 * does on the Gövde durumu screen.
 */
export const BODY_CONDITION_LABELS: Readonly<Record<string, string>> = {
  original: 'Orijinal',
  painted: 'Boyalı',
  locally_painted: 'Lokal Boyalı',
  replaced: 'Değişen',
  damaged: 'Hasarlı',
  unknown: 'Bilinmiyor',
};

/** Catalog order from the same config; drives the `A + B` rendering order. */
export const BODY_CONDITION_ORDER: readonly string[] = [
  'original',
  'painted',
  'locally_painted',
  'replaced',
  'damaged',
  'unknown',
];

function labelled(map: Readonly<Record<string, string>>, value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return map[trimmed] ?? trimmed;
}

function textValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

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

/**
 * Resolves one panel's effective conditions.
 *
 * Mirrors `resolvePersistedBodyConditions`: once the user has touched the
 * multi-select the child value rows are the truth — including an explicitly
 * empty set — and only an untouched legacy row falls back to the singleton
 * `condition` column.
 */
export function resolvePanelConditions(
  legacyCondition: unknown,
  storedValues: readonly string[],
  conditionSetInitialized: unknown,
): string[] {
  const source = conditionSetInitialized === true
    ? storedValues
    : typeof legacyCondition === 'string' && legacyCondition
      ? [legacyCondition]
      : [];
  const unique = new Set(source);
  return BODY_CONDITION_ORDER.filter((condition) => unique.has(condition));
}

/** `Boyalı + Hasarlı`, or the same "not entered" wording the screen shows. */
export function formatPanelState(conditions: readonly string[]): string {
  return conditions.length
    ? conditions.map((condition) => BODY_CONDITION_LABELS[condition] ?? condition).join(' + ')
    : 'Durum girilmedi';
}

export function buildBodyConditionContext(
  panelRows: readonly Record<string, unknown>[],
  valueRows: readonly Record<string, unknown>[],
): BodyConditionContext {
  const valuesByPanel = new Map<string, string[]>();
  for (const row of valueRows) {
    const parentId = textValue(row.body_part_condition_id);
    const condition = textValue(row.condition);
    if (!parentId || !condition) continue;
    const current = valuesByPanel.get(parentId) ?? [];
    current.push(condition);
    valuesByPanel.set(parentId, current);
  }

  const panels: BodyConditionPanel[] = panelRows.map((row) => {
    const id = textValue(row.id) ?? '';
    const partKey = textValue(row.part_key) ?? '';
    const conditions = resolvePanelConditions(
      row.condition,
      valuesByPanel.get(id) ?? [],
      row.condition_set_initialized,
    );
    return {
      partKey,
      part: BODY_PART_LABELS[partKey] ?? partKey,
      conditions: conditions.map((condition) => BODY_CONDITION_LABELS[condition] ?? condition),
      state: formatPanelState(conditions),
      recorded: conditions.length > 0,
      updatedAt: textValue(row.updated_at),
    };
  });
  panels.sort((left, right) => left.part.localeCompare(right.part, 'tr'));

  const withCondition = (condition: string) =>
    panels
      .filter((panel) =>
        panel.conditions.includes(BODY_CONDITION_LABELS[condition] ?? condition),
      )
      .map((panel) => panel.part);
  const recorded = panels.filter((panel) => panel.recorded);
  const lastUpdatedAt =
    recorded
      .map((panel) => panel.updatedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  return {
    hasDirectData: recorded.length > 0,
    recordedPanels: recorded.length,
    unrecordedPanels: panels.length - recorded.length,
    damagedPanels: withCondition('damaged'),
    paintedPanels: [...withCondition('painted'), ...withCondition('locally_painted')],
    replacedPanels: withCondition('replaced'),
    originalPanels: withCondition('original'),
    lastUpdatedAt,
    panels,
  };
}

export interface LoadedVehicleAssistantContext {
  context: VehicleAssistantContext;
  /**
   * Owner-identifying facts kept out of `context` so they are never serialised
   * into the provider prompt. Only the deterministic lookup path reads them.
   */
  privateFacts: VehicleAssistantPrivateFacts;
  ownerVerified: true;
}

/**
 * Loads only purpose-limited structured columns through the caller's RLS-scoped client.
 * Title/note text, document numbers, OCR and attachment metadata are never selected.
 *
 * The plate IS selected, but only into {@link LoadedVehicleAssistantContext.privateFacts};
 * it must never be copied into `context`, which is JSON-serialised into the
 * third-party model prompt in full.
 */
export async function loadVehicleAssistantContext(
  client: SupabaseLike,
  vehicleId: string,
  userId: string,
  now = new Date(),
  /** Drives Layer-2 detail selection only; never stored or logged. */
  question = '',
): Promise<LoadedVehicleAssistantContext | null> {
  const vehicleResult = await client
    .from('vehicles')
    .select('id,owner_id,brand,model,year,current_km,color,color_id,fuel_type,body_type,plate,updated_at')
    .eq('id', vehicleId)
    .eq('owner_id', userId)
    .is('archived_at', null)
    .maybeSingle();
  if (vehicleResult.error || !vehicleResult.data || vehicleResult.data.owner_id !== userId)
    return null;

  const [
    recordResult,
    documentResult,
    expertiseResult,
    reminderResult,
    bodyPanelResult,
    bodyValueResult,
  ] = await Promise.all([
    client
      .from('vehicle_records')
      .select('record_type,amount,record_date,kilometer,liters,service_type')
      .eq('vehicle_id', vehicleId)
      .eq('owner_id', userId),
    client
      .from('vehicle_documents')
      .select('document_type,issue_date,expiry_date')
      .eq('vehicle_id', vehicleId)
      .eq('owner_id', userId),
    client
      .from('expertise_reports')
      .select('report_date,company_name')
      .eq('vehicle_id', vehicleId)
      .eq('owner_id', userId),
    client
      .from('reminders')
      .select('reminder_type,due_date,due_kilometer,completed')
      .eq('vehicle_id', vehicleId)
      .eq('owner_id', userId),
    // The Gövde durumu screen's own structured state. Panel notes are free text
    // and are deliberately not selected; only the enum state and its date.
    client
      .from('body_part_conditions')
      .select('id,part_key,condition,condition_set_initialized,updated_at')
      .eq('vehicle_id', vehicleId)
      .eq('owner_id', userId),
    client
      .from('body_part_condition_values')
      .select('body_part_condition_id,condition')
      .eq('vehicle_id', vehicleId)
      .eq('owner_id', userId),
  ]);
  if (recordResult.error || documentResult.error || expertiseResult.error || reminderResult.error) {
    throw new Error('CONTEXT_LOAD_FAILED');
  }
  // A body-condition read failure is reported as `unavailable`, never as "no
  // panels recorded" — the difference between "you have not entered it" and
  // "we could not read it" is exactly what this issue is about.
  const bodyConditionFailed = Boolean(bodyPanelResult.error || bodyValueResult.error);

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
  const latestFuel = latestByDate(fuel, 'record_date');
  const bodyCondition = bodyConditionFailed
    ? null
    : buildBodyConditionContext(
        (bodyPanelResult.data ?? []) as Record<string, unknown>[],
        (bodyValueResult.data ?? []) as Record<string, unknown>[],
      );
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
      brand: textValue(vehicle.brand),
      model: textValue(vehicle.model),
      // `color_id` is the normalized taxonomy value; `color` is the legacy free
      // text kept for vehicles saved before TASK-018.
      color: labelled(COLOR_LABELS, vehicle.color_id) ?? textValue(vehicle.color),
      fuelType: labelled(FUEL_LABELS, vehicle.fuel_type),
      bodyType: labelled(BODY_LABELS, vehicle.body_type),
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
      reportCount: expertise.length,
      latestCompany: textValue(latestExpertise?.company_name),
    },
    bodyCondition: bodyCondition ?? undefined,
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
    retrieval: {
      vehicle: 'loaded',
      records: 'loaded',
      documents: 'loaded',
      expertise: 'loaded',
      reminders: 'loaded',
      bodyCondition: bodyConditionFailed
        ? ('unavailable' as AssistantRetrievalStatus)
        : ('loaded' as AssistantRetrievalStatus),
    },
    provenance: {
      // Panel state the user entered themselves outranks an expertise report for
      // "what condition is this panel in"; the report keeps its own entry and
      // date so a conflict is visible instead of silently merged.
      bodyCondition: {
        source: 'body_part_conditions',
        recordedAt: bodyCondition?.lastUpdatedAt ?? null,
        direct: true,
      },
      expertise: {
        source: 'expertise_reports',
        recordedAt:
          typeof latestExpertise?.report_date === 'string' ? latestExpertise.report_date : null,
        direct: false,
      },
      vehicleProfile: {
        source: 'vehicles',
        recordedAt: textValue(vehicle.updated_at),
        direct: true,
      },
    },
    details: buildDetailContext({
      question,
      today,
      currentOdometer,
      latestMaintenance,
      latestFuel,
      latestExpertise,
      documents,
      reminders: openReminders,
      fuelOdometers,
    }),
  };
  return {
    context,
    privateFacts: { plate: textValue(vehicle.plate) },
    ownerVerified: true,
  };
}

/** Question keywords that unlock each Layer-2 detail block. */
const DETAIL_INTENTS: Readonly<Record<string, readonly string[]>> = {
  latestMaintenance: ['bakim', 'servis', 'yag', 'onarim', 'tamir'],
  latestFuel: ['yakit', 'benzin', 'dizel', 'lpg', 'depo', 'litre', 'tuketim', 'istasyon'],
  latestExpertise: ['ekspertiz', 'rapor'],
  documents: ['belge', 'muayene', 'sigorta', 'kasko', 'ruhsat', 'police', 'vergi'],
  reminders: ['hatirlatici', 'yaklasan', 'gecikmis', 'ne zaman', 'kaldi'],
  odometer: ['kilometre', 'km', 'yol', 'mesafe'],
};

/** Hard caps so the prompt stays bounded no matter how much history exists. */
const MAX_DETAIL_DOCUMENTS = 6;
const MAX_DETAIL_REMINDERS = 6;

function wantsDetail(normalizedQuestion: string, block: keyof typeof DETAIL_INTENTS): boolean {
  return DETAIL_INTENTS[block].some((term) => normalizedQuestion.includes(term));
}

/**
 * Folds a question to the same ASCII form the assistant contract uses, so the
 * intent keywords above match regardless of Turkish casing or diacritics.
 */
function foldQuestion(question: string): string {
  return question
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('ı', 'i')
    .replaceAll('ş', 's')
    .replaceAll('ğ', 'g')
    .replaceAll('ç', 'c')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Layer 2: bounded latest-record detail, attached only for questions that need
 * it. Nothing here is free text the user typed (titles, notes, document numbers)
 * and nothing is a file path — only dates, enums and numbers.
 */
export function buildDetailContext(input: {
  question: string;
  today: Date;
  currentOdometer: number;
  latestMaintenance: Record<string, unknown> | null;
  latestFuel: Record<string, unknown> | null;
  latestExpertise: Record<string, unknown> | null;
  documents: readonly Record<string, unknown>[];
  reminders: readonly Record<string, unknown>[];
  fuelOdometers: readonly number[];
}): VehicleAssistantContext['details'] {
  const normalized = foldQuestion(input.question);
  const details: NonNullable<VehicleAssistantContext['details']> = {};

  if (input.latestMaintenance && wantsDetail(normalized, 'latestMaintenance')) {
    details.latestMaintenance = {
      date: textValue(input.latestMaintenance.record_date),
      amount: finiteNumber(input.latestMaintenance.amount),
      odometer: finiteNumber(input.latestMaintenance.kilometer),
      serviceType: textValue(input.latestMaintenance.service_type),
    };
  }
  if (input.latestFuel && wantsDetail(normalized, 'latestFuel')) {
    const liters = finiteNumber(input.latestFuel.liters);
    const amount = finiteNumber(input.latestFuel.amount);
    details.latestFuel = {
      date: textValue(input.latestFuel.record_date),
      liters,
      amount,
      odometer: finiteNumber(input.latestFuel.kilometer),
      pricePerLiter:
        liters && liters > 0 && amount !== null ? Math.round((amount / liters) * 100) / 100 : null,
    };
  }
  if (input.latestExpertise && wantsDetail(normalized, 'latestExpertise')) {
    details.latestExpertise = {
      date: textValue(input.latestExpertise.report_date),
      company: textValue(input.latestExpertise.company_name),
    };
  }
  if (wantsDetail(normalized, 'documents')) {
    details.documents = [...input.documents]
      .sort((left, right) =>
        String(left.expiry_date ?? '9999').localeCompare(String(right.expiry_date ?? '9999')),
      )
      .slice(0, MAX_DETAIL_DOCUMENTS)
      .map((row) => ({
        type: textValue(row.document_type),
        issueDate: textValue(row.issue_date),
        expiryDate: textValue(row.expiry_date),
        daysUntilExpiry: daysBetween(input.today, dateValue(row.expiry_date)),
      }));
  }
  if (wantsDetail(normalized, 'reminders')) {
    details.reminders = [...input.reminders]
      .sort((left, right) =>
        String(left.due_date ?? '9999').localeCompare(String(right.due_date ?? '9999')),
      )
      .slice(0, MAX_DETAIL_REMINDERS)
      .map((row) => ({
        type: textValue(row.reminder_type),
        dueDate: textValue(row.due_date),
        dueKilometer: finiteNumber(row.due_kilometer),
        daysUntilDue: daysBetween(input.today, dateValue(row.due_date)),
      }));
  }
  if (wantsDetail(normalized, 'odometer')) {
    const first = input.fuelOdometers[0] ?? null;
    const last = input.fuelOdometers.at(-1) ?? null;
    details.odometer = {
      current: input.currentOdometer,
      earliestRecorded: first,
      latestRecorded: last,
      recordedDistance: first !== null && last !== null ? last - first : null,
      readings: input.fuelOdometers.length,
    };
  }

  return Object.keys(details).length ? details : undefined;
}
