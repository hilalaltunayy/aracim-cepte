export const ASSISTANT_DOMAINS = [
  'maintenance',
  'fuel',
  'documents',
  'cost',
  'general',
  'safety',
  'out_of_domain',
  'external_data',
] as const;
export type AssistantDomain = (typeof ASSISTANT_DOMAINS)[number];

export const ASSISTANT_SEVERITIES = ['info', 'low', 'medium', 'high'] as const;
export type AssistantSeverity = (typeof ASSISTANT_SEVERITIES)[number];

export interface AssistantEvidence {
  factCode: string;
  label: string;
  value: string;
}

export interface VehicleAssistantResponse {
  answer: string;
  domain: AssistantDomain;
  severity: AssistantSeverity;
  evidence: AssistantEvidence[];
  suggestions: string[];
  safetyEscalation: boolean;
  externalDataRequired: boolean;
}

export interface AssistantQuotaState {
  used: number;
  limit: number;
  remaining: number;
  periodStart: string;
}

export interface VehicleAssistantResult {
  response: VehicleAssistantResponse;
  quota: AssistantQuotaState;
  source: 'local' | 'provider';
}

export interface VehicleAssistantContext {
  vehicleId: string;
  generatedAt: string;
  vehicle: {
    displayName: string;
    year: number | null;
    currentOdometer: number;
  };
  maintenanceFacts: Record<string, string | number | boolean | null>;
  documentFacts: Record<string, string | number | boolean | null>;
  expertiseFacts: Record<string, string | number | boolean | null>;
  fuelFacts: Record<string, string | number | boolean | null>;
  costFacts: Record<string, string | number | boolean | null>;
  reminderFacts: Record<string, string | number | boolean | null>;
  trends: Record<string, number | null>;
  highPrioritySignals: {
    code: string;
    domain: string;
    severity: string;
    confidence: number;
    facts: Record<string, string | number | boolean | null>;
  }[];
  dataQuality: Record<string, string | number | boolean | null>;
}

export type DomainGateResult =
  | { kind: 'pass'; externalDataMentioned: boolean }
  | { kind: 'out_of_domain'; response: VehicleAssistantResponse }
  | { kind: 'external_data'; response: VehicleAssistantResponse };

const foldTurkish = (value: string) =>
  value
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

const containsAny = (value: string, terms: readonly string[]) =>
  terms.some((term) => value.includes(term));

const vehicleTerms = [
  'arac',
  'araba',
  'otomobil',
  'motor',
  'fren',
  'direksiyon',
  'yakit',
  'benzin',
  'dizel',
  'lpg',
  'bakim',
  'servis',
  'muayene',
  'sigorta',
  'kasko',
  'belge',
  'lastik',
  'km',
  'kilometre',
  'masraf',
  'maliyet',
  'harcama',
  'hatirlatici',
  'sanziman',
  'aku',
  'istasyon',
  'tamirci',
  'trafik',
] as const;
const explicitOutOfDomainTerms = [
  'fransanin baskenti',
  'fransa nin baskenti',
  'makarna tarifi',
  'yemek tarifi',
  'kod yaz',
  'programlama',
  'siir yaz',
  'hava durumu',
  'futbol skoru',
] as const;
const liveDataTerms = [
  'bugun yakit',
  'bugunku yakit',
  'litre fiyati',
  'guncel yakit',
  'yakinimdaki tamirci',
  'yakin tamirci',
  'yakinimdaki istasyon',
  'yakin istasyon',
  'canli trafik',
  'yol kapan',
  'trafik durumu',
  'istasyon musait',
] as const;

export function classifyQuestion(question: string): DomainGateResult {
  const normalized = foldTurkish(question.trim());
  const externalDataMentioned = containsAny(normalized, liveDataTerms);
  const hasVehicleScope = containsAny(normalized, vehicleTerms);
  if (containsAny(normalized, explicitOutOfDomainTerms) && !hasVehicleScope) {
    return {
      kind: 'out_of_domain',
      response: {
        answer: 'Bu asistan araç, bakım ve araç sahipliğiyle ilgili sorular için tasarlandı.',
        domain: 'out_of_domain',
        severity: 'info',
        evidence: [],
        suggestions: ['Aracınızın bakım, yakıt, belge veya maliyet durumunu sorabilirsiniz.'],
        safetyEscalation: false,
        externalDataRequired: false,
      },
    };
  }
  if (
    externalDataMentioned &&
    !containsAny(normalized, ['aracim', 'arabam', 'tuketimim', 'masrafim'])
  ) {
    return {
      kind: 'external_data',
      response: {
        answer:
          'Bu bilgi güncel bir dış veri kaynağı gerektiriyor. Henüz canlı fiyat, konum veya trafik sağlayıcısı bağlı değil.',
        domain: 'external_data',
        severity: 'info',
        evidence: [],
        suggestions: [
          'Canlı veri bağlantısı eklendiğinde bu bilgiyi güvenilir kaynaktan sunabiliriz.',
        ],
        safetyEscalation: false,
        externalDataRequired: true,
      },
    };
  }
  return { kind: 'pass', externalDataMentioned };
}

const safetyTerms = [
  'fren tutm',
  'fren bos',
  'fren ariza',
  'direksiyon kilit',
  'direksiyon kontrol',
  'duman',
  'yangin',
  'alev',
  'hararet',
  'asiri isin',
  'yakit kok',
  'benzin kok',
  'yakit siz',
  'benzin siz',
  'kritik uyari',
] as const;

export function requiresSafetyEscalation(question: string): boolean {
  return containsAny(foldTurkish(question), safetyTerms);
}

const definiteDiagnosis =
  /(?:kesin(?:likle)?|mutlaka)\s+(?:sebep|neden|arıza)|(?:bozuk|kırık|arızalı)\s+olduğu\s+kesin|(?:enjektör|balata|şanzıman|motor)\s+kesin(?:likle)?/iu;

export function containsUnsupportedDefiniteDiagnosis(value: string): boolean {
  return definiteDiagnosis.test(value);
}

export function applyDeterministicSafety(
  response: VehicleAssistantResponse,
  question: string,
  externalDataMentioned = false,
): VehicleAssistantResponse {
  if (requiresSafetyEscalation(question)) {
    return {
      ...response,
      answer:
        'Bu belirti güvenlik açısından ciddiye alınmalı. Güvenli bir yerde durun ve aracı kullanmaya devam etmeden önce profesyonel kontrol alın. Mevcut veriler kesin arıza nedenini göstermez.',
      domain: 'safety',
      severity: 'high',
      suggestions: [
        'Güvenliyse aracı durdurun.',
        'Yetkili servis veya güvenilir bir uzmandan kontrol isteyin.',
      ],
      safetyEscalation: true,
      externalDataRequired: externalDataMentioned || response.externalDataRequired,
    };
  }
  if (containsUnsupportedDefiniteDiagnosis(response.answer)) {
    return {
      ...response,
      answer:
        'Mevcut veriler kesin bir mekanik neden göstermiyor. Belirtiyi izleyin ve sürüş güvenliğini etkiliyorsa profesyonel kontrol alın.',
      suggestions: [
        'Belirtiyi ve oluştuğu koşulları kaydedin.',
        'Kesin neden için profesyonel kontrol alın.',
      ],
    };
  }
  if (externalDataMentioned && !response.externalDataRequired) {
    return {
      ...response,
      answer: `${response.answer} Güncel dış veri bölümü için bağlı bir sağlayıcı gerekiyor.`,
      externalDataRequired: true,
    };
  }
  return response;
}

export function canonicalEvidenceCodes(context: VehicleAssistantContext): Set<string> {
  return new Set(canonicalEvidenceCatalog(context).keys());
}

const evidenceLabels: Readonly<Record<string, string>> = {
  'vehicle.currentOdometer': 'Güncel kilometre',
  'maintenanceFacts.lastDate': 'Son bakım tarihi',
  'maintenanceFacts.kmSinceLast': 'Son bakımdan beri',
  'maintenanceFacts.daysSinceLast': 'Son bakımdan beri geçen süre',
  'documentFacts.inspectionDaysUntil': 'Muayeneye kalan süre',
  'documentFacts.insuranceDaysUntil': 'Trafik sigortasına kalan süre',
  'documentFacts.cascoDaysUntil': 'Kaskoya kalan süre',
  'fuelFacts.averageConsumption': 'Ortalama tüketim',
  'fuelFacts.averagePricePerLiter': 'Ortalama litre fiyatı',
  'costFacts.recordedCost': 'Kaydedilen araç maliyeti',
  'costFacts.costPerKm': 'Kilometre başına maliyet',
  'reminderFacts.overdueCount': 'Geciken hatırlatıcı',
};

function evidenceValue(value: unknown): string {
  if (value === null || value === undefined) return 'Bilinmiyor';
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
  if (typeof value === 'number')
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value);
  return String(value);
}

function defaultEvidenceLabel(path: string): string {
  const tail = path.split('.').at(-1) ?? path;
  return tail.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ');
}

export function canonicalEvidenceCatalog(
  context: VehicleAssistantContext,
): Map<string, { label: string; value: string }> {
  const catalog = new Map<string, { label: string; value: string }>();
  const visit = (value: unknown, path: string) => {
    if (value === null || typeof value !== 'object') {
      if (path)
        catalog.set(path, {
          label: evidenceLabels[path] ?? defaultEvidenceLabel(path),
          value: evidenceValue(value),
        });
      return;
    }
    if (Array.isArray(value)) return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      visit(child, path ? `${path}.${key}` : key);
    }
  };
  visit(context.vehicle, 'vehicle');
  visit(context.maintenanceFacts, 'maintenanceFacts');
  visit(context.documentFacts, 'documentFacts');
  visit(context.expertiseFacts, 'expertiseFacts');
  visit(context.fuelFacts, 'fuelFacts');
  visit(context.costFacts, 'costFacts');
  visit(context.reminderFacts, 'reminderFacts');
  visit(context.trends, 'trends');
  visit(context.dataQuality, 'dataQuality');
  for (const signal of context.highPrioritySignals) {
    catalog.set(`signals.${signal.code}`, {
      label: `Araç sinyali: ${signal.code}`,
      value: `${signal.severity} · güven ${Math.round(signal.confidence * 100)}%`,
    });
    for (const [key, value] of Object.entries(signal.facts)) {
      const path = `signals.${signal.code}.facts.${key}`;
      catalog.set(path, { label: defaultEvidenceLabel(path), value: evidenceValue(value) });
    }
  }
  return catalog;
}

/** Provider may choose evidence codes, but human labels/values always come from trusted context. */
export function normalizeVehicleAssistantEvidence(
  response: VehicleAssistantResponse,
  context: VehicleAssistantContext,
): VehicleAssistantResponse {
  const catalog = canonicalEvidenceCatalog(context);
  return {
    ...response,
    evidence: response.evidence.flatMap((item) => {
      const canonical = catalog.get(item.factCode);
      return canonical ? [{ factCode: item.factCode, ...canonical }] : [];
    }),
  };
}

export function validateVehicleAssistantResponse(
  value: unknown,
  allowedEvidenceCodes: ReadonlySet<string>,
): VehicleAssistantResponse | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<VehicleAssistantResponse>;
  if (
    typeof candidate.answer !== 'string' ||
    !candidate.answer.trim() ||
    !ASSISTANT_DOMAINS.includes(candidate.domain as AssistantDomain) ||
    !ASSISTANT_SEVERITIES.includes(candidate.severity as AssistantSeverity) ||
    !Array.isArray(candidate.evidence) ||
    !Array.isArray(candidate.suggestions) ||
    typeof candidate.safetyEscalation !== 'boolean' ||
    typeof candidate.externalDataRequired !== 'boolean'
  )
    return null;
  if (
    candidate.suggestions.some((item) => typeof item !== 'string') ||
    candidate.evidence.some(
      (item) =>
        !item ||
        typeof item.factCode !== 'string' ||
        typeof item.label !== 'string' ||
        typeof item.value !== 'string' ||
        !allowedEvidenceCodes.has(item.factCode),
    )
  )
    return null;
  return {
    answer: candidate.answer.trim(),
    domain: candidate.domain as AssistantDomain,
    severity: candidate.severity as AssistantSeverity,
    evidence: candidate.evidence,
    suggestions: candidate.suggestions,
    safetyEscalation: candidate.safetyEscalation,
    externalDataRequired: candidate.externalDataRequired,
  };
}

export const VEHICLE_ASSISTANT_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'answer',
    'domain',
    'severity',
    'evidence',
    'suggestions',
    'safetyEscalation',
    'externalDataRequired',
  ],
  properties: {
    answer: { type: 'string' },
    domain: { type: 'string', enum: [...ASSISTANT_DOMAINS] },
    severity: { type: 'string', enum: [...ASSISTANT_SEVERITIES] },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['factCode', 'label', 'value'],
        properties: {
          factCode: { type: 'string' },
          label: { type: 'string' },
          value: { type: 'string' },
        },
      },
    },
    suggestions: { type: 'array', items: { type: 'string' } },
    safetyEscalation: { type: 'boolean' },
    externalDataRequired: { type: 'boolean' },
  },
} as const;
