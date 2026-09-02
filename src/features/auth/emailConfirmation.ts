export type EmailConfirmationResult =
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export const EMAIL_CONFIRMATION_INVALID_MESSAGE =
  'Doğrulama bağlantısı geçersiz, süresi dolmuş veya daha önce kullanılmış. Lütfen giriş yapmayı deneyin ya da yeni bir doğrulama e-postası isteyin.';

function paramsFromUrl(input: string): URLSearchParams {
  const url = new URL(input);
  const params = new URLSearchParams(url.search);
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  new URLSearchParams(hash).forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  return params;
}

export function parseEmailConfirmationCallback(
  input: string | null | undefined,
): EmailConfirmationResult {
  if (!input) return { kind: 'error', message: EMAIL_CONFIRMATION_INVALID_MESSAGE };
  try {
    const params = paramsFromUrl(input);
    if (params.get('error') || params.get('error_description')) {
      return { kind: 'error', message: EMAIL_CONFIRMATION_INVALID_MESSAGE };
    }

    // PKCE verify redirects carry `?code=` and may omit `type`; the address is
    // already the dedicated confirm-email route, so a code here is a signup
    // confirmation that Supabase completed server-side before redirecting.
    const hasPkceCode = Boolean(params.get('code'));
    const hasImplicitSession =
      params.get('type') === 'signup' &&
      Boolean(params.get('access_token') && params.get('refresh_token'));
    return hasPkceCode || hasImplicitSession
      ? { kind: 'success' }
      : { kind: 'error', message: EMAIL_CONFIRMATION_INVALID_MESSAGE };
  } catch {
    return { kind: 'error', message: EMAIL_CONFIRMATION_INVALID_MESSAGE };
  }
}
