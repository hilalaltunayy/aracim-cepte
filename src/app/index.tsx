import { Redirect } from 'expo-router';
import { LoadingScreen } from '@/shared/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { decideEntryRoute } from '@/features/auth/routeDecision';

export default function EntryScreen() {
  const { session, ready, recoveryMode } = useAuthStore();
  const { hydrated, onboardingSeen, bootstrapped, vehicles } = useDataStore();

  const decision = decideEntryRoute({
    authReady: ready,
    cacheHydrated: hydrated,
    onboardingSeen,
    recoveryMode,
    authenticated: Boolean(session),
    dataBootstrapped: bootstrapped,
    vehicleCount: vehicles.length,
  });
  if (decision === 'loading') return <LoadingScreen />;
  return <Redirect href={decision} />;
}
