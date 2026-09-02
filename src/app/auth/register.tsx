import { useCallback, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import {
  AppButton,
  ErrorBanner,
  FeedbackBanner,
  FloatingField,
  FormSection,
  PasswordInput,
  Screen,
} from '@/shared/components/ui';
import { AutomotiveBackdrop } from '@/shared/components/AutomotiveBackdrop';
import { BrandLogo } from '@/shared/components/BrandLogo';
import { Reveal } from '@/shared/components/Reveal';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/data/supabase/client';
import { fontFamilies, spacing, typography, useThemedStyles, type AppTheme } from '@/shared/theme';
import { isValidEmail } from '@/shared/utils/validation';
import { useShakeAnimation } from '@/shared/hooks/useShakeAnimation';
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
  const { shake, style: shakeStyle } = useShakeAnimation();
  useFocusEffect(
    useCallback(() => {
      clearError();
    }, [clearError]),
  );
  const valid = isValidEmail(email) && password.length >= 8 && password === confirmation;
  const submit = async () => {
    if (!valid) {
      shake();
      return;
    }
    if (await signUp(email, password, name)) {
      setPassword('');
      setConfirmation('');
      setRegisteredEmail(normalizeRegistrationEmail(email));
      const nextAllowedAt = Date.now() + CONFIRMATION_RESEND_COOLDOWN_MS;
      setCooldownUntil(nextAllowedAt);
      setCooldownSeconds(getConfirmationCooldownSeconds(nextAllowedAt));
    } else {
      shake();
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
      <Screen style={styles.successScreen} backdrop={<AutomotiveBackdrop />}>
        <FormSection title={REGISTRATION_SUCCESS.title}>
          <Text style={styles.successMessage}>{REGISTRATION_SUCCESS.message}</Text>
          {error ? <ErrorBanner message={error} /> : null}
          {resendMessage ? (
            <FeedbackBanner tone="success" message={resendMessage} />
          ) : null}
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
    <Screen style={styles.screen} backdrop={<AutomotiveBackdrop />}>
      <Reveal order={0} style={styles.logoRow}>
        <BrandLogo size={52} />
      </Reveal>
      <Reveal order={1} style={styles.intro}>
        <Text style={styles.title}>Aracınız için güvenli bir alan</Text>
        <Text style={styles.subtitle}>
          Kayıtlarınız hesabınıza bağlı tutulur ve yalnızca size görünür.
        </Text>
      </Reveal>
      {error ? <ErrorBanner message={error} /> : null}
      <Reveal order={2} style={styles.form}>
        <FloatingField label="Adınız" value={name} onChangeText={setName} autoComplete="name" />
        <FloatingField
          label="E-posta adresiniz"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <PasswordInput
          label="Şifreniz"
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          error={
            password.length > 0 && password.length < 8 ? 'Şifre en az 8 karakter olmalı.' : null
          }
        />
        <PasswordInput
          label="Şifrenizi tekrar girin"
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
                style={({ pressed }) => [styles.legalChip, pressed && styles.pressed]}
                onPress={() => void openLegalLink(link, () => router.push(link.href as Href))}
              >
                <Text style={styles.legalChipText}>{link.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Animated.View style={shakeStyle}>
          <AppButton
            title="Hesap oluştur"
            loading={busy}
            disabled={!isSupabaseConfigured || !valid}
            onPress={submit}
          />
        </Animated.View>
      </Reveal>
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    screen: { gap: spacing.lg },
    logoRow: { alignItems: 'flex-start' },
    successScreen: { justifyContent: 'center', gap: spacing.xl },
    intro: { gap: spacing.sm },
    form: { gap: spacing.lg },
    title: { color: colors.navy, ...typography.sectionTitle },
    subtitle: { color: colors.muted, ...typography.body },
    legalNotice: { gap: spacing.sm },
    legalCaption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    legalLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    legalChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    legalChipText: { color: colors.primary, fontFamily: fontFamilies.semibold, fontSize: 13 },
    pressed: { opacity: 0.65 },
    successMessage: { color: colors.muted, ...typography.body },
  });
