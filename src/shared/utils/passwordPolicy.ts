/**
 * Password strength policy (ROUND2-001). Applied only when a password is newly
 * created or changed — signup, password reset, and any future password-change
 * flow. Existing stored passwords are never re-validated or migrated.
 *
 * Rules: at least 8 characters, at least one uppercase letter, at least one
 * digit and at least one special (non-alphanumeric) character. The 72-character
 * ceiling matches the bcrypt/Supabase limit.
 */
export interface PasswordPolicyResult {
  valid: boolean;
  /** First failing rule as a user-facing Turkish message, or null when valid. */
  message: string | null;
  checks: {
    length: boolean;
    uppercase: boolean;
    digit: boolean;
    special: boolean;
  };
}

export const PASSWORD_POLICY_HINT =
  'En az 8 karakter, 1 büyük harf, 1 rakam ve 1 özel karakter içermelidir.';

export function evaluatePasswordPolicy(password: string): PasswordPolicyResult {
  const checks = {
    length: password.length >= 8,
    uppercase: /\p{Lu}/u.test(password),
    digit: /\d/.test(password),
    special: /[^\p{L}\p{N}\s]/u.test(password),
  };

  let message: string | null = null;
  if (password.length > 72) message = 'Şifre en fazla 72 karakter olabilir.';
  else if (!checks.length) message = 'Şifre en az 8 karakter olmalıdır.';
  else if (!checks.uppercase) message = 'Şifre en az 1 büyük harf içermelidir.';
  else if (!checks.digit) message = 'Şifre en az 1 rakam içermelidir.';
  else if (!checks.special) message = 'Şifre en az 1 özel karakter içermelidir.';

  return { valid: message === null, message, checks };
}

export function isPasswordStrong(password: string): boolean {
  return password.length <= 72 && evaluatePasswordPolicy(password).valid;
}
