import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import {
  AppHeader,
  Card,
  ErrorBanner,
  Screen,
  SectionHeader,
  confirmAction,
} from '@/shared/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import {
  fontFamilies,
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { DEVELOPER_INFO } from '@/features/settings/about';
import { THEME_OPTIONS, type ThemePreference } from '@/features/theme/themePreference';
import {
  NOTIFICATION_SETTINGS_ERROR_MESSAGE,
  openNotificationSystemSettings,
} from '@/features/settings/systemSettings';

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  danger,
  disabled = false,
  loading = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? title : undefined}
      accessibilityState={onPress ? { disabled, busy: loading } : undefined}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
      onPress={onPress}
      disabled={!onPress || disabled}
    >
      <View style={[styles.icon, danger && styles.dangerIcon]}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? colors.danger : colors.primary}
          accessible={false}
        />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, danger && styles.dangerText]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primaryAction} accessibilityElementsHidden />
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={20} color={colors.muted} accessible={false} />
      ) : null}
    </Pressable>
  );
}

const themeIcons: Record<ThemePreference, keyof typeof Ionicons.glyphMap> = {
  system: 'phone-portrait-outline',
  light: 'sunny-outline',
  dark: 'moon-outline',
};

function ThemeOptionRow({ option }: { option: (typeof THEME_OPTIONS)[number] }) {
  const { colors, preference, setPreference } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const selected = preference === option.value;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityHint={option.description}
      accessibilityState={{ checked: selected }}
      onPress={() => void setPreference(option.value)}
      style={({ pressed }) => [
        styles.row,
        selected && styles.themeRowSelected,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.icon}>
        <Ionicons
          name={themeIcons[option.value]}
          size={20}
          color={colors.primaryAction}
          accessible={false}
        />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{option.label}</Text>
        <Text style={styles.rowSubtitle}>{option.description}</Text>
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? colors.primaryAction : colors.textSecondary}
        accessible={false}
      />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const styles = useThemedStyles(createStyles);
  const { session, signOut, deleteAccount, busy, error: authError } = useAuthStore();
  const {
    vehicles,
    activeVehicleId,
    clearSection,
    deleteVehicle,
    clear,
    loading,
    refresh,
    entitlements,
    error: dataError,
  } = useDataStore();
  const vehicle = vehicles.find((item) => item.id === activeVehicleId);
  const [permission, setPermission] = useState('unknown');
  const previousPermission = useRef('unknown');
  const applyPermission = useCallback((status: string) => {
    if (status === 'granted' && previousPermission.current === 'denied') void refresh();
    previousPermission.current = status;
    setPermission(status);
  }, [refresh]);
  const updatePermission = useCallback(async () => {
    const status = (await Notifications.getPermissionsAsync()).status;
    applyPermission(status);
  }, [applyPermission]);
  useEffect(() => {
    const initialRefresh = setTimeout(() => void updatePermission(), 0);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void updatePermission();
    });
    return () => {
      clearTimeout(initialRefresh);
      subscription.remove();
    };
  }, [updatePermission]);
  const logout = async () => {
    await signOut();
    clear();
    router.replace('/auth/login');
  };
  const requestNotifications = async () => {
    await Notifications.requestPermissionsAsync();
    await updatePermission();
  };
  const openNotificationSettings = async () => {
    const opened = await openNotificationSystemSettings(Linking.openSettings);
    if (!opened) Alert.alert('Ayarlar açılamadı', NOTIFICATION_SETTINGS_ERROR_MESSAGE);
  };
  const removeAccount = () =>
    confirmAction(
      'Hesabı kalıcı olarak sil',
      'Hesabınız, araç verileriniz ve belge dosyalarınız kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      async () => {
        if (await deleteAccount()) {
          clear();
          Alert.alert('Hesap silindi', 'Hesabınız ve kullanıcı verileriniz silindi.');
          router.replace('/auth/login');
        }
      },
    );
  const clearData = (section: 'records' | 'reminders' | 'body' | 'documents', title: string) =>
    confirmAction(title, 'Bu işlem geri alınamaz.', async () => {
      if (await clearSection(section)) Alert.alert('Tamamlandı', 'Seçilen veriler silindi.');
    });
  return (
    <Screen>
      <AppHeader title="Ayarlar" subtitle="Hesap, bildirimler ve veriler" />
      {dataError ? <ErrorBanner message={dataError} /> : null}
      <SectionHeader title="Görünüm" />
      <View accessibilityRole="radiogroup">
        <Card style={styles.card}>
          {THEME_OPTIONS.map((option) => (
            <ThemeOptionRow key={option.value} option={option} />
          ))}
        </Card>
      </View>
      <SectionHeader title="Hesap" />
      <Card style={styles.card}>
        <SettingsRow
          icon="sparkles-outline"
          title="Aracım Cepte Premium"
          subtitle={
            entitlements?.planId === 'premium'
              ? 'Premium planınız aktif'
              : 'Plan seçenekleri ve Premium özellikler'
          }
          onPress={() => router.push('/premium')}
        />
        <SettingsRow
          icon="mail-outline"
          title="E-posta"
          subtitle={session?.user.email ?? 'E-posta bilgisi yok'}
        />
        <SettingsRow
          icon="key-outline"
          title="Şifre yenile"
          subtitle="E-posta ile güvenli yenileme bağlantısı"
          onPress={() => router.push('/auth/forgot-password')}
        />
        <SettingsRow icon="log-out-outline" title="Çıkış yap" onPress={() => void logout()} />
        <SettingsRow
          icon="trash-outline"
          title={busy ? 'Hesap siliniyor…' : 'Hesabı ve verilerimi sil'}
          subtitle={authError ?? 'Belgeler dahil tüm kullanıcı verileri kalıcı olarak kaldırılır'}
          danger
          onPress={removeAccount}
          disabled={busy}
          loading={busy}
        />
      </Card>
      <SectionHeader title="Araç" />
      <Card style={styles.card}>
        <SettingsRow
          icon="car-outline"
          title={vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Araç yok'}
          subtitle={vehicle?.plate ?? 'Plaka eklenmedi'}
          onPress={
            vehicle
              ? () => router.push({ pathname: '/vehicle/edit', params: { id: vehicle.id } })
              : undefined
          }
        />
      </Card>
      <SectionHeader title="Bildirimler" />
      <Card style={styles.card}>
        <SettingsRow
          icon="notifications-outline"
          title="Bildirim izni"
          subtitle={
            permission === 'granted'
              ? 'İzin verildi'
              : permission === 'denied'
                ? 'İzin reddedildi; cihaz ayarlarından değiştirilebilir'
                : 'Henüz sorulmadı'
          }
          onPress={
            permission === 'undetermined'
              ? () => void requestNotifications()
              : permission === 'denied'
                ? () => void openNotificationSettings()
                : undefined
          }
        />
      </Card>
      <SectionHeader title="Veri yönetimi" />
      <Card style={styles.card}>
        <SettingsRow
          icon="receipt-outline"
          title="Tüm araç kayıtlarını sil"
          danger
          onPress={() => clearData('records', 'Tüm kayıtları sil')}
          disabled={loading}
          loading={loading}
        />
        <SettingsRow
          icon="notifications-off-outline"
          title="Tüm hatırlatıcıları sil"
          danger
          onPress={() => clearData('reminders', 'Tüm hatırlatıcıları sil')}
          disabled={loading}
          loading={loading}
        />
        <SettingsRow
          icon="scan-outline"
          title="Gövde durumu verilerini sil"
          danger
          onPress={() => clearData('body', 'Gövde durumu verilerini sil')}
          disabled={loading}
          loading={loading}
        />
        <SettingsRow
          icon="documents-outline"
          title="Tüm belge kayıtlarını sil"
          danger
          onPress={() => clearData('documents', 'Tüm belgeleri sil')}
          disabled={loading}
          loading={loading}
        />
        {vehicle ? (
          <SettingsRow
            icon="trash-outline"
            title="Tüm araç verisini sil"
            subtitle="Araç ve ilişkili bütün kayıtlar"
            danger
            onPress={() =>
              confirmAction(
                'Tüm araç verisini sil',
                'Araç, kayıtlar, planlar, notlar ve belgeler kalıcı olarak silinecek.',
                async () => {
                  if (await deleteVehicle(vehicle.id)) {
                    router.dismissAll();
                    router.replace('/vehicle/edit');
                  }
                },
              )
            }
            disabled={loading}
            loading={loading}
          />
        ) : null}
      </Card>
      <SectionHeader title="Hakkında" />
      <Card style={styles.card}>
        <SettingsRow
          icon="shield-checkmark-outline"
          title="Yasal ve gizlilik"
          subtitle="Gizlilik, KVKK ve veri yönetimi belgeleri"
          onPress={() => router.push('/legal' as Href)}
        />
        <SettingsRow
          icon="code-slash-outline"
          title={DEVELOPER_INFO.title}
          subtitle={DEVELOPER_INFO.name}
        />
      </Card>
      <Card style={styles.about}>
        <Text style={styles.aboutTitle}>Aracım Cepte</Text>
        <Text style={styles.aboutText}>Sürüm {Constants.expoConfig?.version ?? '1.0.0'}</Text>
        <Text style={styles.aboutText}>
          Araç giderlerini, bakımları ve önemli tarihleri tek yerde düzenleyen kişisel araç
          asistanı.
        </Text>
        <Text style={styles.aboutText}>
          Hesap ve araç verileri Supabase üzerinde kullanıcıya özel RLS kurallarıyla korunur. Ekler
          özel depoda tutulur ve yalnızca kısa süreli imzalı bağlantılarla açılır.
        </Text>
      </Card>
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    card: { padding: 0, overflow: 'hidden' },
    row: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowPressed: { backgroundColor: colors.elevatedSurface },
    themeRowSelected: { backgroundColor: colors.paleAqua },
    icon: {
      width: 38,
      height: 38,
      borderRadius: radii.md,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerIcon: { backgroundColor: colors.errorSurface },
    rowContent: { flex: 1, gap: 3 },
    rowTitle: {
      color: colors.navy,
      ...typography.bodyMedium,
      fontFamily: fontFamilies.semibold,
    },
    rowSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17 },
    dangerText: { color: colors.danger },
    about: { gap: spacing.sm },
    aboutTitle: { color: colors.navy, ...typography.sectionTitle },
    aboutText: { color: colors.muted, lineHeight: 20 },
  });
