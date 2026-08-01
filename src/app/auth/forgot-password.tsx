import { useState } from 'react';
import { Alert } from 'react-native';
import { AppButton, AppInput, ErrorBanner, Screen } from '@/shared/components/ui';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/data/supabase/client';
import { isValidEmail } from '@/shared/utils/validation';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const { sendPasswordReset, busy, error } = useAuthStore();
  const submit = async () => {
    if (await sendPasswordReset(email))
      Alert.alert(
        'E-posta gönderildi',
        'Şifre yenileme bağlantısı için gelen kutunuzu kontrol edin.',
      );
  };
  return (
    <Screen>
      {error ? <ErrorBanner message={error} /> : null}
      <AppInput
        label="E-posta"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="ornek@eposta.com"
      />
      <AppButton
        title="Yenileme bağlantısı gönder"
        loading={busy}
        disabled={!isSupabaseConfigured || !isValidEmail(email)}
        onPress={submit}
      />
    </Screen>
  );
}
