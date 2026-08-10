import { describe, expect, it } from 'vitest';
import { evaluateMileageTimeline, MileageTimelineRecord } from './mileageTimeline';

const record = (id: string, recordDate: string, kilometer: number | null): MileageTimelineRecord => ({
  id,
  recordDate,
  kilometer,
});

const evaluate = (
  targetRecordDate: string,
  targetMileage: number | null,
  records: MileageTimelineRecord[] = [],
  currentMileage = 150_000,
  targetRecordId?: string,
) =>
  evaluateMileageTimeline({
    currentMileage,
    targetRecordDate,
    targetMileage,
    records,
    targetRecordId,
  });

describe('historical mileage timeline', () => {
  it('accepts a historical mileage below current without lowering the high-water mark', () => {
    expect(evaluate('2026-04-01', 148_000)).toMatchObject({
      level: 'valid',
      advancesCurrentMileage: false,
      nextCurrentMileage: 150_000,
    });
  });

  it('accepts a mileage between its nearest previous and next known events', () => {
    expect(
      evaluate('2026-05-01', 147_000, [
        record('previous', '2026-04-01', 145_000),
        record('next', '2026-06-01', 149_000),
      ]),
    ).toMatchObject({ level: 'valid', previousKnownMileage: 145_000, nextKnownMileage: 149_000 });
  });

  it('warns when a target exceeds the next known event mileage', () => {
    const result = evaluate('2026-05-01', 170_000, [
      record('previous', '2026-04-01', 145_000),
      record('next', '2026-06-01', 149_000),
    ]);
    expect(result.level).toBe('warning');
    expect(result.warningCodes).toContain('higher_than_next');
  });

  it('accepts unknown mileage and leaves current mileage unchanged', () => {
    expect(evaluate('2026-05-01', null)).toMatchObject({
      level: 'valid',
      nextCurrentMileage: 150_000,
      advancesCurrentMileage: false,
    });
  });

  it('advances current mileage for a larger known event', () => {
    expect(evaluate('2026-08-01', 151_000)).toMatchObject({
      level: 'valid',
      nextCurrentMileage: 151_000,
      advancesCurrentMileage: true,
    });
  });

  it('excludes the edited record itself and never lowers current mileage', () => {
    expect(
      evaluate(
        '2026-04-01',
        148_000,
        [record('editing', '2026-04-01', 160_000)],
        160_000,
        'editing',
      ),
    ).toMatchObject({ level: 'valid', nextCurrentMileage: 160_000 });
  });

  it.each([
    [Number.NaN, 'invalid_mileage'],
    [Number.POSITIVE_INFINITY, 'invalid_mileage'],
    [-1, 'negative_mileage'],
  ])('blocks invalid target mileage %s', (targetMileage, blockingCode) => {
    expect(evaluate('2026-05-01', targetMileage)).toMatchObject({
      level: 'blockingError',
      blockingCode,
    });
  });

  it('treats different known mileages on the same day as an advisory warning', () => {
    const result = evaluate('2026-05-01', 147_000, [
      record('same-day', '2026-05-01', 146_500),
    ]);
    expect(result.level).toBe('warning');
    expect(result.warningCodes).toEqual(['same_day_conflict']);
  });

  it('uses conservative bounds without inventing order within neighboring same-day records', () => {
    const result = evaluate('2026-05-01', 146_500, [
      record('previous-a', '2026-04-01', 145_000),
      record('previous-b', '2026-04-01', 146_000),
      record('next-a', '2026-06-01', 149_500),
      record('next-b', '2026-06-01', 149_000),
    ]);
    expect(result).toMatchObject({
      level: 'valid',
      previousKnownMileage: 146_000,
      nextKnownMileage: 149_000,
    });
  });
});
