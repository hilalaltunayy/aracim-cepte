import { describe, expect, it } from 'vitest';
import {
  createRecordHref,
  editRecordHref,
  firstRouteParam,
  safeEntityId,
  safeRecordType,
} from './routeParams';

describe('safe record routes', () => {
  it('creates scalar route parameters for every dashboard shortcut', () => {
    expect(createRecordHref('fuel')).toEqual({ pathname: '/record/edit', params: { type: 'fuel' } });
    expect(createRecordHref('maintenance')).toEqual({
      pathname: '/record/edit',
      params: { type: 'maintenance' },
    });
    expect(createRecordHref('expense')).toEqual({
      pathname: '/record/edit',
      params: { type: 'expense' },
    });
    expect(editRecordHref('record-id')).toEqual({
      pathname: '/record/edit',
      params: { id: 'record-id' },
    });
  });

  it('normalizes array parameters and rejects unsupported record types', () => {
    expect(firstRouteParam(['record-id', 'ignored'])).toBe('record-id');
    expect(safeRecordType(['expense'])).toBe('expense');
    expect(safeRecordType('unsupported')).toBe('fuel');
    expect(safeRecordType(undefined)).toBe('fuel');
  });

  it('accepts only UUID-shaped entity route identifiers', () => {
    expect(safeEntityId('70ff69b8-fc71-4bd6-8e1f-e3437e04ee30')).toBe(
      '70ff69b8-fc71-4bd6-8e1f-e3437e04ee30',
    );
    expect(safeEntityId('../other-route')).toBeUndefined();
    expect(safeEntityId('')).toBeUndefined();
  });
});
