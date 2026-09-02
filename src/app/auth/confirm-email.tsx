import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { AppButton, ErrorBanner, FormSection, LoadingScreen, Screen } from '@/shared/components/ui';
import {
  EMAIL_CONFIRMATION_INVALID_MESSAGE,
  parseEmailConfirmationCallback,
} from '@/features/auth/emailConfirmation';
import { useIncomingAuthCallbackUrl } from '@/features/auth/incomingAuthUrl';
import { spacing, typography, useThemedStyles, type AppTheme } from '@/shared/theme';

type Phase = 'loading' | 'success' | 'error';

export default function ConfirmEmailScreen() {
  const styles = useThemedStyles(createStyles);
  const incoming = useIncomingAuthCallbackUrl();

  const phase: Phase = incoming.url
    ? parseEmailConfirmationCallback(incoming.url).kind === 'success'
      ? 'success'
      : 'error'
    : incoming.settled
      ? 'error'
      : 'loading';

  if (phase === 'loading') return <LoadingScreen />;

  return (
    <Screen style={styles.screen}>
      {phase === 'success' ? (
        <FormSection title="E-posta adresiniz doğrulandı">
          <Text style={styles.body}>
            Hesabınız etkinleştirildi. Giriş ekranından e-posta adresiniz ve şifrenizle devam
            edebilirsiniz.
          </Text>
          <AppButton title="Giriş ekranına dön" onPress={() => router.replace('/auth/login')} />
        </FormSection>
      ) : (
        <>
          <ErrorBanner message={EMAIL_CONFIRMATION_INVALID_MESSAGE} />
          <AppButton title="Giriş ekranına dön" onPress={() => router.replace('/auth/login')} />
          <AppButton
            title="Yeniden kayıt ekranına dön"
            variant="secondary"
            onPress={() => router.replace('/auth/register')}
          />
        </>
      )}
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    screen: { gap: spacing.xl },
    body: { color: colors.textSecondary, ...typography.body },
  });
