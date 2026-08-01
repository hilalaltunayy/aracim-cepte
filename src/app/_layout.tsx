import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors, fontFamilies } from '@/shared/theme';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';

void SplashScreen.preventAutoHideAsync();

const NativeText = Text as typeof Text & { defaultProps?: { style?: object } };
const NativeTextInput = TextInput as typeof TextInput & { defaultProps?: { style?: object } };

function BackButton({ fallback = '/(tabs)' }: { fallback?: '/(tabs)' | '/auth/login' }) {
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Geri dön"
      hitSlop={8}
      onPress={goBack}
      style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
    >
      <Ionicons name="chevron-back" size={22} color={colors.navy} />
    </Pressable>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const initialize = useAuthStore((state) => state.initialize);
  const session = useAuthStore((state) => state.session);
  const bootstrap = useDataStore((state) => state.bootstrap);
  const clear = useDataStore((state) => state.clear);

  useEffect(() => {
    let unsubscribe: () => void = () => undefined;
    initialize().then((cleanup) => {
      unsubscribe = cleanup;
    });
    return () => unsubscribe();
  }, [initialize]);

  useEffect(() => {
    if (session?.user.id) void bootstrap();
    else clear();
  }, [session?.user.id, bootstrap, clear]);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    NativeText.defaultProps = {
      ...NativeText.defaultProps,
      style: [{ fontFamily: fontFamilies.regular }, NativeText.defaultProps?.style],
    };
    NativeTextInput.defaultProps = {
      ...NativeTextInput.defaultProps,
      style: [{ fontFamily: fontFamilies.regular }, NativeTextInput.defaultProps?.style],
    };
    void SplashScreen.hideAsync();
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) return null;

  const detailOptions = (title: string) => ({
    title,
    headerBackVisible: false,
    headerLeft: () => <BackButton />,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.navy,
          headerTitleAlign: 'center',
          headerTitleStyle: { fontFamily: fontFamilies.semibold, fontSize: 17 },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth/register"
          options={{
            ...detailOptions('Hesap oluştur'),
            headerLeft: () => <BackButton fallback="/auth/login" />,
          }}
        />
        <Stack.Screen
          name="auth/forgot-password"
          options={{
            ...detailOptions('Şifremi unuttum'),
            headerLeft: () => <BackButton fallback="/auth/login" />,
          }}
        />
        <Stack.Screen
          name="auth/reset-password"
          options={{
            ...detailOptions('Yeni şifre'),
            headerLeft: () => <BackButton fallback="/auth/login" />,
          }}
        />
        <Stack.Screen
          name="legal/kvkk-notice"
          options={{
            ...detailOptions('KVKK Aydınlatma Metni'),
            headerLeft: () => <BackButton fallback="/auth/login" />,
          }}
        />
        <Stack.Screen
          name="legal/privacy-policy"
          options={{
            ...detailOptions('Gizlilik Politikası'),
            headerLeft: () => <BackButton fallback="/auth/login" />,
          }}
        />
        <Stack.Screen
          name="legal/retention-and-deletion"
          options={{
            ...detailOptions('Saklama ve Silme Politikası'),
            headerLeft: () => <BackButton fallback="/(tabs)" />,
          }}
        />
        <Stack.Screen
          name="legal/account-and-data-deletion"
          options={{
            ...detailOptions('Hesap ve Veri Silme'),
            headerLeft: () => <BackButton fallback="/(tabs)" />,
          }}
        />
        <Stack.Screen
          name="legal/kvkk-application"
          options={{
            ...detailOptions('KVKK Başvuru Bilgileri'),
            headerLeft: () => <BackButton fallback="/(tabs)" />,
          }}
        />
        <Stack.Screen name="vehicle/edit" options={detailOptions('Araç bilgileri')} />
        <Stack.Screen name="record/edit" options={detailOptions('Kayıt ekle')} />
        <Stack.Screen name="reminder/edit" options={detailOptions('Hatırlatıcı')} />
        <Stack.Screen name="body-condition/index" options={detailOptions('Gövde durumu')} />
        <Stack.Screen name="expertise/index" options={detailOptions('Ekspertiz raporları')} />
        <Stack.Screen name="expertise/edit" options={detailOptions('Ekspertiz raporu')} />
        <Stack.Screen name="notes/index" options={detailOptions('Araç notları')} />
        <Stack.Screen name="notes/edit" options={detailOptions('Not')} />
        <Stack.Screen name="documents/index" options={detailOptions('Belgeler')} />
        <Stack.Screen name="documents/edit" options={detailOptions('Belge')} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    marginLeft: 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonPressed: {
    backgroundColor: colors.paleAqua,
    transform: [{ scale: 0.96 }],
  },
});
