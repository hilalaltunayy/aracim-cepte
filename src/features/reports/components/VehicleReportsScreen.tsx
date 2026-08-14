import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Polyline } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheet, AppHeader, Card, EmptyState, FadeIn, LoadingScreen, Screen, SectionHeader } from '@/shared/components/ui';
import { fontFamilies, radii, spacing, typography, useAppTheme, useThemedStyles, type AppTheme } from '@/shared/theme';
import { formatCurrency, formatNumber } from '@/shared/utils/format';
import { useDataStore } from '@/store/dataStore';
import { buildVehicleComparisons, buildVehicleReport, REPORT_PERIOD_IDS, type ReportPeriodId, type VehicleComparison } from '../domain/vehicleReports';
import { loadReportsForVehicles } from '../services/vehicleReportLoader';

const periodOptions = { month: 'Bu ay', last_month: 'Geçen ay', three_months: 'Son 3 ay', six_months: 'Son 6 ay', year: 'Bu yıl' } as const;
const categoryLabels = { fuel: 'Yakıt', maintenance: 'Bakım', expense: 'Diğer' } as const;
const categoryIcons = { fuel: 'water-outline', maintenance: 'construct-outline', expense: 'receipt-outline' } as const;

function TrendChart({ data }: { data: ReturnType<typeof buildVehicleReport>['buckets'] }) {
  const { colors } = useAppTheme(); const styles = useThemedStyles(createStyles);
  const max = Math.max(...data.map((item) => item.total), 0); const width = 300; const height = 114; const pad = 10;
  const points = data.map((item, index) => `${pad + (index * (width - pad * 2)) / Math.max(data.length - 1, 1)},${height - pad - (max ? (item.total / max) * (height - pad * 2) : 0)}`).join(' ');
  const revealKey = data.map((item) => `${item.key}:${item.total}`).join('|');
  const [reveal] = useState(() => new Animated.Value(0));
  useEffect(() => { reveal.setValue(0); Animated.timing(reveal, { toValue: 1, duration: 460, useNativeDriver: false }).start(); }, [reveal, revealKey]);
  return <View accessibilityLabel="Döneme göre kayıtlı araç maliyeti eğilimi" style={styles.chartWrap}>
    <Animated.View testID="report-line-reveal" style={{ overflow: 'hidden', width: reveal.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }}>
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} accessible={false}>
      <Line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke={colors.chartGrid} strokeWidth={1} />
      <Line x1={pad} x2={width - pad} y1={height / 2} y2={height / 2} stroke={colors.chartGrid} strokeWidth={1} strokeDasharray="3 5" />
      {max ? <Path d={`M ${points.split(' ')[0]} L ${points} L ${width - pad},${height - pad} Z`} fill={colors.paleAqua} /> : null}
      <Polyline points={points} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg></Animated.View>
    <View style={styles.chartLabels}>{data.map((item) => <Text key={item.key} style={styles.chartLabel}>{item.label}</Text>)}</View>
  </View>;
}

function CountUp({ value, format, style }: { value: number | null; format: (value: number) => string; style?: object }) {
  const [animated] = useState(() => new Animated.Value(0)); const [display, setDisplay] = useState(0);
  useEffect(() => { const listener = animated.addListener(({ value: next }) => setDisplay(next)); animated.setValue(0); Animated.timing(animated, { toValue: value ?? 0, duration: 320, useNativeDriver: false }).start(); return () => animated.removeListener(listener); }, [animated, value]);
  return <Text testID="report-kpi-count-up" style={[stylesForCount.value, style]}>{value === null ? 'Yeterli veri yok' : format(display)}</Text>;
}
const stylesForCount = StyleSheet.create({ value: { fontFamily: fontFamilies.bold, fontSize: 15, lineHeight: 20 } });

function EntranceBar({ percent, color }: { percent: number; color: string }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 300, useNativeDriver: false }).start();
  }, [percent, progress]);
  return <Animated.View testID="report-bar-entrance" style={{ height: '100%', borderRadius: radii.pill, backgroundColor: color, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${Math.max(0, Math.min(percent, 100))}%`] }) }} />;
}

function Comparison({ value }: { value: { percentage: number | null } }) {
  const styles = useThemedStyles(createStyles);
  if (value.percentage === null) return <Text style={styles.comparisonMuted}>Karşılaştırma için önceki dönem verisi gerekiyor.</Text>;
  const increase = value.percentage > 0;
  return <View style={styles.comparison}><Ionicons name={increase ? 'trending-up-outline' : 'trending-down-outline'} size={16} color={increase ? '#B55B38' : '#0B6B50'} accessible={false} /><Text style={styles.comparisonText}>{increase ? '+' : ''}{formatNumber(value.percentage, 1)}% önceki döneme göre</Text></View>;
}

export function VehicleReportsScreen() {
  const styles = useThemedStyles(createStyles); const { colors } = useAppTheme();
  const { vehicles, activeVehicleId, records, entitlements, bootstrapped, loading } = useDataStore();
  const [periodId, setPeriodId] = useState<ReportPeriodId>('six_months'); const [periodOpen, setPeriodOpen] = useState(false);
  const [vehicleComparisons, setVehicleComparisons] = useState<VehicleComparison[]>([]);
  const [comparisonError, setComparisonError] = useState(false);
  const vehicle = vehicles.find((item) => item.id === activeVehicleId);
  const report = useMemo(() => vehicle ? buildVehicleReport(records, vehicle, periodId) : null, [records, vehicle, periodId]);
  const comparisonVehicleIds = vehicles.map((item) => item.id).join('|');
  useEffect(() => {
    let subscribed = true;
    if (!vehicle || !entitlements.advancedReports || vehicles.length < 2) return () => { subscribed = false; };
    const otherVehicles = vehicles.filter((item) => item.id !== vehicle.id);
    void loadReportsForVehicles(otherVehicles, Math.max(0, entitlements.maxVehicles - 1)).then((loaded) => {
      if (subscribed) { setVehicleComparisons(buildVehicleComparisons([{ vehicle, records }, ...loaded], periodId)); setComparisonError(false); }
    }).catch(() => { if (subscribed) { setVehicleComparisons([]); setComparisonError(true); } });
    return () => { subscribed = false; };
  }, [comparisonVehicleIds, entitlements.advancedReports, entitlements.maxVehicles, periodId, records, vehicle, vehicles]);
  if (!bootstrapped || loading) return <LoadingScreen />;
  if (!vehicle) return <Screen><AppHeader title="Raporlar" subtitle="Araç verilerinizden anlamlı özetler" /><EmptyState title="Önce bir araç ekleyin" message="Raporlar seçili araç üzerinden hazırlanır." icon="car-outline" /></Screen>;
  if (!entitlements.advancedReports) return <Screen><AppHeader title="Raporlar" subtitle={`${vehicle.brand} ${vehicle.model}`} /><Card style={styles.locked}><View style={styles.lockIcon}><Ionicons name="bar-chart-outline" size={24} color={colors.primary} /></View><Text style={styles.lockedTitle}>Premium raporlar</Text><Text style={styles.lockedText}>Kayıtlı gider, yakıt ve bakım verilerinizi dönem bazında tek yerde görün.</Text><Text style={styles.lockedHint}>Bu özellik Premium plan ile kullanılabilir.</Text></Card></Screen>;
  if (!report) return null;
  const total = report.totalCost;
  const sections = ([['fuel', report.fuelCost], ['maintenance', report.maintenanceCost], ['expense', report.otherCost]] as const).filter(([, value]) => value > 0);
  return <Screen><FadeIn key={`${vehicle.id}-${periodId}`}><View testID="report-period-transition">
    <AppHeader title="Raporlar" subtitle={`${vehicle.brand} ${vehicle.model}`} action={<Pressable accessibilityRole="button" accessibilityLabel={`Dönem: ${periodOptions[periodId]}`} onPress={() => setPeriodOpen(true)} style={styles.periodButton}><Text style={styles.periodText}>{periodOptions[periodId]}</Text><Ionicons name="chevron-down" size={16} color={colors.primary} /></Pressable>} />
    <Card style={styles.snapshot}><Text style={styles.eyebrow}>KAYITLI ARAÇ MALİYETİ</Text><CountUp style={styles.total} value={total} format={(value) => formatCurrency(value)} /><Text style={styles.snapshotCaption}>{report.period.label} içindeki yakıt, bakım ve diğer kayıtlar</Text><Comparison value={report.comparisons.total} /></Card>
    <View style={styles.metricRow}>{[["Yakıt", report.fuelCost, 'water-outline'], ["Bakım", report.maintenanceCost, 'construct-outline']].map(([label, value, icon]) => <Card key={String(label)} style={styles.metric}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} accessible={false} /><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{formatCurrency(value as number)}</Text></Card>)}</View>
    <Card><View style={styles.cardHeader}><View><Text style={styles.cardTitle}>Maliyet eğilimi</Text><Text style={styles.cardCaption}>Döneme göre toplam kayıtlı gider</Text></View>{report.hasTrend ? <Text style={styles.cardValue}>{formatCurrency(total)}</Text> : null}</View>{report.hasTrend ? <TrendChart data={report.buckets} /> : <Text style={styles.emptyInline}>Eğilimi görmek için en az iki farklı ayda kayıt gerekir.</Text>}</Card>
    <Card><View style={styles.cardHeader}><View><Text style={styles.cardTitle}>Harcamaların dağılımı</Text><Text style={styles.cardCaption}>Nereye ne kadar harcadınız?</Text></View></View>{sections.length ? <View style={styles.breakdown}>{sections.map(([type, value]) => <View key={type} style={styles.breakdownRow}><View style={styles.breakdownHeader}><View style={styles.breakdownName}><Ionicons name={categoryIcons[type]} size={16} color={colors.primary} accessible={false} /><Text style={styles.metricLabel}>{categoryLabels[type]}</Text></View><Text style={styles.breakdownValue}>{formatCurrency(value)}</Text></View><View style={styles.track}><EntranceBar percent={(value / total) * 100} color={colors.primary} /></View></View>)}</View> : <Text style={styles.emptyInline}>Bu dönem için henüz maliyet kaydı yok.</Text>}</Card>
    <SectionHeader title="Yakıt ve verimlilik" />
    <View style={styles.metricRow}><Card style={styles.metric}><Text style={styles.detailValue}>{report.fuelLiters === null ? '—' : `${formatNumber(report.fuelLiters, 1)} L`}</Text><Text style={styles.metricLabel}>Toplam yakıt</Text></Card><Card style={styles.metric}><Text style={styles.detailValue}>{report.averageFuelPrice === null ? '—' : `${formatCurrency(report.averageFuelPrice)}/L`}</Text><Text style={styles.metricLabel}>Ort. litre fiyatı</Text></Card></View>
    <View style={styles.metricRow}><Card style={styles.metric}><Text style={styles.detailValue}>{report.distanceKm === null ? '—' : `${formatNumber(report.distanceKm)} km`}</Text><Text style={styles.metricLabel}>Kayıtlı mesafe</Text></Card><Card style={styles.metric}><Text style={styles.detailValue}>{report.costPerKm === null ? '—' : `${formatCurrency(report.costPerKm)}/km`}</Text><Text style={styles.metricLabel}>Km başı maliyet</Text></Card></View>
    <View style={styles.metricRow}><Card style={styles.metric}><Text style={styles.detailValue}>{report.fuelCostPerKm === null ? 'Yeterli veri yok' : `${formatCurrency(report.fuelCostPerKm)}/km`}</Text><Text style={styles.metricLabel}>Yakıt / km</Text></Card><Card style={styles.metric}><Text style={styles.detailValue}>{report.consumption === null ? 'Yeterli veri yok' : `${formatNumber(report.consumption, 1)} L/100 km`}</Text><Text style={styles.metricLabel}>Ortalama tüketim</Text></Card></View>
    {report.fuelBuckets.filter((item) => item.fuel > 0).length > 1 ? <Card><View style={styles.cardHeader}><View><Text style={styles.cardTitle}>Yakıt harcama eğilimi</Text><Text style={styles.cardCaption}>Döneme göre yakıt harcaması</Text></View><Text style={styles.cardValue}>{formatCurrency(report.fuelCost)}</Text></View><TrendChart data={report.fuelBuckets.map((item) => ({ ...item, total: item.fuel }))} /></Card> : null}
    {report.refuelFrequency !== null ? <Text style={styles.inlineStat}>{report.refuelFrequency} yakıt alımı kaydedildi.</Text> : null}
    {report.stationDistribution.length ? <Card><Text style={styles.cardTitle}>İstasyon dağılımı</Text><Text style={styles.cardCaption}>Yakıt harcaması markaya göre</Text><View style={styles.breakdown}>{report.stationDistribution.slice(0, 3).map((item) => <View key={item.id} style={styles.breakdownRow}><View style={styles.breakdownHeader}><Text style={styles.metricLabel}>{item.id.replace('_', ' ')}</Text><Text style={styles.breakdownValue}>{formatCurrency(item.total)}</Text></View><View style={styles.track}><EntranceBar percent={(item.total / report.fuelCost) * 100} color={colors.primary} /></View></View>)}</View></Card> : null}
    <SectionHeader title="Bakım" />
    <Card><View style={styles.maintenanceLine}><View><Text style={styles.detailValue}>{report.maintenanceCount}</Text><Text style={styles.metricLabel}>Bakım kaydı</Text></View><View><Text style={styles.breakdownValue}>{report.averageMaintenanceCost === null ? '—' : formatCurrency(report.averageMaintenanceCost)}</Text><Text style={styles.metricLabel}>Ort. bakım</Text></View><View><Text style={styles.breakdownValue}>{report.partsCost === null ? '—' : formatCurrency(report.partsCost)}</Text><Text style={styles.metricLabel}>Parça</Text></View><View><Text style={styles.breakdownValue}>{report.laborCost === null ? '—' : formatCurrency(report.laborCost)}</Text><Text style={styles.metricLabel}>İşçilik</Text></View></View></Card>
    {report.maintenanceBuckets.filter((item) => item.maintenance > 0).length > 1 ? <Card><View style={styles.cardHeader}><View><Text style={styles.cardTitle}>Bakım harcama eğilimi</Text><Text style={styles.cardCaption}>Döneme göre bakım harcaması</Text></View><Text style={styles.cardValue}>{formatCurrency(report.maintenanceCost)}</Text></View><TrendChart data={report.maintenanceBuckets.map((item) => ({ ...item, total: item.maintenance }))} /></Card> : null}
    {report.maintenanceBreakdown.length ? <Card><Text style={styles.cardTitle}>Bakım işlemleri</Text><Text style={styles.cardCaption}>Kaydedilen bakım kalemlerine göre</Text><View style={styles.breakdown}>{report.maintenanceBreakdown.slice(0, 3).map((item) => <View key={item.id} style={styles.breakdownRow}><View style={styles.breakdownHeader}><Text style={styles.metricLabel}>{item.id.replaceAll('_', ' ')}</Text><Text style={styles.breakdownValue}>{formatCurrency(item.total)}</Text></View><View style={styles.track}><EntranceBar percent={(item.total / report.maintenanceCost) * 100} color={colors.primary} /></View></View>)}</View></Card> : null}
    {report.highestMaintenance ? <Card style={styles.highlight}><Ionicons name="construct-outline" size={20} color={colors.primary} accessible={false} /><Text style={styles.highlightText}>En yüksek bakım: {report.highestMaintenance.category} · {formatCurrency(report.highestMaintenance.amount)}</Text></Card> : null}
    {report.highestCategory ? <Card style={styles.highlight}><Ionicons name="bulb-outline" size={20} color={colors.primary} accessible={false} /><Text style={styles.highlightText}>Bu dönemde en yüksek kayıtlı harcama kaleminiz {categoryLabels[report.highestCategory].toLocaleLowerCase('tr-TR')}.</Text></Card> : null}
    {comparisonError ? <Card><Text style={styles.cardTitle}>Araç karşılaştırması</Text><Text style={styles.emptyInline}>Diğer araçların raporları şu anda yüklenemedi. Seçili aracın raporu kullanılabilir.</Text></Card> : null}
    {vehicleComparisons.length > 1 ? <><SectionHeader title="Araç karşılaştırması" /><Card><Text style={styles.cardTitle}>Kaydedilen maliyetler</Text><Text style={styles.cardCaption}>Sahip olduğunuz araçlar aynı dönemde karşılaştırılır.</Text><View style={styles.breakdown}>{vehicleComparisons.map((item) => <View key={item.vehicleId} style={styles.breakdownRow}><View style={styles.breakdownHeader}><Text style={styles.breakdownValue}>{item.label}{item.vehicleId === vehicle.id ? ' · Seçili' : ''}</Text><Text style={styles.breakdownValue}>{formatCurrency(item.totalCost)}</Text></View><View style={styles.track}><EntranceBar percent={(item.totalCost / Math.max(...vehicleComparisons.map((value) => value.totalCost), 1)) * 100} color={colors.primary} /></View><Text style={styles.metricLabel}>{formatCurrency(item.fuelCost)} yakıt · {formatCurrency(item.maintenanceCost)} bakım · {item.distanceKm === null ? 'Mesafe bilinmiyor' : `${formatNumber(item.distanceKm)} km`} · {item.costPerKm === null ? 'Km maliyeti bilinmiyor' : `${formatCurrency(item.costPerKm)}/km`}</Text></View>)}</View></Card></> : null}
    <ActionSheet visible={periodOpen} title="Rapor dönemi" options={REPORT_PERIOD_IDS.map((id) => ({ value: id, label: periodOptions[id], icon: id === periodId ? 'checkmark-circle' : 'calendar-outline' }))} onSelect={setPeriodId} onClose={() => setPeriodOpen(false)} />
  </View></FadeIn></Screen>;
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  periodButton: { minHeight: 38, borderRadius: radii.md, paddingHorizontal: spacing.sm, backgroundColor: colors.paleAqua, flexDirection: 'row', alignItems: 'center', gap: 2 }, periodText: { color: colors.primary, ...typography.caption, fontFamily: fontFamilies.semibold },
  snapshot: { gap: spacing.sm, backgroundColor: colors.elevatedSurface }, eyebrow: { color: colors.primary, ...typography.eyebrow }, total: { color: colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: 34, lineHeight: 41, letterSpacing: -1 }, snapshotCaption: { color: colors.textSecondary, ...typography.caption },
  comparison: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.xs }, comparisonText: { color: colors.textSecondary, ...typography.caption }, comparisonMuted: { color: colors.textSecondary, ...typography.caption, marginTop: spacing.xs }, inlineStat: { color: colors.textSecondary, ...typography.caption, marginTop: -spacing.xs },
  metricRow: { flexDirection: 'row', gap: spacing.sm }, metric: { flex: 1, minWidth: 0, padding: spacing.md, gap: spacing.xs }, metricLabel: { color: colors.textSecondary, ...typography.caption }, metricValue: { color: colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: 15, lineHeight: 20 }, detailValue: { color: colors.textPrimary, ...typography.cardTitle },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md }, cardTitle: { color: colors.textPrimary, ...typography.cardTitle }, cardCaption: { color: colors.textSecondary, ...typography.caption, marginTop: 2 }, cardValue: { color: colors.textPrimary, ...typography.label },
  chartWrap: { gap: spacing.sm }, chartLabels: { flexDirection: 'row', justifyContent: 'space-between' }, chartLabel: { color: colors.textSecondary, ...typography.caption, textTransform: 'capitalize' }, emptyInline: { color: colors.textSecondary, ...typography.body },
  breakdown: { gap: spacing.md }, breakdownRow: { gap: 6 }, breakdownHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }, breakdownName: { flexDirection: 'row', alignItems: 'center', gap: 6 }, breakdownValue: { color: colors.textPrimary, ...typography.label }, track: { height: 7, borderRadius: radii.pill, backgroundColor: colors.neutralSurface, overflow: 'hidden' }, fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary },
  maintenanceLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }, highlight: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.paleAqua }, highlightText: { color: colors.textPrimary, ...typography.body, flex: 1 },
  locked: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl }, lockIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.paleAqua, alignItems: 'center', justifyContent: 'center' }, lockedTitle: { color: colors.textPrimary, ...typography.sectionTitle }, lockedText: { color: colors.textSecondary, ...typography.body, textAlign: 'center' }, lockedHint: { color: colors.primary, ...typography.label },
});
