import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
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
import {
  getCurrentMonthRecordTypeTotals,
  getMonthlyTotals,
  getPreviousMonthComparison,
  getTotalFuelLiters,
  sortRecords,
} from '@/shared/utils/analytics';
import { formatCurrency, formatNumber } from '@/shared/utils/format';
import { getDashboardShortcutAccessibilityLabel } from '@/shared/utils/accessibility';
import { createRecordHref, editRecordHref } from '@/shared/utils/routeParams';
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
    Alert.alert('Araç sınırı', getVehicleLimitMessage(capacity));
  };
  const actions = [
    { label: 'Yakıt', icon: 'water-outline', type: 'fuel' },
    { label: 'Bakım', icon: 'construct-outline', type: 'maintenance' },
    { label: 'Masraf', icon: 'receipt-outline', type: 'expense' },
    { label: 'Hatırlat', icon: 'notifications-outline', route: '/reminder/edit' },
  ] as const;
  return (
    <Screen>
      <AppHeader
        title="Merhaba"
        subtitle={`${vehicle.brand} ${vehicle.model} bugün nasıl?`}
        action={
          <Pressable
            accessibilityRole={vehicles.length > 1 ? 'button' : undefined}
            accessibilityLabel={vehicles.length > 1 ? 'Aktif aracı değiştir' : undefined}
            style={({ pressed }) => [styles.headerIcon, pressed && vehicles.length > 1 && styles.headerPressed]}
            disabled={vehicles.length <= 1}
            onPress={() => setSwitcherOpen(true)}
          >
            <Ionicons
              name="car-sport-outline"
              size={24}
              color={colors.primary}
              accessible={false}
            />
          </Pressable>
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
        <MiniBarChart data={monthly} />
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
      <View style={styles.detailMetrics}>
        <Card style={styles.detailMetric}>
          <Text style={styles.detailValue}>
            {fuelLiters > 0 ? `${formatNumber(fuelLiters, 1)} L` : '—'}
          </Text>
          <Text style={styles.metricLabel}>Toplam yakıt</Text>
        </Card>
      </View>
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
              onPress={() => router.navigate(editRecordHref(record.id))}
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
  );
}

const createStyles = ({ colors, shadows }: AppTheme) =>
  StyleSheet.create({
    headerIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
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
    detailMetrics: { flexDirection: 'row', gap: spacing.md },
    detailMetric: { flex: 1, gap: spacing.xs },
    detailValue: { color: colors.navy, ...typography.cardTitle },
    list: { gap: spacing.md },
  });
