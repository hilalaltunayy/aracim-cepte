import { describe, expect, it } from 'vitest';
import { decideEntryRoute } from './routeDecision';

const ready = {
  authReady: true,
  cacheHydrated: true,
  onboardingSeen: true,
  recoveryMode: false,
  authenticated: false,
  dataBootstrapped: false,
  vehicleCount: 0,
};

describe('auth and entry route guard decisions', () => {
  it('keeps incomplete bootstrap states on the loading screen', () => {
    expect(decideEntryRoute({ ...ready, authReady: false })).toBe('loading');
    expect(decideEntryRoute({ ...ready, cacheHydrated: false })).toBe('loading');
  });

  it('routes unauthenticated and onboarding users deterministically', () => {
    expect(decideEntryRoute({ ...ready, onboardingSeen: false })).toBe('/onboarding');
    expect(decideEntryRoute(ready)).toBe('/auth/login');
  });

  it('routes only a real recovery state to the password update screen', () => {
    expect(decideEntryRoute({ ...ready, recoveryMode: true, authenticated: true })).toBe(
      '/auth/reset-password',
    );
    expect(decideEntryRoute({ ...ready, authenticated: true })).toBe('loading');
  });

  it('distinguishes authenticated users with and without a vehicle', () => {
    expect(decideEntryRoute({ ...ready, authenticated: true, dataBootstrapped: true })).toBe(
      '/vehicle/edit',
    );
    expect(
      decideEntryRoute({
        ...ready,
        authenticated: true,
        dataBootstrapped: true,
        vehicleCount: 1,
      }),
    ).toBe('/(tabs)');
  });
});
