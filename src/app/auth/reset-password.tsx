import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  AppButton,
  ErrorBanner,
  FormSection,
  LoadingScreen,
  PasswordInput,
  Screen,
} from '@/shared/components/ui';
import { AUTH_CALLBACK_ROUTES, useIncomingAuthCallbackUrl } from '@/features/auth/incomingAuthUrl';
import { clearAuthCallback } from '@/features/auth/authCallbackCapture';
import { describeAuthCallbackUrl, logRecoveryTrace } from '@/features/auth/recoveryTrace';
import { validateNewPassword } from '@/features/auth/passwordRecovery';
import { spacing, typography, useThemedStyles, type AppTheme } from '@/shared/theme';
import { useAuthStore } from '@/store/authStore';

type Phase = 'loading' | 'ready' | 'success' | 'error';

// Screen-specific copy only — validateNewPassword's real policy (8-72 chars,
// 1 uppercase, 1 digit, 1 special character) is unchanged.
const PASSWORD_REQUIREMENT_HINT =
  'Şifre en az 8 karakter olmalıdır ve içerisinde en az bir büyük harf, bir rakam ve bir özel karakter bulunmalıdır.';

export default function ResetPasswordScreen() {
  const styles = useThemedStyles(createStyles);
  const incoming = useIncomingAuthCallbackUrl(AUTH_CALLBACK_ROUTES.passwordRecovery);
  // Keyed by URL, not a plain flag: a tester who taps an expired link and then a
  // fresh one never leaves this screen, so the second link arrives while it is
  // still mounted. A boolean would swallow it and leave the stale error up.
  const processedUrl = useRef<string | null>(null);
  const [establishPhase, setEstablishPhase] = useState<Phase | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { establishRecovery, updateRecoveredPassword, busy, error, clearError, recoveryMode } =
    useAuthStore();
  const validationError = validateNewPassword(password, confirmation);
  const matchError = validationError === 'Şifreler eşleşmiyor.';

  useEffect(() => {
    logRecoveryTrace({
      stage: 'route',
      source: 'route',
      routeMounted: true,
      hasInitialUrl: Boolean(incoming.url),
      ...describeAuthCallbackUrl(incoming.url),
      callbackAccepted: Boolean(incoming.url) && processedUrl.current !== incoming.url,
      duplicateSuppressed: Boolean(incoming.url) && processedUrl.current === incoming.url,
    });
    if (!incoming.url || processedUrl.current === incoming.url) return;
    processedUrl.current = incoming.url;
    void establishRecovery(incoming.url).then((ready) => {
      setEstablishPhase(ready ? 'ready' : 'error');
      // The token is spent either way; drop it so a remount cannot resubmit it
      // and a failed link cannot block the fresh one the user requests next.
      clearAuthCallback();
    });
  }, [establishRecovery, incoming.url]);

  // A settled deep link with no auth params means there is nothing to verify.
  // recoveryMode wins over a stale error: the global auth listener can still
  // catch a late PASSWORD_RECOVERY event after establishRecovery resolved false.
  const phase: Phase =
    establishPhase === 'success'
      ? 'success'
      : recoveryMode
        ? 'ready'
        : (establishPhase ?? (incoming.settled && !incoming.url ? 'error' : 'loading'));

  const submit = async () => {
    setSubmitted(true);
    if (validationError) return;
    clearError();
    if (await updateRecoveredPassword(password)) setEstablishPhase('success');
  };

  if (phase === 'loading') return <LoadingScreen />;

  if (phase === 'success') {
    return (
      <Screen style={styles.screen} centered>
        <FormSection title="Şifreniz yenilendi">
          <Text style={styles.body}>Şifreniz yenilendi. Yeni şifrenizle giriş yapabilirsiniz.</Text>
          <AppButton title="Giriş ekranına dön" onPress={() => router.replace('/auth/login')} />
        </FormSection>
      </Screen>
    );
  }

  if (phase === 'error') {
    return (
      <Screen style={styles.screen} centered>
        <ErrorBanner
          message={
            error ?? 'Şifre yenileme bağlantısı kullanılamıyor. Lütfen yeni bir bağlantı isteyin.'
          }
        />
        <AppButton
          title="Yeni bağlantı iste"
          onPress={() => {
            clearError();
            router.replace('/auth/forgot-password');
          }}
        />
        <AppButton
          title="Giriş ekranına dön"
          variant="secondary"
          onPress={() => {
            clearError();
            router.replace('/auth/login');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen} centered>
      <View style={styles.intro}>
        <Text style={styles.title}>Yeni şifrenizi belirleyin</Text>
        <Text style={styles.body}>
          Başka yerde kullanmadığınız güçlü bir şifre seçin.
        </Text>
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      <FormSection title="Yeni şifre">
        <PasswordInput
          label="Yeni şifre"
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          maxLength={72}
          mascot
          error={submitted && validationError && !matchError ? validationError : null}
        />
        <PasswordInput
          label="Yeni şifre tekrar"
          value={confirmation}
          onChangeText={setConfirmation}
          autoComplete="new-password"
          maxLength={72}
          mascot
          error={submitted && matchError ? validationError : null}
        />
        <Text style={styles.hint}>{PASSWORD_REQUIREMENT_HINT}</Text>
        <AppButton
          title="Şifreyi yenile"
          loading={busy}
          disabled={Boolean(validationError)}
          onPress={submit}
        />
      </FormSection>
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    screen: { gap: spacing.xl },
    intro: { gap: spacing.sm },
    title: { color: colors.navy, ...typography.sectionTitle },
    body: { color: colors.muted, ...typography.body },
    hint: { color: colors.muted, ...typography.caption, marginTop: -spacing.xs },
  });
