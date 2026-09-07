import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AutomotiveBackdrop } from '@/shared/components/AutomotiveBackdrop';
import {
  ActionSheet,
  AppButton,
  Card,
  EmptyState,
  ErrorBanner,
  FadeIn,
  LoadingScreen,
  Screen,
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
import { formatCurrency, formatDate, formatNumber } from '@/shared/utils/format';
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
  type VehicleComparison,
  type VehicleReport,
} from '../domain/vehicleReports';
import { loadReportsForVehicles } from '../services/vehicleReportLoader';
import {
  CategoryBars,
  DonutChart,
  KpiRow,
  MiniBars,
  TrendColumnChart,
  type DonutSegment,
} from './ReportCharts';

const periodOptions = {
  month: 'Bu ay',
  last_month: 'Geçen ay',
  three_months: 'Son 3 ay',
  six_months: 'Son 6 ay',
  year: 'Bu yıl',
} as const;

const categoryLabels = { fuel: 'Yakıt', maintenance: 'Bakım', expense: 'Diğer' } as const;

function Eyebrow({ children }: { children: string }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.eyebrow}>{children}</Text>;
}

function SectionTitle({ title, caption }: { title: string; caption?: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    </View>
  );
}

function Divider() {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.divider} />;
}

function InsufficientData({ message }: { message: string }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.insufficient}>{message}</Text>;
}

/** Period-over-period movement as a coloured pill — only when the maths is valid. */
function ComparisonPill({ percentage }: { percentage: number | null }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  if (percentage === null) {
    return (
      <Text style={styles.comparisonMuted}>Önceki dönemle karşılaştırma için veri gerekiyor.</Text>
    );
  }
  const rounded = Math.round(percentage * 10) / 10;
  const isUp = rounded > 0;
  const isFlat = rounded === 0;
  const tone = isFlat ? colors.textSecondary : isUp ? colors.chart.negative : colors.chart.positive;
  const surface = isFlat
    ? colors.elevatedSurface
    : isUp
      ? colors.chart.negativeSurface
      : colors.chart.positiveSurface;
  return (
    <View style={[styles.comparisonPill, { backgroundColor: surface }]}>
      <Ionicons
        name={isFlat ? 'remove' : isUp ? 'arrow-up' : 'arrow-down'}
        size={13}
        color={tone}
        accessible={false}
      />
      <Text style={[styles.comparisonText, { color: tone }]}>
        %{formatNumber(Math.abs(rounded), 1)} önceki döneme göre
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
  const [periodOpen, setPeriodOpen] = useState(false);
  const [vehicleComparisons, setVehicleComparisons] = useState<VehicleComparison[]>([]);
  const [comparisonError, setComparisonError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const vehicle = vehicles.find((item) => item.id === activeVehicleId);
  const report: VehicleReport | null = useMemo(
    () => (vehicle ? buildVehicleReport(records, vehicle, periodId) : null),
    [records, vehicle, periodId],
  );

  const comparisonVehicleIds = vehicles.map((item) => item.id).join('|');
  const multiVehicle = vehicles.length > 1;
  useEffect(() => {
    let subscribed = true;
    if (!vehicle || !entitlements.advancedReports || !multiVehicle) {
      return () => {
        subscribed = false;
      };
    }
    const otherVehicles = vehicles.filter((item) => item.id !== vehicle.id);
    void loadReportsForVehicles(otherVehicles, Math.max(0, entitlements.maxVehicles - 1))
      .then((loaded) => {
        if (!subscribed) return;
        setVehicleComparisons(buildVehicleComparisons([{ vehicle, records }, ...loaded], periodId));
        setComparisonError(false);
      })
      .catch(() => {
        if (!subscribed) return;
        setVehicleComparisons([]);
        setComparisonError(true);
      });
    return () => {
      subscribed = false;
    };
  }, [
    comparisonVehicleIds,
    entitlements.advancedReports,
    entitlements.maxVehicles,
    multiVehicle,
    periodId,
    records,
    vehicle,
    vehicles,
  ]);

  // The gate lives in the handler too, not only the layout: export must be
  // impossible without an active entitlement. Rapid taps cannot stack jobs
  // because `exporting` short-circuits re-entry.
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

  if (!vehicle) {
    return (
      <Screen backdrop={<AutomotiveBackdrop />}>
        <Text style={styles.screenTitle}>Raporlar</Text>
        <EmptyState
          title="Önce bir araç ekleyin"
          message="Raporlar seçili araç üzerinden hazırlanır."
          icon="car-outline"
        />
      </Screen>
    );
  }

  if (!entitlements.advancedReports) {
    return (
      <Screen backdrop={<AutomotiveBackdrop />}>
        <Text style={styles.screenTitle}>Raporlar</Text>
        <Card style={styles.locked}>
          <View style={styles.lockIcon}>
            <Ionicons name="bar-chart-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.lockedTitle}>Premium raporlar</Text>
          <Text style={styles.lockedText}>
            Kayıtlı gider, yakıt ve bakım verilerinizi dönem bazında görün ve paylaşılabilir bir PDF
            araç raporu oluşturun.
          </Text>
          <Text style={styles.lockedHint}>Bu özellik Premium plan ile kullanılabilir.</Text>
          <AppButton
            title="PDF araç raporunu dışa aktar"
            icon="share-outline"
            variant="secondary"
            compact
            onPress={() => onUpgrade?.()}
          />
          {onUpgrade ? <AppButton title="Premium’u incele" compact onPress={onUpgrade} /> : null}
        </Card>
      </Screen>
    );
  }

  if (!report) return null;

  const { resolvedPeriod } = report;
  const periodRange = `${formatDate(resolvedPeriod.startInclusive)} – ${formatDate(
    resolvedPeriod.endExclusive,
  )}`;
  const heroSpark = report.buckets.map((bucket) => bucket.total);
  const distribution: DonutSegment[] = [
    { key: 'fuel', label: categoryLabels.fuel, value: report.fuelCost, color: colors.chart.fuel },
    {
      key: 'maintenance',
      label: categoryLabels.maintenance,
      value: report.maintenanceCost,
      color: colors.chart.maintenance,
    },
    {
      key: 'expense',
      label: categoryLabels.expense,
      value: report.otherCost,
      color: colors.chart.other,
    },
  ];
  const hasDistribution = distribution.some((segment) => segment.value > 0);
  const trendColumns = report.buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    total: bucket.total,
    fuel: bucket.fuel,
    maintenance: bucket.maintenance,
    other: bucket.expense,
    isPartial: bucket.isPartial,
  }));
  const fuelSpark = report.fuelBuckets.map((bucket) => bucket.fuel);
  const fuelSparkActive = report.fuelBuckets.filter((bucket) => bucket.fuel > 0).length > 1;
  const maintenanceBreakdown = report.maintenanceBreakdown.slice(0, 4).map((item) => ({
    key: item.id,
    label: item.id.replaceAll('_', ' '),
    value: item.total,
    color: colors.chart.maintenance,
  }));
  const stationBreakdown = report.stationDistribution.slice(0, 4).map((item) => ({
    key: item.id,
    label: item.id.replaceAll('_', ' '),
    value: item.total,
    color: colors.chart.fuel,
  }));

  const trendLabel = report.trendGranularity === 'week' ? 'Haftaya göre' : 'Aya göre';

  return (
    <Screen backdrop={<AutomotiveBackdrop />}>
      <FadeIn key={`${vehicle.id}-${periodId}`}>
        <View testID="report-page" style={styles.page}>
          {/* Header — identity, period control, export. No boxed header card. */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.screenTitle}>Raporlar</Text>
              <Text numberOfLines={1} style={styles.headerVehicle}>
                {vehicle.brand} {vehicle.model}
              </Text>
              <Text numberOfLines={1} style={styles.headerRange}>
                {periodRange}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Raporu PDF olarak dışa aktar"
                accessibilityState={{ busy: exporting, disabled: exporting }}
                disabled={exporting}
                hitSlop={8}
                onPress={() => void exportPdf()}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              >
                <Ionicons
                  name={exporting ? 'ellipsis-horizontal' : 'share-outline'}
                  size={19}
                  color={colors.primary}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Dönem: ${periodOptions[periodId]}. Değiştir.`}
                onPress={() => setPeriodOpen(true)}
                style={({ pressed }) => [styles.periodButton, pressed && styles.pressed]}
              >
                <Text numberOfLines={1} style={styles.periodText}>
                  {periodOptions[periodId]}
                </Text>
                <Ionicons name="chevron-down" size={15} color={colors.primary} />
              </Pressable>
            </View>
          </View>
          {exportError ? <ErrorBanner message={exportError} /> : null}

          {/* Hero — the primary insight as typography, not a card. */}
          <View style={styles.hero}>
            <Eyebrow>KAYITLI ARAÇ MALİYETİ</Eyebrow>
            <Text
              testID="report-hero-total"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              style={styles.heroTotal}
            >
              {formatCurrency(report.totalCost)}
            </Text>
            <Text numberOfLines={2} style={styles.heroContext}>
              {resolvedPeriod.label} içindeki yakıt, bakım ve diğer kayıtlar
            </Text>
            <View style={styles.heroFooter}>
              <ComparisonPill percentage={report.comparisons.total.percentage} />
              {report.buckets.some((bucket) => bucket.total > 0) ? (
                <MiniBars values={heroSpark} color={colors.chart.lilac} />
              ) : null}
            </View>
          </View>

          <Divider />

          {/* Cost trend */}
          <SectionTitle title="Maliyet eğilimi" caption={`${trendLabel} toplam kayıtlı gider`} />
          {report.hasTrend ? (
            <TrendColumnChart data={trendColumns} formatValue={formatCurrency} />
          ) : (
            <InsufficientData
              message={
                report.totalCost > 0
                  ? 'Eğilim için birden fazla dönemde kayıt gerekiyor.'
                  : 'Bu dönemde kayıtlı gider yok.'
              }
            />
          )}

          <Divider />

          {/* Spending distribution */}
          <SectionTitle title="Harcama dağılımı" caption="Yakıt, bakım ve diğer giderler" />
          {hasDistribution ? (
            <DonutChart
              segments={distribution}
              centerLabel="Toplam"
              centerValue={formatCurrency(report.totalCost)}
              formatValue={formatCurrency}
            />
          ) : (
            <InsufficientData message="Bu dönemde harcama kaydı bulunmuyor." />
          )}

          <Divider />

          {/* Fuel & efficiency — a chart where the data supports it, then KPIs. */}
          <SectionTitle title="Yakıt ve verimlilik" caption={`${resolvedPeriod.label}`} />
          {fuelSparkActive ? (
            <View style={styles.fuelSpark}>
              <MiniBars values={fuelSpark} color={colors.chart.fuel} />
              <Text style={styles.fuelSparkLabel}>{trendLabel} yakıt harcaması</Text>
            </View>
          ) : null}
          <View style={styles.kpiGroup}>
            <KpiRow
              label="Toplam yakıt"
              value={report.fuelLiters === null ? '—' : `${formatNumber(report.fuelLiters, 1)} L`}
            />
            <KpiRow
              label="Ortalama litre fiyatı"
              value={
                report.averageFuelPrice === null
                  ? '—'
                  : `${formatCurrency(report.averageFuelPrice)}/L`
              }
            />
            <KpiRow
              label="Kayıtlı mesafe"
              value={
                report.distanceKm === null
                  ? 'Yeterli veri yok'
                  : `${formatNumber(report.distanceKm)} km`
              }
            />
            <KpiRow
              label="Kilometre başına maliyet"
              value={
                report.costPerKm === null
                  ? 'Yeterli veri yok'
                  : `${formatCurrency(report.costPerKm)}/km`
              }
            />
            <KpiRow
              label="Ortalama tüketim"
              value={
                report.consumption === null
                  ? 'Yeterli veri yok'
                  : `${formatNumber(report.consumption, 1)} L/100 km`
              }
            />
          </View>
          {report.distanceUsesPriorBaseline ? (
            <Text style={styles.footnote}>
              Mesafe, dönem öncesi son kilometre kaydından itibaren hesaplandı.
            </Text>
          ) : null}
          {stationBreakdown.length ? (
            <View style={styles.subGroup}>
              <Text style={styles.subHeading}>İstasyon dağılımı</Text>
              <CategoryBars items={stationBreakdown} formatValue={formatCurrency} />
            </View>
          ) : null}

          <Divider />

          {/* Maintenance — a compact summary, not four boxed KPIs. */}
          <SectionTitle title="Bakım" />
          <View style={styles.kpiGroup}>
            <KpiRow label="Bakım kaydı" value={String(report.maintenanceCount)} />
            <KpiRow
              label="Ortalama bakım tutarı"
              value={
                report.averageMaintenanceCost === null
                  ? '—'
                  : formatCurrency(report.averageMaintenanceCost)
              }
            />
            <KpiRow
              label="Parça"
              value={report.partsCost === null ? '—' : formatCurrency(report.partsCost)}
            />
            <KpiRow
              label="İşçilik"
              value={report.laborCost === null ? '—' : formatCurrency(report.laborCost)}
            />
          </View>
          {maintenanceBreakdown.length ? (
            <View style={styles.subGroup}>
              <Text style={styles.subHeading}>Bakım işlemleri</Text>
              <CategoryBars items={maintenanceBreakdown} formatValue={formatCurrency} />
            </View>
          ) : null}
          {report.highestMaintenance ? (
            <Text numberOfLines={2} style={styles.footnote}>
              En yüksek bakım: {report.highestMaintenance.category} ·{' '}
              {formatCurrency(report.highestMaintenance.amount)}
            </Text>
          ) : null}

          {comparisonError && multiVehicle ? (
            <>
              <Divider />
              <SectionTitle title="Araç karşılaştırması" />
              <InsufficientData message="Diğer araçların raporları şu anda yüklenemedi. Seçili aracın raporu kullanılabilir." />
            </>
          ) : null}
          {multiVehicle && vehicleComparisons.length > 1 ? (
            <>
              <Divider />
              <SectionTitle
                title="Araç karşılaştırması"
                caption="Araçlarınız aynı dönemde karşılaştırılır"
              />
              <CategoryBars
                formatValue={formatCurrency}
                items={vehicleComparisons.map((item) => ({
                  key: item.vehicleId,
                  label: `${item.label}${item.vehicleId === vehicle.id ? ' · Seçili' : ''}`,
                  value: item.totalCost,
                  color:
                    item.vehicleId === vehicle.id ? colors.chart.fuel : colors.chart.lilac,
                  caption: `${formatCurrency(item.fuelCost)} yakıt · ${formatCurrency(
                    item.maintenanceCost,
                  )} bakım${
                    item.costPerKm === null
                      ? ''
                      : ` · ${formatCurrency(item.costPerKm)}/km`
                  }`,
                }))}
              />
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
            onSelect={(value) => setReportPeriod(value)}
            onClose={() => setPeriodOpen(false)}
          />
        </View>
      </FadeIn>
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    page: { gap: spacing.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },

    screenTitle: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.serifSemibold,
      fontSize: 30,
      lineHeight: 37,
      letterSpacing: -0.4,
    },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    headerText: { flex: 1, minWidth: 0, gap: 2 },
    headerVehicle: { color: colors.textPrimary, ...typography.bodyMedium },
    headerRange: { color: colors.textSecondary, ...typography.caption },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.elevatedSurface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    periodButton: {
      minHeight: 40,
      maxWidth: 130,
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
    pressed: { opacity: 0.7 },

    hero: { gap: spacing.xs },
    eyebrow: { color: colors.primary, ...typography.eyebrow },
    heroTotal: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.serifSemibold,
      fontSize: 44,
      lineHeight: 52,
      letterSpacing: -0.8,
    },
    heroContext: { color: colors.textSecondary, ...typography.caption },
    heroFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginTop: spacing.xs,
      flexWrap: 'wrap',
    },
    comparisonPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.pill,
      flexShrink: 1,
    },
    comparisonText: { ...typography.caption, fontFamily: fontFamilies.semibold, flexShrink: 1 },
    comparisonMuted: { color: colors.textSecondary, ...typography.caption, flexShrink: 1 },

    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: spacing.xs,
    },

    sectionHead: { gap: 2 },
    sectionTitle: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.serifSemibold,
      fontSize: 20,
      lineHeight: 26,
      letterSpacing: -0.2,
    },
    sectionCaption: { color: colors.textSecondary, ...typography.caption },

    insufficient: { color: colors.textSecondary, ...typography.body, paddingVertical: spacing.sm },

    fuelSpark: { gap: 4 },
    fuelSparkLabel: { color: colors.textSecondary, ...typography.caption },

    kpiGroup: { marginTop: spacing.xs },
    subGroup: { gap: spacing.sm, marginTop: spacing.md },
    subHeading: { color: colors.textPrimary, fontFamily: fontFamilies.semibold, fontSize: 13 },
    footnote: { color: colors.textSecondary, ...typography.caption, marginTop: spacing.sm },

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
