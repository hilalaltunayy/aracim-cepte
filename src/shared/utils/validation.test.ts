import { describe, expect, it } from 'vitest';
import {
  isNonNegativeInteger,
  isPositiveFinite,
  isValidDateOnly,
  isValidEmail,
  isValidModelYear,
  isValidRequiredText,
} from './validation';
import { getFriendlyError } from './errors';

describe('input and data-integrity validation', () => {
  it('rejects empty, whitespace-only and extremely long required text', () => {
    expect(isValidRequiredText('', 10)).toBe(false);
    expect(isValidRequiredText('   ', 10)).toBe(false);
    expect(isValidRequiredText(' normal ', 10)).toBe(true);
    expect(isValidRequiredText('x'.repeat(11), 10)).toBe(false);
  });

  it('rejects malformed and oversized email addresses', () => {
    expect(isValidEmail('kullanici@example.com')).toBe(true);
    expect(isValidEmail('kullanici@')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail(`${'a'.repeat(250)}@example.com`)).toBe(false);
  });

  it('rejects zero, negative, NaN and Infinity amounts', () => {
    expect(isPositiveFinite(0)).toBe(false);
    expect(isPositiveFinite(-1)).toBe(false);
    expect(isPositiveFinite(Number.NaN)).toBe(false);
    expect(isPositiveFinite(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isPositiveFinite(0.01)).toBe(true);
  });

  it('validates mileage, model year and date-only values', () => {
    expect(isNonNegativeInteger(-1)).toBe(false);
    expect(isNonNegativeInteger(10.5)).toBe(false);
    expect(isNonNegativeInteger(0)).toBe(true);
    expect(isValidModelYear(1885, 2026)).toBe(false);
    expect(isValidModelYear(2027, 2026)).toBe(true);
    expect(isValidModelYear(2028, 2026)).toBe(false);
    expect(isValidDateOnly('2026-12-31')).toBe(true);
    expect(isValidDateOnly('2026-13-01')).toBe(false);
  });

  it('maps network, expired-session and raw backend failures to safe Turkish messages', () => {
    expect(getFriendlyError(new Error('Failed to fetch'))).toMatch(/bağlantı/i);
    expect(getFriendlyError(new Error('JWT expired'))).toMatch(/oturum/i);
    expect(getFriendlyError(new Error('sensitive backend detail 123'))).not.toContain(
      'sensitive backend',
    );
  });
});
