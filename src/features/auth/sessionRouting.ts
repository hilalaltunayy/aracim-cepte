export const SESSION_EXPIRED_MESSAGE = 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.';

const publicRoots = new Set(['', 'index', 'onboarding', 'auth', 'legal']);

export function isProtectedRoute(segments: readonly string[]): boolean {
  const root = segments[0] ?? '';
  return !publicRoots.has(root);
}

export function shouldRedirectExpiredSession(input: {
  authReady: boolean;
  authenticated: boolean;
  recoveryMode: boolean;
  segments: readonly string[];
}): boolean {
  return (
    input.authReady &&
    !input.authenticated &&
    !input.recoveryMode &&
    isProtectedRoute(input.segments)
  );
}
