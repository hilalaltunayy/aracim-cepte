export const PLAN_IDS = ['free', 'premium'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanEntitlements {
  planId: PlanId;
  maxVehicles: number;
  ocrMonthlyQuota: number;
  maxAttachmentsPerEntity: number;
  maxAttachmentBytesPerEntity: number;
  maxStorageBytesPerUser: number;
  maxVehiclePhotos: number;
  advancedReports: boolean;
  aiMonthlyQuota: number;
  fuelPriceAlerts: boolean;
  advancedNotifications: boolean;
  advancedTrips: boolean;
  mechanicSharing: boolean;
  obdAccess: boolean;
  connectedVehicleAccess: boolean;
}

export interface EntitlementRecord { planId: unknown; validUntil: unknown; source?: unknown }
export type EntitlementRecordLoader = () => Promise<EntitlementRecord | null>;

export const PLAN_ENTITLEMENTS: Readonly<Record<PlanId, Readonly<PlanEntitlements>>> = {
  free: { planId: 'free', maxVehicles: 1, ocrMonthlyQuota: 3, maxAttachmentsPerEntity: 5,
    maxAttachmentBytesPerEntity: 15 * 1024 * 1024, maxStorageBytesPerUser: 25 * 1024 * 1024,
    maxVehiclePhotos: 1, advancedReports: false, aiMonthlyQuota: 0, fuelPriceAlerts: false,
    advancedNotifications: false, advancedTrips: false, mechanicSharing: false, obdAccess: false,
    connectedVehicleAccess: false },
  premium: { planId: 'premium', maxVehicles: 3, ocrMonthlyQuota: 30, maxAttachmentsPerEntity: 10,
    maxAttachmentBytesPerEntity: 30 * 1024 * 1024, maxStorageBytesPerUser: 100 * 1024 * 1024,
    maxVehiclePhotos: 5, advancedReports: true, aiMonthlyQuota: 30, fuelPriceAlerts: true,
    advancedNotifications: true, advancedTrips: true, mechanicSharing: true, obdAccess: true,
    connectedVehicleAccess: true },
};
export const FREE_ENTITLEMENTS = PLAN_ENTITLEMENTS.free;

function activePremium(record: EntitlementRecord, now: Date): boolean {
  if (record.planId !== 'premium') return false;
  if (record.validUntil === null || record.validUntil === undefined) return true;
  if (typeof record.validUntil !== 'string') return false;
  const until = new Date(record.validUntil);
  return !Number.isNaN(until.getTime()) && until.getTime() > now.getTime();
}

/** Fail closed. This is a client display snapshot, never server authorization truth. */
export function getEntitlements(record: EntitlementRecord | null | undefined, now = new Date()) {
  return record && activePremium(record, now) ? PLAN_ENTITLEMENTS.premium : FREE_ENTITLEMENTS;
}

/** Keeps loading failures fail-closed without coupling entitlement rules to a mobile runtime. */
export async function loadEntitlementsWithFallback(loadRecord: EntitlementRecordLoader) {
  try { return getEntitlements(await loadRecord()); } catch { return FREE_ENTITLEMENTS; }
}

/** A downgrade blocks new actions only; it never implies deletion of existing data. */
export function canCreateVehicle(vehicleCount: number, entitlements: Pick<PlanEntitlements, 'maxVehicles'>) {
  return Number.isInteger(vehicleCount) && vehicleCount >= 0 && vehicleCount < entitlements.maxVehicles;
}

/** Single TASK-031 quota integration point; TASK-028 does not count or enforce OCR usage. */
export function getOcrInvocationPolicy(
  entitlements: Pick<PlanEntitlements, 'planId' | 'ocrMonthlyQuota'> = FREE_ENTITLEMENTS,
) { return { planId: entitlements.planId, monthlyQuota: entitlements.ocrMonthlyQuota } as const; }
