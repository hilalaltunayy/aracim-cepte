import type { BodyCondition } from '@/domain/entities';
import {
  bodyConditionCatalog,
  bodyConditionIds,
  bodyConditionLabels,
  primaryBodyConditions,
} from '@/features/bodyCondition/config/bodyConditions';

export type BodyConditionValidationCode =
  'valid' | 'unsupported_condition' | 'multiple_primary_conditions' | 'unknown_must_be_exclusive';

export interface BodyConditionValidation {
  valid: boolean;
  code: BodyConditionValidationCode;
}

const bodyConditionSet = new Set<string>(bodyConditionIds);
const primaryConditionSet = new Set<BodyCondition>(primaryBodyConditions);

export function normalizeBodyConditions(values: readonly BodyCondition[]): BodyCondition[] {
  const unique = new Set(values);
  return bodyConditionCatalog
    .map((condition) => condition.id)
    .filter((condition) => unique.has(condition));
}

export function validateBodyConditions(values: readonly string[]): BodyConditionValidation {
  if (values.some((condition) => !bodyConditionSet.has(condition))) {
    return { valid: false, code: 'unsupported_condition' };
  }
  const normalized = normalizeBodyConditions(values as BodyCondition[]);
  if (normalized.includes('unknown') && normalized.length !== 1) {
    return { valid: false, code: 'unknown_must_be_exclusive' };
  }
  if (normalized.filter((condition) => primaryConditionSet.has(condition)).length > 1) {
    return { valid: false, code: 'multiple_primary_conditions' };
  }
  return { valid: true, code: 'valid' };
}

export function toggleBodyCondition(
  current: readonly BodyCondition[],
  target: BodyCondition,
): BodyCondition[] {
  const normalized = normalizeBodyConditions(current);
  if (target === 'unknown') return normalized.includes('unknown') ? [] : ['unknown'];

  const withoutUnknown = normalized.filter((condition) => condition !== 'unknown');
  if (target === 'damaged') {
    return withoutUnknown.includes('damaged')
      ? withoutUnknown.filter((condition) => condition !== 'damaged')
      : normalizeBodyConditions([...withoutUnknown, 'damaged']);
  }

  if (withoutUnknown.includes(target)) {
    return withoutUnknown.filter((condition) => condition !== target);
  }
  return normalizeBodyConditions([
    ...withoutUnknown.filter((condition) => !primaryConditionSet.has(condition)),
    target,
  ]);
}

// Toggle semantics replace incompatible selections, so every catalog option remains actionable.
export function getDisabledBodyConditionIds(
  _current: readonly BodyCondition[],
): readonly BodyCondition[] {
  return [];
}

export function getRepresentativeBodyCondition(
  conditions: readonly BodyCondition[],
): BodyCondition | null {
  const values = new Set(normalizeBodyConditions(conditions));
  return (
    (['unknown', 'damaged', 'replaced', 'locally_painted', 'painted', 'original'] as const).find(
      (condition) => values.has(condition),
    ) ?? null
  );
}

export function resolvePersistedBodyConditions(
  legacyCondition: BodyCondition | null | undefined,
  storedValues: readonly BodyCondition[],
  conditionSetInitialized = false,
): BodyCondition[] {
  if (conditionSetInitialized) return normalizeBodyConditions(storedValues);
  return legacyCondition ? normalizeBodyConditions([legacyCondition]) : [];
}

export function areBodyConditionSetsEqual(
  left: readonly BodyCondition[],
  right: readonly BodyCondition[],
): boolean {
  const normalizedLeft = normalizeBodyConditions(left);
  const normalizedRight = normalizeBodyConditions(right);
  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((condition, index) => condition === normalizedRight[index])
  );
}

export function formatBodyConditionSet(conditions: readonly BodyCondition[]): string {
  const normalized = normalizeBodyConditions(conditions);
  return normalized.length > 0
    ? normalized.map((condition) => bodyConditionLabels[condition]).join(' + ')
    : 'Durum girilmedi';
}
