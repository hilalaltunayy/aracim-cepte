import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AppHeader,
  Card,
  EmptyState,
  ErrorBanner,
  FadeIn,
  LoadingScreen,
  NoVehicleState,
  Screen,
  SectionHeader,
  StatusBadge,
} from '@/shared/components/ui';
import { RecordCard } from '@/shared/components/entityCards';
import { MiniBarChart } from '@/shared/components/MiniBarChart';
import { AutomotiveBackdrop } from '@/shared/components/AutomotiveBackdrop';
import { HomeIntroOverlay } from '@/shared/components/HomeIntroOverlay';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import {
  fontFamilies,
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import {
  getCurrentMonthRecordTypeTotals,
  getMonthlyTotals,
  getPreviousMonthComparison,
  getTotalFuelLiters,
  sortRecords,
} from '@/shared/utils/analytics';
import { formatCurrency, formatNumber } from '@/shared/utils/format';
import { getDashboardShortcutAccessibilityLabel } from '@/shared/utils/accessibility';
import { createRecordHref, detailRecordHref } from '@/shared/utils/routeParams';
import { resolveVehicleScreenState } from '@/shared/utils/vehicleState';
import { VehicleSwitcherSheet } from '@/features/vehicles/components/VehicleSwitcherSheet';
import {
  getVehicleCapacity,
  getVehicleLimitMessage,
} from '@/features/vehicles/domain/multiVehicle';

export default function DashboardScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const displayName = useAuthStore((state) => {
    const value = state.session?.user.user_metadata?.display_name;
    return typeof value === 'string' ? value.trim().split(/\s+/)[0] : '';
  });
  const homeIntroPending = useAuthStore((state) => state.homeIntroPending);
  const consumeHomeIntro = useAuthStore((state) => state.consumeHomeIntro);
  const [introVisible, setIntroVisible] = useState(homeIntroPending);
  useEffect(() => {
    if (homeIntroPending) consumeHomeIntro();
  }, [homeIntroPending, consumeHomeIntro]);
  const {
    vehicles,
    activeVehicleId,
    records,
    reminders,
    error,
    refresh,
    bootstrapped,
    entitlements,
    setActiveVehicle,
  } = useDataStore();
  const vehicle = vehicles.find((item) => item.id === activeVehicleId);
  const vehicleState = resolveVehicleScreenState({
    bootstrapped,
    vehicleFound: Boolean(vehicle),
  });
  if (vehicleState === 'loading') return <LoadingScreen />;
  if (!vehicle) {
    return (
      <Screen>
        <AppHeader title="Merhaba" subtitle="Aracınızı ekleyerek başlayın" />
        <NoVehicleState onCreate={() => router.navigate('/vehicle/edit')} />
      </Screen>
    );
  }
  const dashboardAnchor = new Date();
  const totals = getCurrentMonthRecordTypeTotals(records, dashboardAnchor);
  const monthly = getMonthlyTotals(records, 6, dashboardAnchor);
  const comparison = getPreviousMonthComparison(records, dashboardAnchor);
  const fuelLiters = getTotalFuelLiters(records);
  const recent = sortRecords(records).slice(0, 4);
  const activeReminderCount = reminders.filter((reminder) => !reminder.completed).length;
  const capacity = getVehicleCapacity(vehicles.length, entitlements);
  const requestAddVehicle = () => {
    if (capacity.canAdd) {
      setSwitcherOpen(false);
      router.navigate('/vehicle/edit');
      return;
    }
    Alert.alert('Araç sınırı', getVehicleLimitMessage(capacity), [
      { text: 'Daha sonra', style: 'cancel' },
      { text: 'Premium’u incele', onPress: () => router.push('/premium' as never) },
    ]);
  };
  const actions = [
    { label: 'Yakıt', icon: 'water-outline', type: 'fuel' },
    { label: 'Bakım', icon: 'construct-outline', type: 'maintenance' },
    { label: 'Masraf', icon: 'receipt-outline', type: 'expense' },
    { label: 'Hatırlat', icon: 'notifications-outline', route: '/reminder/edit' },
  ] as const;
  const contextLine = `${vehicle.brand} ${vehicle.model} bugün nasıl?`;
  return (
    <View style={styles.root}>
      <Screen backdrop={<AutomotiveBackdrop />}>
        <AppHeader
          title={displayName ? `Merhaba ${displayName}` : 'Merhaba'}
          subtitle={contextLine}
          action={
            vehicles.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Aktif aracı değiştir"
                style={({ pressed }) => [styles.switchChip, pressed && styles.headerPressed]}
                onPress={() => setSwitcherOpen(true)}
              >
                <Ionicons name="swap-horizontal" size={16} color={colors.primary} accessible={false} />
                <Text style={styles.switchChipText}>Araç değiştir</Text>
              </Pressable>
            ) : undefined
          }
        />
        {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
        <FadeIn>
          <LinearGradient
            colors={[colors.brandGradientStart, colors.brandGradientEnd]}
            style={styles.hero}
          >
            <View style={styles.heroTop}>
              <View style={styles.heroIdentity}>
                <Text style={styles.plate}>{vehicle.plate ?? 'PLAKA EKLENMEDİ'}</Text>
                <Text numberOfLines={2} style={styles.vehicleName}>
                  {vehicle.brand} {vehicle.model}
                </Text>
              </View>
              <StatusBadge label={`${activeReminderCount} aktif plan`} tone="neutral" />
            </View>
            <View>
              <Text style={styles.heroLabel}>Güncel kilometre</Text>
              <Text style={styles.km}>{formatNumber(vehicle.currentKm)} km</Text>
            </View>
            <View style={styles.heroFooter}>
              <Text style={styles.heroFooterText}>Toplam kayıt</Text>
              <Text style={styles.heroFooterValue}>{records.length}</Text>
            </View>
          </LinearGradient>
        </FadeIn>
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={getDashboardShortcutAccessibilityLabel(action.label)}
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              onPress={() =>
                'route' in action
                  ? router.navigate(action.route)
                  : router.navigate(createRecordHref(action.type))
              }
            >
              <View style={styles.actionIcon}>
                <Ionicons name={action.icon} size={22} color={colors.primary} accessible={false} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
        <SectionHeader title="Bu ayın görünümü" />
        <View style={styles.metrics}>
          {[
            ['Yakıt', totals.fuel, 'water-outline'],
            ['Bakım', totals.maintenance, 'construct-outline'],
            ['Diğer', totals.expense, 'receipt-outline'],
          ].map(([label, value, icon]) => (
            <Card key={String(label)} style={styles.metric}>
              <Ionicons
                name={icon as keyof typeof Ionicons.glyphMap}
                size={19}
                color={colors.primary}
                accessible={false}
              />
              <Text style={styles.metricLabel}>{label}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>
                {formatCurrency(value as number)}
              </Text>
            </Card>
          ))}
        </View>
        <Card>
          <MiniBarChart
            data={monthly}
            footer={
              fuelLiters > 0 ? `Toplam yakıt · ${formatNumber(fuelLiters, 1)} L` : undefined
            }
          />
          {comparison === null ? (
            <Text style={styles.insight}>Karşılaştırma için önceki ay verisi gerekiyor.</Text>
          ) : (
            <Text style={styles.insight}>
              Önceki aya göre %
              {Math.abs(comparison).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}{' '}
              {comparison >= 0 ? 'artış' : 'azalış'}.
            </Text>
          )}
        </Card>
        <SectionHeader
          title="Son hareketler"
          actionLabel="Tümünü gör"
          onAction={() => router.push('/(tabs)/history')}
        />
        {recent.length ? (
          <View style={styles.list}>
            {recent.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onPress={() => router.navigate(detailRecordHref(record.id))}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="Henüz kayıt yok"
            message="İlk yakıt, bakım veya masraf kaydınızı ekleyerek başlayın."
            icon="receipt-outline"
          />
        )}
        <VehicleSwitcherSheet
          visible={switcherOpen}
          vehicles={vehicles}
          activeVehicleId={activeVehicleId}
          capacityLabel={`${capacity.current} / ${capacity.maximum} araç`}
          onSelect={(vehicleId) => {
            setSwitcherOpen(false);
            void setActiveVehicle(vehicleId);
          }}
          onAddVehicle={requestAddVehicle}
          onClose={() => setSwitcherOpen(false)}
        />
      </Screen>
      <Pressable
        testID="dashboard-assistant-entry"
        accessibilityRole="button"
        accessibilityLabel="Araç Asistanını aç"
        accessibilityHint="Seçili aracınız hakkında soru sorabileceğiniz ekranı açar."
        style={({ pressed }) => [styles.assistantFab, pressed && styles.assistantFabPressed]}
        onPress={() => router.push('/vehicle-assistant' as never)}
      >
        <Ionicons name="sparkles" size={21} color={colors.onBrand} accessible={false} />
      </Pressable>
      {introVisible ? (
        <HomeIntroOverlay
          name={displayName}
          contextLine={contextLine}
          onDone={() => setIntroVisible(false)}
        />
      ) : null}
    </View>
  );
}

const createStyles = ({ colors, shadows }: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1 },
    switchChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 999,
      backgroundColor: colors.paleAqua,
    },
    switchChipText: { color: colors.primary, fontFamily: fontFamilies.semibold, fontSize: 12 },
    headerPressed: { opacity: 0.72 },
    hero: {
      width: '100%',
      minHeight: 214,
      borderRadius: radii.xl,
      padding: spacing.xl,
      justifyContent: 'space-between',
      overflow: 'hidden',
      ...shadows.floating,
    },
    heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    heroIdentity: { flex: 1, minWidth: 0, paddingRight: spacing.xs },
    plate: {
      color: colors.onBrandMuted,
      fontFamily: fontFamilies.semibold,
      fontSize: 12,
      letterSpacing: 1.15,
    },
    vehicleName: {
      color: colors.onBrand,
      fontFamily: fontFamilies.bold,
      fontSize: 21,
      lineHeight: 27,
      marginTop: 5,
    },
    heroLabel: { color: colors.onBrandMuted, ...typography.caption },
    km: {
      color: colors.onBrand,
      fontFamily: fontFamilies.bold,
      fontSize: 33,
      lineHeight: 41,
      letterSpacing: -0.8,
    },
    heroFooter: { flexDirection: 'row', justifyContent: 'space-between' },
    heroFooterText: { color: colors.onBrandMuted, ...typography.body },
    heroFooterValue: { color: colors.onBrand, ...typography.body, fontFamily: fontFamilies.bold },
    actions: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    action: { alignItems: 'center', flex: 1, minWidth: 0, gap: 7 },
    actionPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
    actionIcon: {
      width: 52,
      height: 52,
      borderRadius: 17,
      backgroundColor: colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionLabel: { color: colors.navy, fontFamily: fontFamilies.semibold, fontSize: 11 },
    metrics: { flexDirection: 'row', gap: spacing.sm },
    metric: { flex: 1, flexBasis: 0, padding: spacing.md, gap: spacing.xs, minWidth: 0 },
    metricLabel: { color: colors.muted, ...typography.caption },
    metricValue: { color: colors.navy, fontFamily: fontFamilies.bold, fontSize: 13 },
    insight: { color: colors.muted, ...typography.caption, marginTop: spacing.md },
    list: { gap: spacing.md },
    assistantFab: {
      position: 'absolute',
      right: spacing.lg,
      bottom: 94,
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 28,
      backgroundColor: colors.primaryAction,
      ...shadows.floating,
    },
    assistantFabPressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  });
