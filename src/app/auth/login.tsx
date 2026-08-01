import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, ErrorBanner, FormSection, Screen } from '@/shared/components/ui';
import { colors, fontFamilies, shadows, spacing, typography } from '@/shared/theme';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/data/supabase/client';
import { isValidEmail } from '@/shared/utils/validation';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const { signIn, busy, error } = useAuthStore();
  const submit = async () => {
    if (!isValidEmail(email) || password.length < 6) return;
    if (await signIn(email, password)) router.replace('/');
  };
  return (
    <Screen style={styles.screen}>
      <View style={styles.logo}>
        <Ionicons name="car-sport-outline" size={34} color={colors.white} />
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
          <View>
            <AppInput
              label="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!visible}
              autoComplete="current-password"
              placeholder="En az 6 karakter"
              style={styles.passwordInput}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
              hitSlop={8}
              style={({ pressed }) => [styles.eye, pressed && styles.pressed]}
              onPress={() => setVisible((value) => !value)}
            >
              <Ionicons
                name={visible ? 'eye-off-outline' : 'eye-outline'}
                size={21}
                color={colors.muted}
              />
            </Pressable>
          </View>
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

const styles = StyleSheet.create({
  screen: { justifyContent: 'center', gap: spacing.xl, paddingBottom: spacing.xxl },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  heading: { gap: spacing.sm },
  title: { color: colors.navy, ...typography.screenTitle },
  subtitle: { color: colors.muted, ...typography.body },
  form: { gap: spacing.lg },
  passwordInput: { paddingRight: 52 },
  eye: { position: 'absolute', right: 16, bottom: 16 },
  forgot: { alignSelf: 'flex-end' },
  pressed: { opacity: 0.65 },
  link: { color: colors.primary, fontFamily: fontFamilies.semibold, fontSize: 14 },
  register: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  muted: { color: colors.muted, ...typography.body },
});
