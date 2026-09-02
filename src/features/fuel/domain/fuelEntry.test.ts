import { describe, expect, it } from 'vitest';
import {
  createFuelEntryState,
  getFuelEntryValues,
  updateFuelEntry,
  validateFuelEntry,
  type FuelValueField,
} from './fuelEntry';

function enter(first: [FuelValueField, string], second: [FuelValueField, string]) {
  let state = createFuelEntryState();
  state = updateFuelEntry(state, first[0], first[1]);
  return updateFuelEntry(state, second[0], second[1]);
}

describe('smart fuel entry', () => {
  it('calculates liters from total and unit price', () => {
    const state = enter(['total', '1000'], ['pricePerLiter', '50']);
    expect(getFuelEntryValues(state)).toEqual({ total: 1000, liters: 20, pricePerLiter: 50 });
    expect(state.calculatedField).toBe('liters');
  });

  it('calculates total from liters and unit price', () => {
    const state = enter(['liters', '20'], ['pricePerLiter', '50']);
    expect(getFuelEntryValues(state)).toEqual({ total: 1000, liters: 20, pricePerLiter: 50 });
    expect(state.calculatedField).toBe('total');
  });

  it('calculates unit price from total and liters', () => {
    const state = enter(['total', '1000'], ['liters', '20']);
    expect(getFuelEntryValues(state)).toEqual({ total: 1000, liters: 20, pricePerLiter: 50 });
    expect(state.calculatedField).toBe('pricePerLiter');
  });

  it('recalculates the derived value when a source changes without a feedback loop', () => {
    let state = enter(['total', '1000'], ['liters', '20']);
    state = updateFuelEntry(state, 'total', '1200');
    expect(getFuelEntryValues(state).pricePerLiter).toBe(60);
    expect(state.manualFields.sort()).toEqual(['liters', 'total']);
  });

  it('gives an explicitly edited calculated field user precedence', () => {
    let state = enter(['total', '1000'], ['liters', '20']);
    state = updateFuelEntry(state, 'pricePerLiter', '55');
    expect(state.calculatedField).toBeNull();
    expect(getFuelEntryValues(state)).toEqual({ total: 1000, liters: 20, pricePerLiter: 55 });
  });

  it('keeps all existing persisted values manual during edit', () => {
    let state = createFuelEntryState({ total: 500, liters: 10, pricePerLiter: 50 });
    state = updateFuelEntry(state, 'total', '600');
    expect(getFuelEntryValues(state)).toEqual({ total: 600, liters: 10, pricePerLiter: 50 });
    expect(state.calculatedField).toBeNull();
  });

  it('limits visible calculated precision without losing numeric safety', () => {
    const state = enter(['total', '1000'], ['pricePerLiter', '43,29']);
    expect(state.liters).toMatch(/^\d+(,\d{1,3})?$/);
    expect(getFuelEntryValues(state).liters).toBeCloseTo(23.1, 2);
  });

  it('blocks a single-core-value record and preserves unknown values as null (REV-005 trio rule)', () => {
    const state = updateFuelEntry(createFuelEntryState(), 'total', '500');
    const result = validateFuelEntry(state);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('insufficient_core_values');
    expect(result.coreValueCount).toBe(1);
    expect(getFuelEntryValues(state)).toEqual({ total: 500, liters: null, pricePerLiter: null });
  });

  it.each([
    createFuelEntryState({ total: 500, liters: 10 }),
    createFuelEntryState({ total: 500, pricePerLiter: 50 }),
    createFuelEntryState({ total: 500, liters: 10, pricePerLiter: 50 }),
  ])('accepts every supported total-based field combination', (state) => {
    expect(validateFuelEntry(state).valid).toBe(true);
  });

  it('rejects a completely empty entry', () => {
    const result = validateFuelEntry(createFuelEntryState());
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('insufficient_core_values');
  });

  it('calculates the third value so two entered core values satisfy the save rule', () => {
    const state = enter(['liters', '20'], ['pricePerLiter', '45']);
    const result = validateFuelEntry(state);
    expect(result.valid).toBe(true);
    expect(result.coreValueCount).toBe(3);
    expect(getFuelEntryValues(state).total).toBeCloseTo(900, 2);
  });

  it.each(['0', '-1', 'NaN', 'Infinity'])('rejects unsafe optional value %s', (value) => {
    const state = updateFuelEntry(
      updateFuelEntry(createFuelEntryState(), 'total', '500'),
      'liters',
      value,
    );
    expect(validateFuelEntry(state).valid).toBe(false);
  });

  it('does not divide by zero or produce Infinity', () => {
    const state = enter(['total', '500'], ['pricePerLiter', '0']);
    expect(state.liters).toBe('');
    expect(validateFuelEntry(state).valid).toBe(false);
  });
});
