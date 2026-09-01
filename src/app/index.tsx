import { Redirect } from 'expo-router';
import { AppButton, ErrorBanner, LoadingScreen, Screen } from '@/shared/components/ui';
import { spacing } from '@/shared/theme';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { decideEntryRoute } from '@/features/auth/routeDecision';

export default function EntryScreen() {
  const { session, ready, recoveryMode } = useAuthStore();
  const { hydrated, onboardingSeen, bootstrapped, bootstrapError, vehicles, bootstrap } =
    useDataStore();

  const decision = decideEntryRoute({
    authReady: ready,
    cacheHydrated: hydrated,
    onboardingSeen,
    recoveryMode,
    authenticated: Boolean(session),
    dataBootstrapped: bootstrapped,
    dataBootstrapFailed: Boolean(bootstrapError),
    vehicleCount: vehicles.length,
  });
  if (decision === 'loading') return <LoadingScreen />;
  if (decision === 'connection-error') {
    return (
      <Screen scroll={false} style={{ justifyContent: 'center', gap: spacing.lg }}>
        <ErrorBanner message={bootstrapError ?? 'Araç verileri şu anda yüklenemiyor.'} />
        <AppButton title="Tekrar dene" onPress={() => void bootstrap()} />
      </Screen>
    );
  }
  return <Redirect href={decision} />;
}
