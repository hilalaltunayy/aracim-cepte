import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AutomotiveBackdrop } from '@/shared/components/AutomotiveBackdrop';
import {
  ActionSheet,
  AppButton,
  AppHeader,
  Card,
  EmptyState,
  ErrorBanner,
  FadeIn,
  LoadingScreen,
  Screen,
  SectionHeader,
} from '@/shared/components/ui';
import {
  fontFamilies,
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { formatCurrency, formatNumber } from '@/shared/utils/format';
import { getFriendlyError } from '@/shared/utils/errors';
import { useDataStore } from '@/store/dataStore';
import { buildVehicleReportDocument } from '../pdf/vehicleReportDocument';
import { renderVehicleReportHtml } from '../pdf/vehicleReportHtml';
import { buildVehicleReportFileName, exportVehicleReportPdf } from '../pdf/vehicleReportPdf';
import { expoReportPdfGateway } from '../pdf/expoReportPdfGateway';
import {
  buildVehicleComparisons,
  buildVehicleReport,
  REPORT_PERIOD_IDS,
  type ReportPeriodId,
  type VehicleComparison,
} from '../domain/vehicleReports';
import { loadReportsForVehicles } from '../services/vehicleReportLoader';
import { BarChart, DonutChart, TrendChart, type DonutSegment } from './ReportCharts';

const periodOptions = {
  month: 'Bu ay',
  last_month: 'Geçen ay',
  three_months: 'Son 3 ay',
  six_months: 'Son 6 ay',
  year: 'Bu yıl',
} as const;
const categoryLabels = { fuel: 'Yakıt', maintenance: 'Bakım', expense: 'Diğer' } as const;

function CountUp({
  value,
  format,
  style,
}: {
  value: number | null;
  format: (value: number) => string;
  style?: object;
}) {
  const [animated] = useState(() => new Animated.Value(0));
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const listener = animated.addListener(({ value: next }) => setDisplay(next));
    animated.setValue(0);
    Animated.timing(animated, {
      toValue: value ?? 0,
      duration: 320,
      useNativeDriver: false,
    }).start();
    return () => animated.removeListener(listener);
  }, [animated, value]);
  return (
    <Text
      testID="report-kpi-count-up"
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.6}
      style={[stylesForCount.value, style]}
    >
      {value === null ? 'Yeterli veri yok' : format(display)}
    </Text>
  );
}
const stylesForCount = StyleSheet.create({
  value: { fontFamily: fontFamilies.bold, fontSize: 15, lineHeight: 20 },
});

function Comparison({ value }: { value: { percentage: number | null } }) {
  const styles = useThemedStyles(createStyles);
  if (value.percentage === null)
    return (
      <Text style={styles.comparisonMuted}>Karşılaştırma için önceki dönem verisi gerekiyor.</Text>
    );
  const increase = value.percentage > 0;
  return (
    <View style={styles.comparison}>
      <Ionicons
        name={increase ? 'trending-up-outline' : 'trending-down-outline'}
        size={16}
        color={increase ? '#B55B38' : '#0B6B50'}
        accessible={false}
      />
      <Text numberOfLines={2} style={styles.comparisonText}>
        {increase ? '+' : ''}
        {formatNumber(value.percentage, 1)}% önceki döneme göre
      </Text>
    </View>
  );
}

/** One cell of the compact fuel-efficiency grid. Values never wrap out of the card. */
function MetricCell({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.metricCell}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={styles.metricCellValue}
      >
        {value}
      </Text>
      <Text numberOfLines={2} style={styles.metricCellLabel}>
        {label}
      </Text>
    </View>
  );
}

export function VehicleReportsScreen({ onUpgrade }: { onUpgrade?: () => void }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useAppTheme();
  const {
    vehicles,
    activeVehicleId,
    records,
    reminders,
    bodyConditions,
    documents,
    expertiseReports,
    notes,
    entitlements,
    bootstrapped,
    loading,
    reportPeriodId,
    setReportPeriod,
  } = useDataStore();
  const periodId = reportPeriodId;
  const setPeriodId = setReportPeriod;
  const [periodOpen, setPeriodOpen] = useState(false);
  const [vehicleComparisons, setVehicleComparisons] = useState<VehicleComparison[]>([]);
  const [comparisonError, setComparisonError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const vehicle = vehicles.find((item) => item.id === activeVehicleId);
  const report = useMemo(
    () => (vehicle ? buildVehicleReport(records, vehicle, periodId) : null),
    [records, vehicle, periodId],
  );
  const comparisonVehicleIds = vehicles.map((item) => item.id).join('|');
  useEffect(() => {
    let subscribed = true;
    if (!vehicle || !entitlements.advancedReports || vehicles.length < 2)
      return () => {
        subscribed = false;
      };
    const otherVehicles = vehicles.filter((item) => item.id !== vehicle.id);
    void loadReportsForVehicles(otherVehicles, Math.max(0, entitlements.maxVehicles - 1))
      .then((loaded) => {
        if (subscribed) {
          setVehicleComparisons(
            buildVehicleComparisons([{ vehicle, records }, ...loaded], periodId),
          );
          setComparisonError(false);
        }
      })
      .catch(() => {
        if (subscribed) {
          setVehicleComparisons([]);
          setComparisonError(true);
        }
      });
    return () => {
      subscribed = false;
    };
  }, [
    comparisonVehicleIds,
    entitlements.advancedReports,
    entitlements.maxVehicles,
    periodId,
    records,
    vehicle,
    vehicles,
  ]);
  // Premium gate lives here as well as on the screen: the export must be
  // impossible to trigger without an active entitlement, not merely hidden.
  const exportPdf = async () => {
    if (!vehicle || !report || exporting) return;
    if (!entitlements.advancedReports) {
      onUpgrade?.();
      return;
    }
    setExportError(null);
    setExporting(true);
    try {
      const document = buildVehicleReportDocument({
        vehicle,
        records,
        reminders,
        bodyConditions,
        documents,
        expertiseReports,
        notes,
        periodId,
        report,
      });
      await exportVehicleReportPdf(
        renderVehicleReportHtml(document),
        buildVehicleReportFileName(vehicle),
        expoReportPdfGateway,
      );
    } catch (caught) {
      setExportError(getFriendlyError(caught));
    } finally {
      setExporting(false);
    }
  };

  if (!bootstrapped || loading) return <LoadingScreen />;
  if (!vehicle)
    return (
      <Screen backdrop={<AutomotiveBackdrop />}>
        <AppHeader title="Raporlar" subtitle="Araç verilerinizden anlamlı özetler" />
        <EmptyState
          title="Önce bir araç ekleyin"
          message="Raporlar seçili araç üzerinden hazırlanır."
          icon="car-outline"
        />
      </Screen>
    );
  if (!entitlements.advancedReports)
    return (
      <Screen backdrop={<AutomotiveBackdrop />}>
        <AppHeader title="Raporlar" subtitle={`${vehicle.brand} ${vehicle.model}`} />
        <Card style={styles.locked}>
          <View style={styles.lockIcon}>
            <Ionicons name="bar-chart-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.lockedTitle}>Premium raporlar</Text>
          <Text style={styles.lockedText}>
            Kayıtlı gider, yakıt ve bakım verilerinizi dönem bazında tek yerde görün ve
            paylaşılabilir bir PDF araç raporu oluşturun.
          </Text>
          <Text style={styles.lockedHint}>Bu özellik Premium plan ile kullanılabilir.</Text>
          {/* Present for Free users too, so the feature is discoverable; it routes
              to the paywall rather than producing a report. */}
          <AppButton
            title="PDF Araç Raporunu Dışa Aktar"
            icon="document-text-outline"
            variant="secondary"
            compact
            onPress={() => onUpgrade?.()}
          />
          {onUpgrade ? <AppButton title="Premium’u incele" compact onPress={onUpgrade} /> : null}
        </Card>
      </Screen>
    );
  if (!report) return null;

  const total = report.totalCost;
  // Spend distribution — the same three totals the previous stacked bars used.
  const distribution: DonutSegment[] = [
    { key: 'fuel', label: categoryLabels.fuel, value: report.fuelCost, color: colors.primaryAction },
    {
      key: 'maintenance',
      label: categoryLabels.maintenance,
      value: report.maintenanceCost,
      color: colors.aqua,
    },
    { key: 'expense', label: categoryLabels.expense, value: report.otherCost, color: colors.warning },
  ];
  const hasDistribution = distribution.some((segment) => segment.value > 0);
  const categoryBars = distribution
    .filter((segment) => segment.value > 0)
    .map((segment) => ({ key: segment.key, label: segment.label, value: segment.value }));
  const stationBars = report.stationDistribution.slice(0, 4).map((item) => ({
    key: item.id,
    label: item.id.replaceAll('_', ' '),
    value: item.total,
  }));
  const maintenanceBars = report.maintenanceBreakdown.slice(0, 4).map((item) => ({
    key: item.id,
    label: item.id.replaceAll('_', ' '),
    value: item.total,
  }));

  return (
    <Screen backdrop={<AutomotiveBackdrop />}>
      <FadeIn key={`${vehicle.id}-${periodId}`}>
        <View testID="report-period-transition" style={styles.page}>
          <AppHeader
            title="Raporlar"
            subtitle={`${vehicle.brand} ${vehicle.model}`}
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Dönem: ${periodOptions[periodId]}`}
                onPress={() => setPeriodOpen(true)}
                style={styles.periodButton}
              >
                <Text numberOfLines={1} style={styles.periodText}>
                  {periodOptions[periodId]}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.primary} />
              </Pressable>
            }
          />

          {/* PDF export sits above the dashboard: it is the one action on this
              screen that produces something the user can keep or hand over. */}
          <Card style={styles.exportCard}>
            <View style={styles.exportText}>
              <Text style={styles.cardTitle}>PDF araç raporu</Text>
              <Text style={styles.cardCaption}>
                Araç kimliği, harcamalar, bakım geçmişi ve gövde durumu tek bir
                paylaşılabilir dosyada.
              </Text>
            </View>
            <AppButton
              title={exporting ? 'Rapor hazırlanıyor' : 'PDF Araç Raporunu Dışa Aktar'}
              icon="document-text-outline"
              loading={exporting}
              disabled={exporting}
              onPress={() => void exportPdf()}
            />
            {exportError ? <ErrorBanner message={exportError} /> : null}
          </Card>

          {/* Hero summary — total cost, period and period-over-period change. */}
          <Card style={styles.hero}>
            <Text style={styles.eyebrow}>KAYITLI ARAÇ MALİYETİ</Text>
            <CountUp style={styles.total} value={total} format={(value) => formatCurrency(value)} />
            <Text numberOfLines={2} style={styles.heroCaption}>
              {report.period.label} içindeki yakıt, bakım ve diğer kayıtlar
            </Text>
            <Comparison value={report.comparisons.total} />
            <View style={styles.heroSplit}>
              {[
                ['Yakıt', report.fuelCost],
                ['Bakım', report.maintenanceCost],
                ['Diğer', report.otherCost],
              ].map(([label, value]) => (
                <View key={String(label)} style={styles.heroSplitCell}>
                  <Text numberOfLines={1} style={styles.heroSplitLabel}>
                    {label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    style={styles.heroSplitValue}
                  >
                    {formatCurrency(value as number)}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Spend distribution — donut. */}
          <Card>
            <Text style={styles.cardTitle}>Harcamaların dağılımı</Text>
            <Text style={styles.cardCaption}>Nereye ne kadar harcadınız?</Text>
            <View style={styles.cardBody}>
              {hasDistribution ? (
                <DonutChart
                  segments={distribution}
                  centerLabel="Toplam"
                  centerValue={formatCurrency(total)}
                />
              ) : (
                <Text style={styles.emptyInline}>Bu dönem için henüz maliyet kaydı yok.</Text>
              )}
            </View>
          </Card>

          {/* Monthly trend — the single line chart in the report. */}
          <Card>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeading}>
                <Text style={styles.cardTitle}>Aylık maliyet eğilimi</Text>
                <Text style={styles.cardCaption}>Döneme göre toplam kayıtlı gider</Text>
              </View>
              {report.hasTrend ? (
                <Text numberOfLines={1} style={styles.cardValue}>
                  {formatCurrency(total)}
                </Text>
              ) : null}
            </View>
            {report.hasTrend ? (
              <TrendChart data={report.buckets} formatValue={formatCurrency} />
            ) : (
              <Text style={styles.emptyInline}>
                Eğilimi görmek için en az iki farklı ayda kayıt gerekir.
              </Text>
            )}
          </Card>

          {/* Comparison — bar chart across categories, then stations. */}
          {categoryBars.length > 1 || stationBars.length ? (
            <Card>
              <Text style={styles.cardTitle}>Karşılaştırma</Text>
              <Text style={styles.cardCaption}>
                {stationBars.length
                  ? 'Kategori ve yakıt istasyonu bazında kayıtlı harcama'
                  : 'Kategori bazında kayıtlı harcama'}
              </Text>
              <View style={styles.cardBody}>
                {categoryBars.length > 1 ? (
                  <BarChart items={categoryBars} formatValue={formatCurrency} />
                ) : null}
                {stationBars.length ? (
                  <>
                    <Text style={styles.subHeading}>İstasyon dağılımı</Text>
                    <BarChart
                      items={stationBars}
                      formatValue={formatCurrency}
                      color={colors.primaryAction}
                    />
                  </>
                ) : null}
              </View>
            </Card>
          ) : null}

          {/* Fuel efficiency — one compact 2x3 grid instead of six separate cards. */}
          <SectionHeader title="Yakıt ve verimlilik" />
          <Card>
            <View style={styles.metricGrid}>
              <MetricCell
                label="Toplam yakıt"
                value={report.fuelLiters === null ? '—' : `${formatNumber(report.fuelLiters, 1)} L`}
              />
              <MetricCell
                label="Ort. litre fiyatı"
                value={
                  report.averageFuelPrice === null
                    ? '—'
                    : `${formatCurrency(report.averageFuelPrice)}/L`
                }
              />
              <MetricCell
                label="Kayıtlı mesafe"
                value={report.distanceKm === null ? '—' : `${formatNumber(report.distanceKm)} km`}
              />
              <MetricCell
                label="Km başı maliyet"
                value={report.costPerKm === null ? '—' : `${formatCurrency(report.costPerKm)}/km`}
              />
              {/* These two keep the stronger "Yeterli veri yok" wording: an
                  em dash would read as "nothing spent" rather than "unknown". */}
              <MetricCell
                label="Yakıt / km"
                value={
                  report.fuelCostPerKm === null
                    ? 'Yeterli veri yok'
                    : `${formatCurrency(report.fuelCostPerKm)}/km`
                }
              />
              <MetricCell
                label="Ortalama tüketim"
                value={
                  report.consumption === null
                    ? 'Yeterli veri yok'
                    : `${formatNumber(report.consumption, 1)} L/100`
                }
              />
            </View>
            {report.refuelFrequency !== null ? (
              <Text style={styles.inlineStat}>{report.refuelFrequency} yakıt alımı kaydedildi.</Text>
            ) : null}
          </Card>

          {/* Maintenance — one simplified summary plus a horizontal bar breakdown. */}
          <SectionHeader title="Bakım" />
          <Card>
            <View style={styles.metricGrid}>
              <MetricCell label="Bakım kaydı" value={String(report.maintenanceCount)} />
              <MetricCell
                label="Ort. bakım"
                value={
                  report.averageMaintenanceCost === null
                    ? '—'
                    : formatCurrency(report.averageMaintenanceCost)
                }
              />
              <MetricCell
                label="Parça"
                value={report.partsCost === null ? '—' : formatCurrency(report.partsCost)}
              />
              <MetricCell
                label="İşçilik"
                value={report.laborCost === null ? '—' : formatCurrency(report.laborCost)}
              />
            </View>
            {maintenanceBars.length ? (
              <View style={styles.cardBody}>
                <Text style={styles.subHeading}>Bakım işlemleri</Text>
                <BarChart items={maintenanceBars} formatValue={formatCurrency} color={colors.aqua} />
              </View>
            ) : null}
            {report.highestMaintenance ? (
              <Text numberOfLines={2} style={styles.inlineStat}>
                En yüksek bakım: {report.highestMaintenance.category} ·{' '}
                {formatCurrency(report.highestMaintenance.amount)}
              </Text>
            ) : null}
          </Card>

          {report.highestCategory ? (
            <Card style={styles.highlight}>
              <Ionicons name="bulb-outline" size={20} color={colors.primary} accessible={false} />
              <Text style={styles.highlightText}>
                Bu dönemde en yüksek kayıtlı harcama kaleminiz{' '}
                {categoryLabels[report.highestCategory].toLocaleLowerCase('tr-TR')}.
              </Text>
            </Card>
          ) : null}

          {comparisonError ? (
            <Card>
              <Text style={styles.cardTitle}>Araç karşılaştırması</Text>
              <Text style={styles.emptyInline}>
                Diğer araçların raporları şu anda yüklenemedi. Seçili aracın raporu kullanılabilir.
              </Text>
            </Card>
          ) : null}
          {vehicleComparisons.length > 1 ? (
            <>
              <SectionHeader title="Araç karşılaştırması" />
              <Card>
                <Text style={styles.cardTitle}>Kaydedilen maliyetler</Text>
                <Text style={styles.cardCaption}>
                  Sahip olduğunuz araçlar aynı dönemde karşılaştırılır.
                </Text>
                <View style={styles.cardBody}>
                  <BarChart
                    formatValue={formatCurrency}
                    items={vehicleComparisons.map((item) => ({
                      key: item.vehicleId,
                      label: `${item.label}${item.vehicleId === vehicle.id ? ' · Seçili' : ''}`,
                      value: item.totalCost,
                      caption: `${formatCurrency(item.fuelCost)} yakıt · ${formatCurrency(
                        item.maintenanceCost,
                      )} bakım · ${
                        item.costPerKm === null
                          ? 'Km maliyeti bilinmiyor'
                          : `${formatCurrency(item.costPerKm)}/km`
                      }`,
                    }))}
                  />
                </View>
              </Card>
            </>
          ) : null}

          <ActionSheet
            visible={periodOpen}
            title="Rapor dönemi"
            options={REPORT_PERIOD_IDS.map((id) => ({
              value: id,
              label: periodOptions[id],
              icon: id === periodId ? 'checkmark-circle' : 'calendar-outline',
            }))}
            onSelect={setPeriodId}
            onClose={() => setPeriodOpen(false)}
          />
        </View>
      </FadeIn>
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    page: { gap: spacing.md },
    periodButton: {
      minHeight: 38,
      maxWidth: 140,
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.paleAqua,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    periodText: {
      color: colors.primary,
      ...typography.caption,
      fontFamily: fontFamilies.semibold,
      flexShrink: 1,
    },
    exportCard: { gap: spacing.md },
    exportText: { gap: 2 },
    hero: { gap: spacing.sm, backgroundColor: colors.elevatedSurface },
    eyebrow: { color: colors.primary, ...typography.eyebrow },
    total: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.bold,
      fontSize: 34,
      lineHeight: 41,
      letterSpacing: -1,
    },
    heroCaption: { color: colors.textSecondary, ...typography.caption },
    heroSplit: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    heroSplitCell: { flex: 1, minWidth: 0, gap: 2 },
    heroSplitLabel: { color: colors.textSecondary, ...typography.caption },
    heroSplitValue: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.semibold,
      fontSize: 14,
      lineHeight: 19,
    },
    comparison: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.xs },
    comparisonText: { flex: 1, minWidth: 0, color: colors.textSecondary, ...typography.caption },
    comparisonMuted: { color: colors.textSecondary, ...typography.caption, marginTop: spacing.xs },
    inlineStat: { color: colors.textSecondary, ...typography.caption, marginTop: spacing.sm },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    cardHeading: { flex: 1, minWidth: 0 },
    cardBody: { marginTop: spacing.md, gap: spacing.md },
    cardTitle: { color: colors.textPrimary, ...typography.cardTitle },
    cardCaption: { color: colors.textSecondary, ...typography.caption, marginTop: 2 },
    cardValue: { color: colors.textPrimary, ...typography.label, flexShrink: 0, maxWidth: '46%' },
    subHeading: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.semibold,
      fontSize: 13,
    },
    emptyInline: { color: colors.textSecondary, ...typography.body },
    metricGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md, columnGap: spacing.sm },
    metricCell: {
      // Two columns on every supported width; a third never squeezes currency.
      flexBasis: '47%',
      flexGrow: 1,
      minWidth: 0,
      gap: 2,
    },
    metricCellValue: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.bold,
      fontSize: 16,
      lineHeight: 21,
    },
    metricCellLabel: { color: colors.textSecondary, ...typography.caption },
    highlight: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: colors.paleAqua,
    },
    highlightText: { color: colors.textPrimary, ...typography.body, flex: 1, minWidth: 0 },
    locked: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
    lockIcon: {
      width: 56,
      height: 56,
      borderRadius: 20,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lockedTitle: { color: colors.textPrimary, ...typography.sectionTitle },
    lockedText: { color: colors.textSecondary, ...typography.body, textAlign: 'center' },
    lockedHint: { color: colors.primary, ...typography.label },
  });
