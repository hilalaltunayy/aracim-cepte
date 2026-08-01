import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import {
  AppButton,
  AppInput,
  ErrorBanner,
  FormSection,
  LoadingScreen,
  Screen,
} from '@/shared/components/ui';
import { getIncomingRecoveryUrl } from '@/features/auth/recoveryRedirect';
import { validateNewPassword } from '@/features/auth/passwordRecovery';
import { colors, spacing, typography } from '@/shared/theme';
import { useAuthStore } from '@/store/authStore';

type Phase = 'loading' | 'ready' | 'success' | 'error';

export default function ResetPasswordScreen() {
  const incomingUrl = Linking.useURL();
  const processing = useRef<Promise<boolean> | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { establishRecovery, updateRecoveredPassword, busy, error, clearError } = useAuthStore();
  const validationError = validateNewPassword(password, confirmation);

  useEffect(() => {
    let active = true;
    processing.current ??= getIncomingRecoveryUrl(incomingUrl).then((url) =>
      establishRecovery(url),
    );
    void processing.current.then((ready) => {
      if (active) setPhase(ready ? 'ready' : 'error');
    });
    return () => {
      active = false;
    };
  }, [establishRecovery, incomingUrl]);

  const submit = async () => {
    setSubmitted(true);
    if (validationError) return;
    clearError();
    if (await updateRecoveredPassword(password)) setPhase('success');
  };

  if (phase === 'loading') return <LoadingScreen />;

  if (phase === 'success') {
    return (
      <Screen style={styles.screen}>
        <FormSection title="Şifreniz yenilendi">
          <Text style={styles.body}>
            Yeni şifreniz kaydedildi ve kurtarma oturumu güvenli şekilde kapatıldı.
          </Text>
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
        <View>
          <AppInput
            label="Yeni şifre"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordVisible}
            autoComplete="new-password"
            maxLength={72}
            style={styles.passwordInput}
            error={submitted && validationError?.includes('en az') ? validationError : null}
          />
          <VisibilityButton
            visible={passwordVisible}
            onPress={() => setPasswordVisible((value) => !value)}
          />
        </View>
        <View>
          <AppInput
            label="Yeni şifre tekrar"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry={!confirmationVisible}
            autoComplete="new-password"
            maxLength={72}
            style={styles.passwordInput}
            error={submitted && validationError?.includes('eşleşmiyor') ? validationError : null}
          />
          <VisibilityButton
            visible={confirmationVisible}
            onPress={() => setConfirmationVisible((value) => !value)}
          />
        </View>
        <AppButton
          title="Şifreyi güncelle"
          loading={busy}
          disabled={Boolean(validationError)}
          onPress={submit}
        />
      </FormSection>
    </Screen>
  );
}

function VisibilityButton({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
      hitSlop={8}
      style={({ pressed }) => [styles.eye, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  intro: { gap: spacing.sm },
  title: { color: colors.navy, ...typography.sectionTitle },
  body: { color: colors.muted, ...typography.body },
  passwordInput: { paddingRight: 52 },
  eye: { position: 'absolute', right: 16, bottom: 16 },
  pressed: { opacity: 0.65 },
});
