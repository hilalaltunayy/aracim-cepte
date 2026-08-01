import { parseDateOnly } from './format';

export function isValidEmail(value: string): boolean {
  const normalized = value.trim();
  return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(normalized);
}

export function isValidRequiredText(value: string, maxLength: number): boolean {
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength;
}

export function isValidModelYear(value: number | null, currentYear: number): boolean {
  return value === null || (Number.isInteger(value) && value >= 1886 && value <= currentYear + 1);
}

export function isPositiveFinite(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0;
}

export function isNonNegativeInteger(value: number | null): boolean {
  return value === null || (Number.isInteger(value) && Number.isFinite(value) && value >= 0);
}

export function isValidDateOnly(value: string | null): boolean {
  return value === null || parseDateOnly(value) !== null;
}
