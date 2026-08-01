import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
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

export default function RegisterScreen() {
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const { signUp, busy, error } = useAuthStore();
  const valid = isValidEmail(email) && password.length >= 8 && password === confirmation;
  const submit = async () => {
    if (!valid) return;
    if (await signUp(email, password, name)) {
      setPassword('');
      setConfirmation('');
      setRegisteredEmail(normalizeRegistrationEmail(email));
    }
  };

  if (registeredEmail) {
    return (
      <Screen style={styles.successScreen}>
        <FormSection title={REGISTRATION_SUCCESS.title}>
          <Text style={styles.successMessage}>{REGISTRATION_SUCCESS.message}</Text>
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
                onPress={() => router.push(link.href as Href)}
              >
                <Text style={styles.legalLink}>{link.title}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.legalStatus}>HUKUK İNCELEMESİ BEKLİYOR</Text>
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
    legalStatus: { color: colors.warning, fontSize: 11, fontWeight: '700' },
    successMessage: { color: colors.muted, ...typography.body },
  });
