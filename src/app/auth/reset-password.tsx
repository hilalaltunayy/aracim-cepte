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
import { useIncomingAuthCallbackUrl } from '@/features/auth/incomingAuthUrl';
import { validateNewPassword } from '@/features/auth/passwordRecovery';
import { spacing, typography, useThemedStyles, type AppTheme } from '@/shared/theme';
import { useAuthStore } from '@/store/authStore';

type Phase = 'loading' | 'ready' | 'success' | 'error';

export default function ResetPasswordScreen() {
  const styles = useThemedStyles(createStyles);
  const incoming = useIncomingAuthCallbackUrl();
  const processed = useRef(false);
  const [establishPhase, setEstablishPhase] = useState<Phase | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { establishRecovery, updateRecoveredPassword, busy, error, clearError } = useAuthStore();
  const validationError = validateNewPassword(password, confirmation);

  useEffect(() => {
    if (processed.current || !incoming.url) return;
    processed.current = true;
    void establishRecovery(incoming.url).then((ready) =>
      setEstablishPhase(ready ? 'ready' : 'error'),
    );
  }, [establishRecovery, incoming.url]);

  // A settled deep link with no auth params means there is nothing to verify.
  const phase: Phase =
    establishPhase ?? (incoming.settled && !incoming.url ? 'error' : 'loading');

  const submit = async () => {
    setSubmitted(true);
    if (validationError) return;
    clearError();
    if (await updateRecoveredPassword(password)) setEstablishPhase('success');
  };

  if (phase === 'loading') return <LoadingScreen />;

  if (phase === 'success') {
    return (
      <Screen style={styles.screen}>
        <FormSection title="Şifreniz yenilendi">
          <Text style={styles.body}>Şifreniz yenilendi. Yeni şifrenizle giriş yapabilirsiniz.</Text>
          <AppButton title="Giriş ekranına dön" onPress={() => router.replace('/auth/login')} />
        </FormSection>
      </Screen>
    );
  }

  if (phase === 'error') {
    return (
      <Screen style={styles.screen}>
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
    <Screen style={styles.screen}>
      <View style={styles.intro}>
        <Text style={styles.title}>Yeni şifrenizi belirleyin</Text>
        <Text style={styles.body}>
          Hesabınızı korumak için en az 8 karakterli, başka yerde kullanmadığınız bir şifre seçin.
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
          error={submitted && validationError?.includes('en az') ? validationError : null}
        />
        <PasswordInput
          label="Yeni şifre tekrar"
          value={confirmation}
          onChangeText={setConfirmation}
          autoComplete="new-password"
          maxLength={72}
          error={submitted && validationError?.includes('eşleşmiyor') ? validationError : null}
        />
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
  });
