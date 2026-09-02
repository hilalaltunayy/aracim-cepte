import { useCallback, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  AppButton,
  ErrorBanner,
  FeedbackBanner,
  FloatingField,
  PasswordInput,
  Screen,
} from '@/shared/components/ui';
import { AutomotiveBackdrop } from '@/shared/components/AutomotiveBackdrop';
import { BrandLogo } from '@/shared/components/BrandLogo';
import { Reveal } from '@/shared/components/Reveal';
import {
  fontFamilies,
  spacing,
  typography,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/data/supabase/client';
import { isValidEmail } from '@/shared/utils/validation';
import { getLoginPrefillEmail } from '@/features/auth/registrationFlow';
import { useShakeAnimation } from '@/shared/hooks/useShakeAnimation';

export default function LoginScreen() {
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const [email, setEmail] = useState(() => getLoginPrefillEmail(params.email));
  const [password, setPassword] = useState('');
  const { signIn, busy, error, sessionNotice, hasSignedInBefore, clearError } = useAuthStore();
  const { shake, style: shakeStyle } = useShakeAnimation();
  const formInvalid = !isSupabaseConfigured || !isValidEmail(email) || password.length < 6;

  useFocusEffect(
    useCallback(() => {
      clearError();
    }, [clearError]),
  );

  const submit = async () => {
    if (formInvalid) {
      shake();
      return;
    }
    if (await signIn(email, password)) router.replace('/');
    else shake();
  };

  return (
    <Screen style={styles.screen} backdrop={<AutomotiveBackdrop />}>
      <Reveal order={0} style={styles.logoRow}>
        <BrandLogo size={66} />
      </Reveal>
      <Reveal order={1} style={styles.heading}>
        <Text style={styles.title}>
          {hasSignedInBefore ? 'Tekrar hoş geldiniz' : 'Hoş geldiniz'}
        </Text>
        <Text style={styles.subtitle}>
          {hasSignedInBefore
            ? 'Aracınızla ilgili her şey kaldığınız yerden devam ediyor.'
            : 'Araç kayıtlarınızı güvenli ve düzenli biçimde yönetmeye başlayın.'}
        </Text>
      </Reveal>

      {!isSupabaseConfigured ? (
        <FeedbackBanner
          tone="warning"
          message="Bulut bağlantısı henüz yapılmadı. Geliştirici, .env dosyasına Supabase proje URL’si ve yayınlanabilir anahtarı eklemeli."
        />
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
      {sessionNotice ? <FeedbackBanner tone="info" message={sessionNotice} /> : null}

      <Reveal order={2} style={styles.form}>
        <FloatingField
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
          autoComplete="current-password"
        />
        <Pressable
          style={({ pressed }) => [styles.forgot, pressed && styles.pressed]}
          onPress={() => router.push('/auth/forgot-password')}
        >
          <Text style={styles.link}>Şifremi unuttum</Text>
        </Pressable>
        <Animated.View style={shakeStyle}>
          <AppButton title="Giriş yap" loading={busy} disabled={formInvalid} onPress={submit} />
        </Animated.View>
      </Reveal>

      <View style={styles.register}>
        <Text style={styles.muted}>Henüz hesabınız yok mu?</Text>
        <Pressable
          onPress={() => {
            clearError();
            router.push('/auth/register');
          }}
        >
          <Text style={styles.link}>Hesap oluştur</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    screen: { justifyContent: 'center', gap: spacing.lg, paddingBottom: spacing.xxl },
    logoRow: { alignItems: 'flex-start' },
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
