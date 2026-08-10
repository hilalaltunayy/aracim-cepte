export type MileageTimelineLevel = 'valid' | 'warning' | 'blockingError';

export type MileageTimelineWarningCode =
  | 'lower_than_previous'
  | 'higher_than_next'
  | 'same_day_conflict';

export type MileageTimelineBlockingCode = 'invalid_mileage' | 'negative_mileage';

export interface MileageTimelineRecord {
  id: string;
  recordDate: string;
  kilometer: number | null;
}

export interface MileageTimelineInput {
  currentMileage: number;
  targetRecordId?: string;
  targetRecordDate: string;
  targetMileage: number | null;
  records: MileageTimelineRecord[];
}

export interface MileageTimelineEvaluation {
  level: MileageTimelineLevel;
  blockingCode: MileageTimelineBlockingCode | null;
  warningCodes: MileageTimelineWarningCode[];
  previousKnownMileage: number | null;
  nextKnownMileage: number | null;
  advancesCurrentMileage: boolean;
  nextCurrentMileage: number;
}

const isKnownMileage = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value >= 0;

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export function evaluateMileageTimeline({
  currentMileage,
  targetRecordId,
  targetRecordDate,
  targetMileage,
  records,
}: MileageTimelineInput): MileageTimelineEvaluation {
  const safeCurrentMileage =
    Number.isFinite(currentMileage) && currentMileage >= 0 ? Math.round(currentMileage) : 0;

  if (targetMileage !== null && !Number.isFinite(targetMileage)) {
    return {
      level: 'blockingError',
      blockingCode: 'invalid_mileage',
      warningCodes: [],
      previousKnownMileage: null,
      nextKnownMileage: null,
      advancesCurrentMileage: false,
      nextCurrentMileage: safeCurrentMileage,
    };
  }

  if (targetMileage !== null && targetMileage < 0) {
    return {
      level: 'blockingError',
      blockingCode: 'negative_mileage',
      warningCodes: [],
      previousKnownMileage: null,
      nextKnownMileage: null,
      advancesCurrentMileage: false,
      nextCurrentMileage: safeCurrentMileage,
    };
  }

  if (targetMileage === null) {
    return {
      level: 'valid',
      blockingCode: null,
      warningCodes: [],
      previousKnownMileage: null,
      nextKnownMileage: null,
      advancesCurrentMileage: false,
      nextCurrentMileage: safeCurrentMileage,
    };
  }

  const roundedTargetMileage = Math.round(targetMileage);
  const comparable = records.filter(
    (record) =>
      record.id !== targetRecordId &&
      isDateOnly(record.recordDate) &&
      isKnownMileage(record.kilometer),
  );
  const previousDates = comparable
    .map((record) => record.recordDate)
    .filter((recordDate) => recordDate < targetRecordDate);
  const nextDates = comparable
    .map((record) => record.recordDate)
    .filter((recordDate) => recordDate > targetRecordDate);
  const sortedPreviousDates = previousDates.sort();
  const previousDate =
    sortedPreviousDates.length > 0
      ? sortedPreviousDates[sortedPreviousDates.length - 1]
      : null;
  const nextDate = nextDates.length > 0 ? nextDates.sort()[0] : null;
  const previousMileages = comparable
    .filter((record) => record.recordDate === previousDate)
    .map((record) => record.kilometer as number);
  const nextMileages = comparable
    .filter((record) => record.recordDate === nextDate)
    .map((record) => record.kilometer as number);

  // Multiple records on one date have no trustworthy intra-day order. For the nearest previous
  // date use its highest known value, and for the nearest next date its lowest known value.
  const previousKnownMileage =
    previousMileages.length > 0 ? Math.max(...previousMileages) : null;
  const nextKnownMileage = nextMileages.length > 0 ? Math.min(...nextMileages) : null;
  const warningCodes: MileageTimelineWarningCode[] = [];

  if (previousKnownMileage !== null && roundedTargetMileage < previousKnownMileage) {
    warningCodes.push('lower_than_previous');
  }
  if (nextKnownMileage !== null && roundedTargetMileage > nextKnownMileage) {
    warningCodes.push('higher_than_next');
  }
  if (
    comparable.some(
      (record) =>
        record.recordDate === targetRecordDate && record.kilometer !== roundedTargetMileage,
    )
  ) {
    warningCodes.push('same_day_conflict');
  }

  return {
    level: warningCodes.length > 0 ? 'warning' : 'valid',
    blockingCode: null,
    warningCodes,
    previousKnownMileage,
    nextKnownMileage,
    advancesCurrentMileage: roundedTargetMileage > safeCurrentMileage,
    nextCurrentMileage: Math.max(safeCurrentMileage, roundedTargetMileage),
  };
}
