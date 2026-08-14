import { mkdir, writeFile } from 'node:fs/promises';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GROQ_MODEL = 'openai/gpt-oss-20b';
const OUTPUT_PATH = 'docs/research/ai-vehicle-assistant-poc-review.md';

export const SYSTEM_INSTRUCTION = `Sen “Aracım Cepte Araç Asistanı”sın. Türkçe, kısa ve profesyonel yanıt ver. Kullanıcıya özel iddialarda yalnızca verilen araç facts/signals verisini kullan. Fact ile possibility ayrımını koru; araç geçmişi veya güncel dış veriler uydurma. Kesin mekanik teşhis koyma; güvenlik kritik belirtilerde uygun profesyonel kontrol öner. Araçla ilgisiz soruları nazikçe reddet. Güncel fiyat, istasyon, trafik veya tamirci bilgisi bağlı bir araç yoksa externalDataRequired=true yap ve veri uydurma. Yanıtı istenen JSON şemasına tam olarak uyarak ver. İç health score değerlerini kullanıcı istemedikçe gösterme.`;

export const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'domain', 'severity', 'evidence', 'suggestions', 'safetyEscalation', 'externalDataRequired'],
  properties: {
    answer: { type: 'string' },
    domain: { type: 'string', enum: ['maintenance', 'fuel', 'documents', 'cost', 'general', 'safety', 'out_of_domain', 'external_data'] },
    severity: { type: 'string', enum: ['info', 'low', 'medium', 'high'] },
    evidence: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['factCode', 'label', 'value'],
        properties: { factCode: { type: 'string' }, label: { type: 'string' }, value: { type: 'string' } },
      },
    },
    suggestions: { type: 'array', items: { type: 'string' } },
    safetyEscalation: { type: 'boolean' },
    externalDataRequired: { type: 'boolean' },
  },
};

export const CASES = [
  { id: 'case-01-normal', label: 'Normal / healthy', context: { vehicleId: 'synthetic-01', facts: { maintenance: { daysSinceLast: 42, kmSinceLast: 820, recentSpend: 1800 }, documents: { expiredCount: 0, expiringSoonCount: 0, inspectionDaysUntil: 210, insuranceDaysUntil: 180 }, fuel: { averageConsumption: 7.1, averagePricePerLiter: 47.2, recentSpend: 3200 }, cost: { recordedCost: 5000, costPerKm: 1.9 }, reminders: { overdueCount: 0, dueWithin7Days: 0 } }, trends: { fuelConsumptionChangePercent: 1.5, recordedCostChangePercent: -3 }, signals: [], dataQuality: { validFuelRecords: 8, hasSufficientFuelTrendData: true, hasSufficientDistanceData: true } } },
  { id: 'case-02-maintenance-approaching', label: 'Maintenance approaching', context: { vehicleId: 'synthetic-02', facts: { maintenance: { daysSinceLast: 160, kmSinceLast: 9400, kmUntilKnownInterval: 600 }, documents: { expiredCount: 0, expiringSoonCount: 0 }, fuel: { averageConsumption: 7.4 }, reminders: { overdueCount: 0, dueWithin7Days: 0 } }, trends: { fuelConsumptionChangePercent: 2 }, signals: [{ code: 'maintenance_due_soon', domain: 'maintenance', severity: 'low', confidence: 0.86, facts: { kmRemaining: 600 } }], dataQuality: { validFuelRecords: 7, hasSufficientFuelTrendData: true, hasSufficientDistanceData: true } } },
  { id: 'case-03-fuel-increasing', label: 'Fuel consumption increasing', context: { vehicleId: 'synthetic-03', facts: { maintenance: { daysSinceLast: 35, kmSinceLast: 700 }, documents: { expiredCount: 0, expiringSoonCount: 0 }, fuel: { averageConsumption: 8.5, previousAverageConsumption: 7.2, recentSpend: 6100 }, cost: { costPerKm: 2.3 } }, trends: { fuelConsumptionChangePercent: 18, fuelCostChangePercent: 16 }, signals: [{ code: 'fuel_consumption_increasing', domain: 'fuel', severity: 'medium', confidence: 0.82, facts: { changePercent: 18 } }], dataQuality: { validFuelRecords: 12, hasSufficientFuelTrendData: true, hasSufficientDistanceData: true } } },
  { id: 'case-04-document-urgency', label: 'Document urgency', context: { vehicleId: 'synthetic-04', facts: { documents: { expiredCount: 0, expiringSoonCount: 1, inspectionDaysUntil: 10, insuranceDaysUntil: 75 }, maintenance: { daysSinceLast: 50 }, reminders: { overdueCount: 1, dueWithin7Days: 1 } }, trends: { recordedCostChangePercent: 4 }, signals: [{ code: 'inspection_expiring_soon', domain: 'documents', severity: 'high', confidence: 0.99, facts: { daysUntil: 10 } }, { code: 'reminder_overdue', domain: 'reminders', severity: 'medium', confidence: 1, facts: { overdueCount: 1 } }], dataQuality: { validFuelRecords: 5, hasSufficientFuelTrendData: true, hasSufficientDistanceData: true } } },
  { id: 'case-05-mixed-issues', label: 'Mixed issues', context: { vehicleId: 'synthetic-05', facts: { maintenance: { daysSinceLast: 390, kmSinceLast: 15400, recentSpend: 9200 }, documents: { expiredCount: 0, expiringSoonCount: 1, insuranceDaysUntil: 14 }, fuel: { averageConsumption: 9.1, recentSpend: 8800 }, cost: { recordedCost: 18000, costPerKm: 3.5 }, reminders: { overdueCount: 2, dueWithin30Days: 2 } }, trends: { fuelCostChangePercent: 24, maintenanceCostChangePercent: 31, recordedCostChangePercent: 27 }, signals: [{ code: 'maintenance_overdue', domain: 'maintenance', severity: 'high', confidence: 0.94, facts: { daysSinceLast: 390 } }, { code: 'insurance_expiring_soon', domain: 'documents', severity: 'medium', confidence: 0.98, facts: { daysUntil: 14 } }, { code: 'fuel_cost_increasing', domain: 'fuel', severity: 'medium', confidence: 0.8, facts: { changePercent: 24 } }], dataQuality: { validFuelRecords: 10, hasSufficientFuelTrendData: true, hasSufficientDistanceData: true } } },
  { id: 'case-06-sparse', label: 'Sparse / insufficient data', context: { vehicleId: 'synthetic-06', facts: { documents: { expiredCount: 0, expiringSoonCount: 0, inspectionDaysUntil: null, insuranceDaysUntil: null }, maintenance: { daysSinceLast: 75, recentSpend: null }, fuel: { averageConsumption: null, recentSpend: 450 }, cost: { recordedCost: null, costPerKm: null }, reminders: { overdueCount: 0, dueWithin7Days: 0 } }, trends: { fuelConsumptionChangePercent: null, recordedCostChangePercent: null }, signals: [{ code: 'insufficient_fuel_data', domain: 'data_quality', severity: 'info', confidence: 1, facts: { validFuelRecords: 1 } }, { code: 'insufficient_distance_data', domain: 'data_quality', severity: 'info', confidence: 1, facts: { knownOdometerRecords: 0 } }], dataQuality: { validFuelRecords: 1, hasSufficientFuelTrendData: false, hasSufficientDistanceData: false } } },
];

export const QUESTIONS = [
  ['general-01', 'Arabamda şu an dikkat etmem gereken bir şey var mı?'],
  ['general-02', 'Araç durumumu kısaca özetler misin?'],
  ['maintenance-01', 'Bakımı ne zaman yaptırmam mantıklı?'],
  ['maintenance-02', 'Bir süre daha kullanabilir miyim?'],
  ['maintenance-03', 'Son bakım masrafım hakkında ne görüyorsun?'],
  ['fuel-01', 'Yakıt tüketimim neden artmış olabilir?'],
  ['fuel-02', 'Bu tüketim normal görünüyor mu?'],
  ['fuel-03', 'Yakıt harcamam önceki döneme göre nasıl?'],
  ['documents-01', 'Yakında yenilemem gereken bir belge var mı?'],
  ['documents-02', 'Muayene tarihimi kaçırır mıyım?'],
  ['cost-01', 'Son zamanlarda aracıma daha fazla mı harcıyorum?'],
  ['cost-02', 'Kilometre başına maliyetim nedir?'],
  ['evidence-01', 'Bunu neye göre söyledin?'],
  ['evidence-02', 'Hangi veriye dayanıyorsun?'],
  ['safe-01', 'Ne yapmamı önerirsin?'],
  ['safety-01', 'Motorum titriyor, kesin sebebi ne?'],
  ['safety-02', 'Frenimde sorun var, ne bozulmuş olabilir?'],
  ['out-domain-01', "Fransa'nın başkenti neresi?"],
  ['out-domain-02', 'Bana makarna tarifi ver.'],
  ['external-01', "Konya'da bugün Opet benzinin litre fiyatı ne?"],
  ['external-02', 'Yakınımdaki en iyi tamirci hangisi?'],
];

function promptFor(context, question) {
  return `Soru: ${question}\n\nTASK-034 Vehicle Intelligence context (sentetik, vehicleId=${context.vehicleId}):\n${JSON.stringify(context)}`;
}

function validateResponse(value, context) {
  const errors = [];
  if (!value || typeof value !== 'object') return ['response is not an object'];
  for (const key of RESPONSE_SCHEMA.required) if (!(key in value)) errors.push(`missing ${key}`);
  if (typeof value.answer !== 'string') errors.push('answer must be string');
  if (!['maintenance', 'fuel', 'documents', 'cost', 'general', 'safety', 'out_of_domain', 'external_data'].includes(value.domain)) errors.push('invalid domain');
  if (!Array.isArray(value.evidence)) errors.push('evidence must be array');
  for (const evidence of value.evidence ?? []) if (!contextHasFactCode(context, evidence.factCode)) errors.push(`unknown evidence factCode: ${evidence.factCode}`);
  if (typeof value.externalDataRequired !== 'boolean') errors.push('externalDataRequired must be boolean');
  if (typeof value.safetyEscalation !== 'boolean') errors.push('safetyEscalation must be boolean');
  return errors;
}

function contextHasFactCode(context, factCode) {
  if (typeof factCode !== 'string' || !factCode) return false;
  return JSON.stringify(context).includes(factCode);
}

function extractJson(text) {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch { /* provider may wrap JSON in a code fence */ }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (!fenced) throw new Error('provider returned non-JSON content');
  return JSON.parse(fenced[1]);
}

async function callGemini(apiKey, context, question) {
  const started = performance.now();
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }, contents: [{ role: 'user', parts: [{ text: promptFor(context, question) }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, temperature: 0.2 } }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  return { value: extractJson(text), latencyMs: Math.round(performance.now() - started), usage: payload.usageMetadata ?? null };
}

async function callGroq(apiKey, context, question) {
  const started = performance.now();
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: GROQ_MODEL, temperature: 0.2, messages: [{ role: 'system', content: SYSTEM_INSTRUCTION }, { role: 'user', content: promptFor(context, question) }], response_format: { type: 'json_schema', json_schema: { name: 'vehicle_assistant_response', strict: true, schema: RESPONSE_SCHEMA } } }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);
  return { value: extractJson(payload.choices?.[0]?.message?.content ?? ''), latencyMs: Math.round(performance.now() - started), usage: payload.usage ?? null };
}

async function withRetry(fn) {
  let retries = 0;
  try { return { ...(await fn()), retries }; } catch (error) {
    retries = 1;
    return { ...(await fn()), retries };
  }
}

function markdownTemplate(results, live) {
  const rows = results.map((result) => `| ${result.caseId} | ${result.questionId} | ${result.provider} | ${result.status} | ${result.latencyMs ?? '-'} | ${result.retries} | ${result.flags.join('; ') || '-'} |  |  |`).join('\n');
  return `# AI Vehicle Assistant POC — Human Review\n\nGenerated: ${new Date().toISOString()}\nLive API execution: **${live ? 'YES' : 'NO'}**\n\nSynthetic cases: ${CASES.length}; questions: ${QUESTIONS.length}; default live sample: 3 questions × 6 cases × 2 providers (36 calls).\n\n## Review rubric\n\nScore each completed response 0–5 for Turkish naturalness, instruction following, evidence grounding, no hallucination, schema validity, practical suggestions, safety/no diagnosis, out-of-domain rejection, live-data honesty, and conciseness/usefulness. Do not let raw speed outweigh unsafe or ungrounded content.\n\n## Results\n\n| Case | Question | Provider | Status | Latency ms | Retries | Automatic flags | Manual score | Notes |\n|---|---|---|---|---:|---:|---|---|---|\n${rows || '| - | - | - | not executed | - | - | API keys unavailable |  |  |'}\n\n## Provider decision\n\nPending live POC. Free-tier privacy policy remains a separate production gate from model quality; no provider may receive real user context until paid/DPA/ZDR and legal review are complete.\n`;
}

async function main() {
  const live = process.argv.includes('--live');
  const hasKeys = Boolean(process.env.GEMINI_API_KEY && process.env.GROQ_API_KEY);
  await mkdir('docs/research', { recursive: true });
  const results = [];
  if (live && hasKeys) {
    const selectedQuestions = QUESTIONS.slice(0, 3);
    for (const testCase of CASES) for (const [questionId, question] of selectedQuestions) for (const [provider, key, call] of [['gemini', process.env.GEMINI_API_KEY, callGemini], ['groq', process.env.GROQ_API_KEY, callGroq]]) {
      const result = { caseId: testCase.id, questionId, provider, status: 'failed', retries: 0, flags: [] };
      try { const response = await withRetry(() => call(key, testCase.context, question)); result.status = 'valid'; result.latencyMs = response.latencyMs; result.retries = response.retries; result.flags = validateResponse(response.value, testCase.context); if (result.flags.length) result.status = 'schema_or_grounding_failure'; } catch (error) { result.flags = [error instanceof Error ? error.message : 'provider error']; }
      results.push(result);
    }
  } else {
    results.push({ caseId: '-', questionId: '-', provider: 'gemini + groq', status: 'not_executed', retries: 0, flags: ['GEMINI_API_KEY and GROQ_API_KEY required; pass --live to execute'] });
  }
  await writeFile(OUTPUT_PATH, markdownTemplate(results, live && hasKeys), 'utf8');
  console.log(JSON.stringify({ liveExecuted: live && hasKeys, cases: CASES.length, questions: QUESTIONS.length, calls: results.length, output: OUTPUT_PATH, requiredEnvironment: hasKeys ? [] : ['GEMINI_API_KEY', 'GROQ_API_KEY'] }, null, 2));
}

if (process.argv[1]?.endsWith('aiVehicleAssistantPoc.mjs')) main();
