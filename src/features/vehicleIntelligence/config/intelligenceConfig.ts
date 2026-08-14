export const VEHICLE_INTELLIGENCE_CONFIG = {
  documentExpiringSoonDays: 30,
  reminderDueSoonDays: 7,
  maintenanceLongTimeDays: 365,
  recentReportPeriod: 'three_months' as const,
  minimumFuelTrendSamples: 2,
  trend: {
    informationPercent: 5,
    meaningfulPercent: 12,
    strongPercent: 25,
    costSpikePercent: 35,
  },
  scoreWeights: {
    maintenance: 0.35,
    documents: 0.3,
    fuelEfficiency: 0.2,
    cost: 0.15,
  },
  severityPenalty: {
    info: 0,
    low: 6,
    medium: 14,
    high: 26,
  },
} as const;
