import { describe, expect, it } from 'vitest';
import type { BodyCondition } from '@/domain/entities';
import {
  areBodyConditionSetsEqual,
  formatBodyConditionSet,
  getDisabledBodyConditionIds,
  getRepresentativeBodyCondition,
  normalizeBodyConditions,
  resolvePersistedBodyConditions,
  toggleBodyCondition,
  validateBodyConditions,
} from './bodyConditionRules';

const primary: BodyCondition[] = ['original', 'painted', 'locally_painted', 'replaced'];

describe('body condition compatibility rules', () => {
  it('accepts empty, every single primary, damaged alone, and each primary with damaged', () => {
    expect(validateBodyConditions([]).valid).toBe(true);
    expect(validateBodyConditions(['damaged']).valid).toBe(true);
    for (const condition of primary) {
      expect(validateBodyConditions([condition])).toEqual({ valid: true, code: 'valid' });
      expect(validateBodyConditions([condition, 'damaged'])).toEqual({
        valid: true,
        code: 'valid',
      });
    }
  });

  it('keeps unknown exclusive and rejects every conflicting primary pair', () => {
    expect(validateBodyConditions(['unknown'])).toEqual({ valid: true, code: 'valid' });
    for (const condition of [...primary, 'damaged'] as BodyCondition[]) {
      expect(validateBodyConditions(['unknown', condition]).code).toBe('unknown_must_be_exclusive');
    }
    for (let left = 0; left < primary.length; left += 1) {
      for (let right = left + 1; right < primary.length; right += 1) {
        expect(validateBodyConditions([primary[left], primary[right]]).code).toBe(
          'multiple_primary_conditions',
        );
      }
    }
  });

  it('reports unsupported condition identifiers without throwing', () => {
    expect(validateBodyConditions(['scratched'])).toEqual({
      valid: false,
      code: 'unsupported_condition',
    });
  });

  it('replaces primary selections while preserving damaged', () => {
    expect(toggleBodyCondition(['original', 'damaged'], 'painted')).toEqual(['painted', 'damaged']);
    expect(toggleBodyCondition(['painted', 'damaged'], 'painted')).toEqual(['damaged']);
  });

  it('makes unknown exclusive and lets a known selection replace it', () => {
    expect(toggleBodyCondition(['painted', 'damaged'], 'unknown')).toEqual(['unknown']);
    expect(toggleBodyCondition(['unknown'], 'damaged')).toEqual(['damaged']);
    expect(toggleBodyCondition(['unknown'], 'original')).toEqual(['original']);
    expect(toggleBodyCondition(['unknown'], 'unknown')).toEqual([]);
  });

  it('normalizes ordering and duplicates without mutating the source array', () => {
    const input: BodyCondition[] = ['damaged', 'painted', 'damaged'];
    expect(normalizeBodyConditions(input)).toEqual(['painted', 'damaged']);
    expect(input).toEqual(['damaged', 'painted', 'damaged']);
    expect(areBodyConditionSetsEqual(['damaged', 'painted'], ['painted', 'damaged'])).toBe(true);
  });

  it('preserves legacy single values and uses child values when present', () => {
    expect(resolvePersistedBodyConditions('painted', [], false)).toEqual(['painted']);
    expect(resolvePersistedBodyConditions('damaged', [], false)).toEqual(['damaged']);
    expect(resolvePersistedBodyConditions(null, [], false)).toEqual([]);
    expect(resolvePersistedBodyConditions('unknown', [], true)).toEqual([]);
    expect(resolvePersistedBodyConditions('damaged', ['painted', 'damaged'], true)).toEqual([
      'painted',
      'damaged',
    ]);
  });

  it('uses a deterministic representative without hiding the full text summary', () => {
    expect(getRepresentativeBodyCondition(['painted', 'damaged'])).toBe('damaged');
    expect(getRepresentativeBodyCondition([])).toBeNull();
    expect(formatBodyConditionSet(['painted', 'damaged'])).toBe('Boyalı + Hasarlı');
    expect(formatBodyConditionSet([])).toBe('Durum girilmedi');
    expect(getDisabledBodyConditionIds(['unknown'])).toEqual([]);
  });
});
