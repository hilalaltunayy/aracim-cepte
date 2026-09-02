import { parseDecimal } from '@/shared/utils/format';

export type FuelValueField = 'total' | 'liters' | 'pricePerLiter';

export interface FuelEntryState {
  total: string;
  liters: string;
  pricePerLiter: string;
  manualFields: FuelValueField[];
  calculatedField: FuelValueField | null;
}

export interface FuelEntryValues {
  total: number | null;
  liters: number | null;
  pricePerLiter: number | null;
}

const fields: FuelValueField[] = ['total', 'liters', 'pricePerLiter'];

function positiveValue(value: string): number | null {
  const parsed = parseDecimal(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function formatCalculated(field: FuelValueField, value: number): string {
  const digits = field === 'liters' ? 3 : 2;
  return value.toFixed(digits).replace(/\.?0+$/, '').replace('.', ',');
}

export function calculateMissingFuelValue(
  values: FuelEntryValues,
  missing: FuelValueField,
): number | null {
  const { total, liters, pricePerLiter } = values;
  let result: number | null = null;
  if (missing === 'total' && liters && pricePerLiter) result = liters * pricePerLiter;
  if (missing === 'liters' && total && pricePerLiter) result = total / pricePerLiter;
  if (missing === 'pricePerLiter' && total && liters) result = total / liters;
  return result !== null && Number.isFinite(result) && result > 0 ? result : null;
}

export function createFuelEntryState(input?: Partial<FuelEntryValues>): FuelEntryState {
  const total = input?.total?.toString() ?? '';
  const liters = input?.liters?.toString() ?? '';
  const pricePerLiter = input?.pricePerLiter?.toString() ?? '';
  return {
    total,
    liters,
    pricePerLiter,
    manualFields: fields.filter((field) => ({ total, liters, pricePerLiter })[field] !== ''),
    calculatedField: null,
  };
}

export function updateFuelEntry(
  state: FuelEntryState,
  field: FuelValueField,
  rawValue: string,
): FuelEntryState {
  const next = { ...state, [field]: rawValue };
  const manualFields = new Set(state.manualFields);
  if (rawValue.trim()) manualFields.add(field);
  else manualFields.delete(field);

  const values = { ...next };
  for (const candidate of fields) {
    if (!manualFields.has(candidate)) values[candidate] = '';
  }

  const validManualFields = fields.filter(
    (candidate) => manualFields.has(candidate) && positiveValue(values[candidate]) !== null,
  );
  const allManualValuesValid = validManualFields.length === manualFields.size;
  if (manualFields.size === 2 && allManualValuesValid) {
    const missing = fields.find((candidate) => !manualFields.has(candidate))!;
    const calculated = calculateMissingFuelValue(
      {
        total: positiveValue(values.total),
        liters: positiveValue(values.liters),
        pricePerLiter: positiveValue(values.pricePerLiter),
      },
      missing,
    );
    if (calculated !== null) {
      values[missing] = formatCalculated(missing, calculated);
      return { ...values, manualFields: [...manualFields], calculatedField: missing };
    }
  }

  return { ...values, manualFields: [...manualFields], calculatedField: null };
}

export function getFuelEntryValues(state: FuelEntryState): FuelEntryValues {
  return {
    total: parseDecimal(state.total),
    liters: parseDecimal(state.liters),
    pricePerLiter: parseDecimal(state.pricePerLiter),
  };
}

/** Deterministic Smart Fuel trio. A fuel record needs at least two of these. */
export const FUEL_CORE_FIELDS: readonly FuelValueField[] = ['total', 'liters', 'pricePerLiter'];

export const FUEL_CORE_RULE_MESSAGE =
  'Yakıt kaydı için toplam tutar, litre ve litre fiyatından en az ikisini girin. Üçüncü değer otomatik hesaplanır.';

export interface FuelEntryValidation {
  valid: boolean;
  errors: Partial<Record<FuelValueField, 'required' | 'invalid'>>;
  /** How many of the deterministic trio hold a valid positive value. */
  coreValueCount: number;
  /** Set when the save is blocked purely by the two-of-three trio rule. */
  reason?: 'insufficient_core_values';
}

export function validateFuelEntry(state: FuelEntryState): FuelEntryValidation {
  const values = getFuelEntryValues(state);
  const errors: Partial<Record<FuelValueField, 'required' | 'invalid'>> = {};
  const isValidPositive = (raw: string, parsed: number | null) =>
    raw.trim().length > 0 && parsed !== null && parsed > 0;

  const coreValueCount = FUEL_CORE_FIELDS.filter((field) =>
    isValidPositive(state[field], values[field]),
  ).length;

  if (state.total.trim() && (values.total === null || values.total <= 0)) errors.total = 'invalid';
  if (state.liters.trim() && (values.liters === null || values.liters <= 0)) errors.liters = 'invalid';
  if (state.pricePerLiter.trim() && (values.pricePerLiter === null || values.pricePerLiter <= 0)) {
    errors.pricePerLiter = 'invalid';
  }

  const insufficient = coreValueCount < 2;
  return {
    valid: Object.keys(errors).length === 0 && !insufficient,
    errors,
    coreValueCount,
    ...(insufficient && Object.keys(errors).length === 0
      ? { reason: 'insufficient_core_values' as const }
      : {}),
  };
}
