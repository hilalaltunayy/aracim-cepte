import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import {
  AppButton,
  AppInput,
  ErrorBanner,
  FormSection,
  PasswordInput,
  Screen,
} from '@/shared/components/ui';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/data/supabase/client';
import { spacing, typography, useThemedStyles, type AppTheme } from '@/shared/theme';
import { isValidEmail } from '@/shared/utils/validation';
import {
  REGISTRATION_LEGAL_LINKS,
  REGISTRATION_LEGAL_NOTICE,
  REGISTRATION_SUCCESS,
  createLoginPrefillHref,
  normalizeRegistrationEmail,
} from '@/features/auth/registrationFlow';
import {
  CONFIRMATION_RESEND_COOLDOWN_MS,
  CONFIRMATION_RESEND_LIMIT_MESSAGE,
  CONFIRMATION_RESEND_MAX_ATTEMPTS,
  CONFIRMATION_RESEND_SUCCESS_MESSAGE,
  getConfirmationCooldownSeconds,
} from '@/features/auth/confirmationResend';
import { openLegalLink } from '@/features/legal/legalLinkOpener';

export default function RegisterScreen() {
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);
  const { signUp, resendConfirmation, busy, error, clearError } = useAuthStore();
  useFocusEffect(
    useCallback(() => {
      clearError();
    }, [clearError]),
  );
  const valid = isValidEmail(email) && password.length >= 8 && password === confirmation;
  const submit = async () => {
    if (!valid) return;
    if (await signUp(email, password, name)) {
      setPassword('');
      setConfirmation('');
      setRegisteredEmail(normalizeRegistrationEmail(email));
      const nextAllowedAt = Date.now() + CONFIRMATION_RESEND_COOLDOWN_MS;
      setCooldownUntil(nextAllowedAt);
      setCooldownSeconds(getConfirmationCooldownSeconds(nextAllowedAt));
    }
  };

  useEffect(() => {
    if (!registeredEmail || cooldownUntil <= 0) return;
    const update = () => setCooldownSeconds(getConfirmationCooldownSeconds(cooldownUntil));
    update();
    const timer = setInterval(update, 1_000);
    return () => clearInterval(timer);
  }, [cooldownUntil, registeredEmail]);

  const resend = async () => {
    if (
      !registeredEmail ||
      cooldownSeconds > 0 ||
      resendAttempts >= CONFIRMATION_RESEND_MAX_ATTEMPTS
    )
      return;
    setResendMessage(null);
    const nextAttemptCount = resendAttempts + 1;
    const sent = await resendConfirmation(registeredEmail);
    setResendAttempts(nextAttemptCount);
    if (sent) {
      setResendMessage(CONFIRMATION_RESEND_SUCCESS_MESSAGE);
      const nextAllowedAt = Date.now() + CONFIRMATION_RESEND_COOLDOWN_MS;
      setCooldownUntil(nextAllowedAt);
      setCooldownSeconds(getConfirmationCooldownSeconds(nextAllowedAt));
    }
  };

  if (registeredEmail) {
    return (
      <Screen style={styles.successScreen}>
        <FormSection title={REGISTRATION_SUCCESS.title}>
          <Text style={styles.successMessage}>{REGISTRATION_SUCCESS.message}</Text>
          {error ? <ErrorBanner message={error} /> : null}
          {resendMessage ? <Text style={styles.resendSuccess}>{resendMessage}</Text> : null}
          {resendAttempts >= CONFIRMATION_RESEND_MAX_ATTEMPTS ? (
            <ErrorBanner message={CONFIRMATION_RESEND_LIMIT_MESSAGE} />
          ) : null}
          <AppButton
            title={
              cooldownSeconds > 0
                ? `${cooldownSeconds} sn sonra tekrar gönderebilirsiniz`
                : resendAttempts >= CONFIRMATION_RESEND_MAX_ATTEMPTS
                  ? 'Tekrar gönderme sınırına ulaşıldı'
                  : 'Doğrulama e-postasını tekrar gönder'
            }
            variant="secondary"
            loading={busy}
            disabled={
              cooldownSeconds > 0 || resendAttempts >= CONFIRMATION_RESEND_MAX_ATTEMPTS
            }
            onPress={() => void resend()}
          />
          <AppButton
            title={REGISTRATION_SUCCESS.action}
            onPress={() => router.replace(createLoginPrefillHref(registeredEmail))}
          />
        </FormSection>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.intro}>
        <Text style={styles.title}>Aracınız için güvenli bir alan</Text>
        <Text style={styles.subtitle}>
          Kayıtlarınız hesabınıza bağlı tutulur ve yalnızca size görünür.
        </Text>
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      <FormSection>
        <AppInput label="Adınız" value={name} onChangeText={setName} />
        <AppInput
          label="E-posta"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <PasswordInput
          label="Şifre"
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          error={
            password.length > 0 && password.length < 8 ? 'Şifre en az 8 karakter olmalı.' : null
          }
        />
        <PasswordInput
          label="Şifre tekrar"
          value={confirmation}
          onChangeText={setConfirmation}
          autoComplete="new-password"
          error={
            confirmation.length > 0 && confirmation !== password ? 'Şifreler eşleşmiyor.' : null
          }
        />
        <View style={styles.legalNotice}>
          <Text style={styles.legalCaption}>{REGISTRATION_LEGAL_NOTICE}</Text>
          <View style={styles.legalLinks}>
            {REGISTRATION_LEGAL_LINKS.map((link) => (
              <Pressable
                key={link.href}
                accessibilityRole="link"
                accessibilityLabel={link.accessibilityLabel}
                onPress={() => void openLegalLink(link, () => router.push(link.href as Href))}
              >
                <Text style={styles.legalLink}>{link.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <AppButton
          title="Hesap oluştur"
          loading={busy}
          disabled={!isSupabaseConfigured || !valid}
          onPress={submit}
        />
      </FormSection>
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    screen: { gap: spacing.xl },
    successScreen: { justifyContent: 'center', gap: spacing.xl },
    intro: { gap: spacing.sm },
    title: { color: colors.navy, ...typography.sectionTitle },
    subtitle: { color: colors.muted, ...typography.body },
    legalNotice: {
      gap: spacing.sm,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.surfaceMuted,
    },
    legalCaption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    legalLinks: { gap: spacing.sm },
    legalLink: { color: colors.primary, ...typography.bodyMedium, textDecorationLine: 'underline' },
    successMessage: { color: colors.muted, ...typography.body },
    resendSuccess: { color: colors.success, ...typography.bodyMedium },
  });
