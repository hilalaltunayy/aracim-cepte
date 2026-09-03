import { describe, expect, it } from 'vitest';
import { evaluatePasswordPolicy, isPasswordStrong } from './passwordPolicy';

describe('evaluatePasswordPolicy', () => {
  it('accepts a password that meets every rule', () => {
    const result = evaluatePasswordPolicy('Guvenli-123!');
    expect(result.valid).toBe(true);
    expect(result.message).toBeNull();
    expect(result.checks).toEqual({ length: true, uppercase: true, digit: true, special: true });
  });

  it('reports the first failing rule in order', () => {
    expect(evaluatePasswordPolicy('Ab1!').message).toMatch(/8 karakter/);
    expect(evaluatePasswordPolicy('guvenli123!').message).toMatch(/büyük harf/);
    expect(evaluatePasswordPolicy('Guvenlixyz!').message).toMatch(/rakam/);
    expect(evaluatePasswordPolicy('Guvenli1234').message).toMatch(/özel karakter/);
    expect(evaluatePasswordPolicy(`A1a!${'x'.repeat(80)}`).message).toMatch(/72 karakter/);
  });

  it('treats a hyphen or space-free symbol as a special character', () => {
    expect(isPasswordStrong('Parola-2026')).toBe(true);
    expect(isPasswordStrong('Parola.2026')).toBe(true);
    expect(isPasswordStrong('Parola 2026')).toBe(false); // space alone is not a special
  });

  it('does not mutate or accept existing weak passwords implicitly', () => {
    expect(isPasswordStrong('password')).toBe(false);
    expect(isPasswordStrong('12345678')).toBe(false);
  });
});
