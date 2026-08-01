import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { AppButton, AppInput, ErrorBanner, FormSection, Screen } from '@/shared/components/ui';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/data/supabase/client';
import { colors, spacing, typography } from '@/shared/theme';
import { isValidEmail } from '@/shared/utils/validation';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const { signUp, busy, error } = useAuthStore();
  const valid = isValidEmail(email) && password.length >= 8 && password === confirmation;
  const submit = async () => {
    if (!valid) return;
    if (await signUp(email, password, name)) {
      Alert.alert('Hesabınız oluşturuldu', 'Artık araç bilgilerinizi ekleyebilirsiniz.');
      router.replace('/');
    }
  };
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
        <AppInput label="Adınız (isteğe bağlı)" value={name} onChangeText={setName} />
        <AppInput
          label="E-posta"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <AppInput
          label="Şifre"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          error={
            password.length > 0 && password.length < 8 ? 'Şifre en az 8 karakter olmalı.' : null
          }
        />
        <AppInput
          label="Şifre tekrar"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          autoComplete="new-password"
          error={
            confirmation.length > 0 && confirmation !== password ? 'Şifreler eşleşmiyor.' : null
          }
        />
        <View style={styles.legalNotice}>
          <Text style={styles.legalCaption}>
            Aşağıdaki metinler bilgilendirme amaçlı taslaktır ve genel bir açık rıza kutusu
            değildir.
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="KVKK Aydınlatma Metni’ni aç"
            onPress={() => router.push('/legal/kvkk-notice' as Href)}
          >
            <Text style={styles.legalLink}>KVKK Aydınlatma Metni’ni okudum</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Gizlilik Politikası’nı aç"
            onPress={() => router.push('/legal/privacy-policy' as Href)}
          >
            <Text style={styles.legalLink}>Gizlilik Politikası</Text>
          </Pressable>
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

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
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
  legalLink: { color: colors.primary, ...typography.bodyMedium, textDecorationLine: 'underline' },
  legalStatus: { color: colors.warning, fontSize: 11, fontWeight: '700' },
});
