import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AppButton,
  AppInput,
  ErrorBanner,
  FormSection,
  PasswordInput,
  Screen,
} from '@/shared/components/ui';
import {
  fontFamilies,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/data/supabase/client';
import { isValidEmail } from '@/shared/utils/validation';
import { getLoginPrefillEmail } from '@/features/auth/registrationFlow';

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const [email, setEmail] = useState(() => getLoginPrefillEmail(params.email));
  const [password, setPassword] = useState('');
  const { signIn, busy, error, sessionNotice } = useAuthStore();
  const submit = async () => {
    if (!isValidEmail(email) || password.length < 6) return;
    if (await signIn(email, password)) router.replace('/');
  };
  return (
    <Screen style={styles.screen}>
      <View style={styles.logo}>
        <Ionicons name="car-sport-outline" size={34} color={colors.onPrimary} />
      </View>
      <View style={styles.heading}>
        <Text style={styles.title}>Tekrar hoş geldiniz</Text>
        <Text style={styles.subtitle}>
          Aracınızla ilgili her şey kaldığınız yerden devam ediyor.
        </Text>
      </View>
      {!isSupabaseConfigured ? (
        <ErrorBanner message="Bulut bağlantısı henüz yapılmadı. Geliştirici, .env dosyasına Supabase proje URL’si ve yayınlanabilir anahtarı eklemeli." />
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
      {sessionNotice ? <ErrorBanner message={sessionNotice} /> : null}
      <FormSection>
        <View style={styles.form}>
          <AppInput
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="ornek@eposta.com"
          />
          <PasswordInput
            label="Şifre"
            value={password}
            onChangeText={setPassword}
            autoComplete="current-password"
            placeholder="En az 6 karakter"
          />
          <Pressable
            style={({ pressed }) => [styles.forgot, pressed && styles.pressed]}
            onPress={() => router.push('/auth/forgot-password')}
          >
            <Text style={styles.link}>Şifremi unuttum</Text>
          </Pressable>
          <AppButton
            title="Giriş yap"
            loading={busy}
            disabled={!isSupabaseConfigured || !isValidEmail(email) || password.length < 6}
            onPress={submit}
          />
        </View>
      </FormSection>
      <View style={styles.register}>
        <Text style={styles.muted}>Henüz hesabınız yok mu?</Text>
        <Pressable onPress={() => router.push('/auth/register')}>
          <Text style={styles.link}>Hesap oluştur</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const createStyles = ({ colors, shadows }: AppTheme) =>
  StyleSheet.create({
    screen: { justifyContent: 'center', gap: spacing.xl, paddingBottom: spacing.xxl },
    logo: {
      width: 64,
      height: 64,
      borderRadius: 21,
      backgroundColor: colors.primaryAction,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.floating,
    },
    heading: { gap: spacing.sm },
    title: { color: colors.navy, ...typography.screenTitle },
    subtitle: { color: colors.muted, ...typography.body },
    form: { gap: spacing.lg },
    forgot: { alignSelf: 'flex-end' },
    pressed: { opacity: 0.65 },
    link: { color: colors.primary, fontFamily: fontFamilies.semibold, fontSize: 14 },
    register: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
    muted: { color: colors.muted, ...typography.body },
  });
