import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AppHeader,
  Card,
  LoadingScreen,
  NoVehicleState,
  Screen,
  SectionHeader,
} from '@/shared/components/ui';
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
import { fuelTypeLabels } from '@/shared/constants/labels';
import { formatNumber } from '@/shared/utils/format';
import { getBodyConditionSummary } from '@/shared/utils/analytics';
import { resolveVehicleScreenState } from '@/shared/utils/vehicleState';
import { getVehicleBodyTypeLabel } from '@/features/vehicles/config/bodyTypes';
import { getVehicleTaxonomySummary } from '@/features/vehicles/domain/vehicleProfile';

const sections = [
  {
    title: 'Gövde durumu',
    message: 'Parça bazında boya ve değişim bilgileri',
    icon: 'scan-outline',
    route: '/body-condition',
  },
  {
    title: 'Ekspertiz raporları',
    message: 'Raporlar ve güvenli ekleri',
    icon: 'clipboard-outline',
    route: '/expertise',
  },
  {
    title: 'Araç notları',
    message: 'Aracınıza özel sade notlar',
    icon: 'create-outline',
    route: '/notes',
  },
  {
    title: 'Belgeler',
    message: 'Poliçe, muayene ve evrak planı',
    icon: 'documents-outline',
    route: '/documents',
  },
] as const;

export default function VehicleScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const {
    vehicles,
    activeVehicleId,
    bodyConditions,
    expertiseReports,
    notes,
    documents,
    bootstrapped,
  } = useDataStore();
  const vehicle = vehicles.find((item) => item.id === activeVehicleId);
  const vehicleState = resolveVehicleScreenState({ bootstrapped, vehicleFound: Boolean(vehicle) });
  if (vehicleState === 'loading') return <LoadingScreen />;
  if (!vehicle) {
    return (
      <Screen>
        <AppHeader title="Aracım" subtitle="Araç bilgilerinizi yönetin" />
        <NoVehicleState onCreate={() => router.navigate('/vehicle/edit')} />
      </Screen>
    );
  }
  const summary = getBodyConditionSummary(bodyConditions);
  return (
    <Screen>
      <AppHeader title="Aracım" subtitle="Kimlik, durum ve belgeler" />
      <Card style={styles.vehicleCard}>
        <View style={styles.vehicleIcon}>
          <Ionicons name="car-sport-outline" size={30} color={colors.primary} />
        </View>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>
            {vehicle.brand} {vehicle.model}
          </Text>
          <Text style={styles.meta}>
            {[vehicle.year, vehicle.plate, fuelTypeLabels[vehicle.fuelType]]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Text style={styles.meta}>{getVehicleTaxonomySummary(vehicle)}</Text>
          <Text style={styles.km}>{formatNumber(vehicle.currentKm)} km</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Araç bilgilerini düzenle"
          style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
          onPress={() => router.push({ pathname: '/vehicle/edit', params: { id: vehicle.id } })}
        >
          <Ionicons name="pencil-outline" size={20} color={colors.primary} />
        </Pressable>
      </Card>
      <Card style={styles.bodySummary}>
        <View>
          <Text style={styles.cardTitle}>Gövde özeti</Text>
          <Text style={styles.meta}>{getVehicleBodyTypeLabel(vehicle.bodyType)}</Text>
        </View>
        <View style={styles.summaryRow}>
          {[
            ['Boyalı', summary.painted],
            ['Lokal', summary.locally_painted],
            ['Değişen', summary.replaced],
            ['Hasarlı', summary.damaged],
          ].map(([label, value]) => (
            <View key={String(label)} style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{value}</Text>
              <Text style={styles.summaryLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </Card>
      <SectionHeader title="Araç dosyası" />
      <View style={styles.list}>
        {sections.map((section) => {
          const count =
            section.route === '/expertise'
              ? expertiseReports.length
              : section.route === '/notes'
                ? notes.length
                : section.route === '/documents'
                  ? documents.length
                  : bodyConditions.length;
          return (
            <Pressable
              key={section.route}
              accessibilityRole="button"
              accessibilityLabel={`${section.title} ekranını aç`}
              style={({ pressed }) => pressed && styles.pressed}
              onPress={() => router.navigate(section.route)}
            >
              <Card style={styles.sectionCard}>
                <View style={styles.sectionIcon}>
                  <Ionicons name={section.icon} size={23} color={colors.primary} />
                </View>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.cardTitle}>{section.title}</Text>
                  <Text style={styles.meta}>{section.message}</Text>
                </View>
                <Text style={styles.count}>{count}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </Card>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    vehicleIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    vehicleInfo: { flex: 1, gap: 3 },
    vehicleName: { color: colors.navy, ...typography.sectionTitle },
    meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    km: { color: colors.primary, fontFamily: fontFamilies.bold, marginTop: spacing.xs },
    edit: {
      width: 42,
      height: 42,
      borderRadius: radii.md,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bodySummary: { gap: spacing.lg },
    cardTitle: { color: colors.navy, ...typography.cardTitle },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryItem: { alignItems: 'center', gap: 3 },
    summaryValue: { color: colors.navy, ...typography.sectionTitle },
    summaryLabel: { color: colors.muted, fontSize: 11 },
    list: { gap: spacing.md },
    sectionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
    },
    sectionIcon: {
      width: 46,
      height: 46,
      borderRadius: radii.md,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    count: { color: colors.primary, fontFamily: fontFamilies.bold },
    pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  });
