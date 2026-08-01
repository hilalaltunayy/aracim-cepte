export type EntryRouteDecision =
  'loading' | '/onboarding' | '/auth/reset-password' | '/auth/login' | '/vehicle/edit' | '/(tabs)';

export function decideEntryRoute(input: {
  authReady: boolean;
  cacheHydrated: boolean;
  onboardingSeen: boolean;
  recoveryMode: boolean;
  authenticated: boolean;
  dataBootstrapped: boolean;
  vehicleCount: number;
}): EntryRouteDecision {
  if (!input.authReady || !input.cacheHydrated) return 'loading';
  if (!input.onboardingSeen) return '/onboarding';
  if (input.recoveryMode) return '/auth/reset-password';
  if (!input.authenticated) return '/auth/login';
  if (!input.dataBootstrapped) return 'loading';
  if (input.vehicleCount === 0) return '/vehicle/edit';
  return '/(tabs)';
}
