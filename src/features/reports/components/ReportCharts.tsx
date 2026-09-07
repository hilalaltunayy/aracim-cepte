import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Rect } from 'react-native-svg';
import {
  fontFamilies,
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';

/**
 * Report chart primitives.
 *
 * Native-safety rules (see commit c2374e0 — a "0deg" string on an
 * react-native-svg numeric prop crashed every fresh install under the New
 * Architecture):
 *  - every numeric SVG prop is passed as a real `number`;
 *  - geometry is `Path d` strings or `Rect`/`Circle` with numeric attributes,
 *    which react-native-svg parses itself;
 *  - no touch handler is ever attached to an SVG element. Interaction lives on
 *    plain React Native `Pressable` overlays.
 */

// ---------------------------------------------------------------------------
// Donut — spend distribution
// ---------------------------------------------------------------------------

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

function polar(cx: number, cy: number, radius: number, angleDegrees: number) {
  const radians = ((angleDegrees - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function ringSlicePath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerEnd = polar(cx, cy, outerRadius, endAngle);
  const outerStart = polar(cx, cy, outerRadius, startAngle);
  const innerStart = polar(cx, cy, innerRadius, startAngle);
  const innerEnd = polar(cx, cy, innerRadius, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  const round = (value: number) => value.toFixed(2);
  return [
    `M ${round(outerEnd.x)} ${round(outerEnd.y)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${round(outerStart.x)} ${round(outerStart.y)}`,
    `L ${round(innerStart.x)} ${round(innerStart.y)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${round(innerEnd.x)} ${round(innerEnd.y)}`,
    'Z',
  ].join(' ');
}

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
  formatValue,
}: {
  segments: readonly DonutSegment[];
  centerLabel: string;
  centerValue: string;
  formatValue: (value: number) => string;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useAppTheme();
  const size = 150;
  const center = size / 2;
  const outerRadius = 72;
  const innerRadius = 48;
  const ringWidth = outerRadius - innerRadius;
  const positive = segments.filter((segment) => segment.value > 0);
  const total = positive.reduce((sum, segment) => sum + segment.value, 0);

  let cursor = 0;
  const slices = total
    ? positive.map((segment) => {
        const sweep = (segment.value / total) * 360;
        const start = cursor;
        cursor += sweep;
        return { ...segment, start, end: cursor, share: segment.value / total };
      })
    : [];

  return (
    <View style={styles.donutRow}>
      <View accessibilityLabel={`${centerLabel}: ${centerValue}`} style={styles.donutGraphic}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessible={false}>
          <Circle
            cx={center}
            cy={center}
            r={(outerRadius + innerRadius) / 2}
            fill="none"
            stroke={colors.chart.track}
            strokeWidth={ringWidth}
          />
          {slices.length === 1 ? (
            <Circle
              cx={center}
              cy={center}
              r={(outerRadius + innerRadius) / 2}
              fill="none"
              stroke={slices[0].color}
              strokeWidth={ringWidth}
            />
          ) : (
            slices.map((slice) => (
              <Path
                key={slice.key}
                d={ringSlicePath(
                  center,
                  center,
                  outerRadius,
                  innerRadius,
                  slice.start,
                  slice.end - 1.2,
                )}
                fill={slice.color}
              />
            ))
          )}
        </Svg>
        <View pointerEvents="none" style={styles.donutCenter}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.donutCenterValue}>
            {centerValue}
          </Text>
          <Text numberOfLines={1} style={styles.donutCenterLabel}>
            {centerLabel}
          </Text>
        </View>
      </View>
      <View style={styles.donutLegend}>
        {segments.map((segment) => {
          const share = total > 0 ? segment.value / total : 0;
          return (
            <View key={segment.key} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
              <View style={styles.legendText}>
                <Text numberOfLines={1} style={styles.legendLabel}>
                  {segment.label}
                </Text>
                <Text numberOfLines={1} style={styles.legendValue}>
                  {formatValue(segment.value)}
                </Text>
              </View>
              <Text style={styles.legendShare}>%{Math.round(share * 100)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Trend — rounded vertical bars
// ---------------------------------------------------------------------------

export interface TrendColumn {
  key: string;
  label: string;
  total: number;
  fuel: number;
  maintenance: number;
  other: number;
  isPartial: boolean;
}

const HATCH_ID = 'reportTrendHatch';

/** The category that drove a bucket, so each bar's colour carries meaning. */
function dominantTone(column: TrendColumn, chart: AppTheme['colors']['chart']): string {
  const entries: [number, string][] = [
    [column.fuel, chart.fuel],
    [column.maintenance, chart.maintenance],
    [column.other, chart.other],
  ];
  entries.sort((a, b) => b[0] - a[0]);
  return entries[0][0] > 0 ? entries[0][1] : chart.fuel;
}

export function TrendColumnChart({
  data,
  formatValue,
}: {
  data: readonly TrendColumn[];
  formatValue: (value: number) => string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [reveal] = useState(() => new Animated.Value(0));

  const revealKey = data.map((item) => `${item.key}:${item.total}`).join('|');
  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, { toValue: 1, duration: 460, useNativeDriver: false }).start();
  }, [reveal, revealKey]);

  const width = 320;
  const height = 150;
  const floor = height - 4;
  const ceiling = 16;
  const max = Math.max(...data.map((item) => item.total), 0);
  const slot = width / Math.max(data.length, 1);
  const barWidth = Math.min(slot * 0.52, 26);
  const minBar = barWidth;

  const bars = data.map((column, index) => {
    const centerX = slot * index + slot / 2;
    const ratio = max > 0 ? column.total / max : 0;
    const barHeight = column.total > 0 ? Math.max(minBar, ratio * (floor - ceiling)) : minBar * 0.7;
    return {
      ...column,
      x: centerX - barWidth / 2,
      y: floor - barHeight,
      barHeight,
      isZero: column.total <= 0,
      tone: dominantTone(column, colors.chart),
    };
  });

  const activeIndex = activeKey === null ? -1 : data.findIndex((item) => item.key === activeKey);
  const active = activeIndex >= 0 ? data[activeIndex] : null;

  return (
    <View accessibilityLabel="Döneme göre kayıtlı araç maliyeti eğilimi" style={styles.chartWrap}>
      <View style={styles.tooltipSlot}>
        {active ? (
          <View style={styles.tooltip}>
            <Text numberOfLines={1} style={styles.tooltipLabel}>
              {active.label}
              {active.isPartial ? ' · sürüyor' : ''}
            </Text>
            <Text numberOfLines={1} style={styles.tooltipValue}>
              {formatValue(active.total)}
            </Text>
          </View>
        ) : (
          <Text numberOfLines={1} style={styles.tooltipHint}>
            Bir sütuna dokunarak tutarı görebilirsiniz.
          </Text>
        )}
      </View>
      <View style={styles.plot}>
        <Animated.View
          testID="report-trend-reveal"
          style={{
            overflow: 'hidden',
            width: reveal.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        >
          <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} accessible={false}>
            <Defs>
              <Pattern
                id={HATCH_ID}
                patternUnits="userSpaceOnUse"
                width={7}
                height={7}
                x={0}
                y={0}
              >
                <Line x1={0} y1={7} x2={7} y2={0} stroke={colors.chart.hatch} strokeWidth={1.6} />
              </Pattern>
            </Defs>
            <Line
              x1={0}
              x2={width}
              y1={floor}
              y2={floor}
              stroke={colors.chart.grid}
              strokeWidth={1}
            />
            {bars.map((bar) => (
              <G key={bar.key}>
                <Rect
                  x={bar.x}
                  y={bar.y}
                  width={barWidth}
                  height={bar.barHeight}
                  rx={barWidth / 2}
                  fill={bar.isZero ? colors.chart.track : bar.tone}
                  opacity={bar.isPartial ? 0.3 : bar.isZero ? 0.55 : 1}
                />
                {bar.isPartial ? (
                  <Rect
                    x={bar.x}
                    y={bar.y}
                    width={barWidth}
                    height={bar.barHeight}
                    rx={barWidth / 2}
                    fill={`url(#${HATCH_ID})`}
                  />
                ) : null}
                {bar.key === activeKey && !bar.isZero ? (
                  <Circle cx={bar.x + barWidth / 2} cy={bar.y - 6} r={3} fill={bar.tone} />
                ) : null}
              </G>
            ))}
          </Svg>
        </Animated.View>
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View style={styles.hitRow}>
            {data.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}: ${formatValue(item.total)}`}
                onPress={() =>
                  setActiveKey((current) => (current === item.key ? null : item.key))
                }
                style={styles.hitColumn}
              />
            ))}
          </View>
        </View>
      </View>
      <View style={styles.chartLabels}>
        {data.map((item) => (
          <Text
            key={item.key}
            numberOfLines={1}
            style={[styles.chartLabel, item.key === activeKey && styles.chartLabelActive]}
          >
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Mini bars — a compact strip for the hero and fuel section
// ---------------------------------------------------------------------------

export function MiniBars({ values, color }: { values: readonly number[]; color: string }) {
  const { colors } = useAppTheme();
  const max = Math.max(...values, 0);
  const width = 132;
  const height = 34;
  const slot = width / Math.max(values.length, 1);
  const barWidth = Math.min(slot * 0.58, 10);
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      accessible={false}
      accessibilityLabel="Dönem içindeki kısa eğilim"
    >
      {values.map((value, index) => {
        const ratio = max > 0 ? value / max : 0;
        const barHeight = Math.max(3, ratio * height);
        const x = slot * index + (slot - barWidth) / 2;
        return (
          <Rect
            key={index}
            x={x}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            rx={barWidth / 2}
            fill={value > 0 ? color : colors.chart.track}
          />
        );
      })}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Category bars — horizontal rounded bars
// ---------------------------------------------------------------------------

export interface CategoryBarItem {
  key: string;
  label: string;
  value: number;
  color?: string;
  caption?: string;
}

export function CategoryBars({
  items,
  formatValue,
}: {
  items: readonly CategoryBarItem[];
  formatValue: (value: number) => string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const max = Math.max(...items.map((item) => item.value), 0);
  return (
    <View style={styles.barList}>
      {items.map((item) => (
        <View key={item.key} style={styles.barRow}>
          <View style={styles.barHeader}>
            <Text numberOfLines={1} style={styles.barLabel}>
              {item.label}
            </Text>
            <Text numberOfLines={1} style={styles.barValue}>
              {formatValue(item.value)}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.chart.track }]}>
            <GrowingBar
              percent={max ? (item.value / max) * 100 : 0}
              color={item.color ?? colors.chart.fuel}
            />
          </View>
          {item.caption ? (
            <Text numberOfLines={2} style={styles.barCaption}>
              {item.caption}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function GrowingBar({ percent, color }: { percent: number; color: string }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 320, useNativeDriver: false }).start();
  }, [percent, progress]);
  return (
    <Animated.View
      testID="report-bar-grow"
      style={{
        height: '100%',
        borderRadius: radii.pill,
        backgroundColor: color,
        width: progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0%', `${Math.max(2, Math.min(percent, 100))}%`],
        }),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// KPI row — typographic, hairline-separated (no boxes)
// ---------------------------------------------------------------------------

export function KpiRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.kpiRow}>
      <Text numberOfLines={2} style={styles.kpiLabel}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[styles.kpiValue, emphasis && styles.kpiValueEmphasis]}
      >
        {value}
      </Text>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    donutGraphic: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
    donutCenter: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 30,
    },
    donutCenterValue: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.serifSemibold,
      fontSize: 16,
      lineHeight: 21,
      textAlign: 'center',
    },
    donutCenterLabel: { color: colors.textSecondary, ...typography.caption, textAlign: 'center' },
    donutLegend: { flex: 1, minWidth: 0, gap: spacing.md },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    legendDot: { width: 10, height: 10, borderRadius: 3 },
    legendText: { flex: 1, minWidth: 0 },
    legendLabel: { color: colors.textPrimary, ...typography.bodyMedium },
    legendValue: { color: colors.textSecondary, ...typography.caption },
    legendShare: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.semibold,
      fontSize: 13,
      flexShrink: 0,
    },

    chartWrap: { gap: spacing.xs },
    plot: { position: 'relative' },
    hitRow: { flexDirection: 'row', flex: 1 },
    hitColumn: { flex: 1 },
    tooltipSlot: { minHeight: 32, justifyContent: 'center' },
    tooltip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.md,
      backgroundColor: colors.elevatedSurface,
      maxWidth: '100%',
    },
    tooltipLabel: {
      color: colors.textSecondary,
      ...typography.caption,
      textTransform: 'capitalize',
      flexShrink: 1,
    },
    tooltipValue: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.bold,
      fontSize: 14,
      flexShrink: 1,
    },
    tooltipHint: { color: colors.textSecondary, ...typography.caption },
    chartLabels: { flexDirection: 'row', marginTop: spacing.xs },
    chartLabel: {
      flex: 1,
      minWidth: 0,
      textAlign: 'center',
      color: colors.textSecondary,
      ...typography.caption,
      textTransform: 'capitalize',
    },
    chartLabelActive: { color: colors.textPrimary, fontFamily: fontFamilies.semibold },

    barList: { gap: spacing.md },
    barRow: { gap: 6 },
    barHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    barLabel: {
      flex: 1,
      minWidth: 0,
      color: colors.textSecondary,
      ...typography.caption,
      textTransform: 'capitalize',
    },
    barValue: { color: colors.textPrimary, ...typography.label, flexShrink: 0, maxWidth: '52%' },
    barCaption: { color: colors.textSecondary, ...typography.caption },
    track: { height: 8, borderRadius: radii.pill, overflow: 'hidden' },

    kpiRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    kpiLabel: { flex: 1, minWidth: 0, color: colors.textSecondary, ...typography.body },
    kpiValue: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.semibold,
      fontSize: 16,
      lineHeight: 21,
      flexShrink: 0,
      maxWidth: '58%',
      textAlign: 'right',
    },
    kpiValueEmphasis: { fontFamily: fontFamilies.serifSemibold, fontSize: 18 },
  });
