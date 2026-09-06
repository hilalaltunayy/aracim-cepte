import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';
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
 * Native-safety rules for this file (see commit c2374e0 — a "0deg" string on an
 * react-native-svg numeric prop crashed every fresh install under the New
 * Architecture):
 *  - every numeric SVG prop is passed as a real `number`;
 *  - geometry is expressed through `Path d` / `Polyline points` strings, which
 *    react-native-svg parses itself and never hands to the Double-casting base
 *    view manager;
 *  - no touch handler is ever attached to an SVG element. Interaction lives on
 *    plain React Native `Pressable` overlays, so tooltips add no native risk.
 */

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

const TAU_DEGREES = 360;

function polar(cx: number, cy: number, radius: number, angleDegrees: number) {
  const radians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

/** Annulus sector between two angles, as a plain `d` string. */
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

/**
 * Spend distribution ring. A single non-zero segment is drawn as a stroked
 * circle because a 360° arc collapses to a zero-length path.
 */
export function DonutChart({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: readonly DonutSegment[];
  centerLabel: string;
  centerValue: string;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useAppTheme();
  const size = 168;
  const center = size / 2;
  const outerRadius = 78;
  const innerRadius = 52;
  const ringWidth = outerRadius - innerRadius;
  const positive = segments.filter((segment) => segment.value > 0);
  const total = positive.reduce((sum, segment) => sum + segment.value, 0);

  let cursor = 0;
  const slices = total
    ? positive.map((segment) => {
        const sweep = (segment.value / total) * TAU_DEGREES;
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
            stroke={colors.neutralSurface}
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
                  slice.end - 0.6,
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
        {slices.map((slice) => (
          <View key={slice.key} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
            <Text numberOfLines={1} style={styles.legendLabel}>
              {slice.label}
            </Text>
            <Text numberOfLines={1} style={styles.legendShare}>
              %{Math.round(slice.share * 100)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export interface TrendPoint {
  key: string;
  label: string;
  total: number;
}

/**
 * Monthly trend line. Touch targets are plain `Pressable` columns laid over the
 * SVG, so selecting a point never crosses the native SVG boundary.
 */
export function TrendChart({
  data,
  formatValue,
}: {
  data: readonly TrendPoint[];
  formatValue: (value: number) => string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  // Selection is held by point key, not index: when the period changes the old
  // key simply stops matching, so a stale highlight clears itself without an
  // effect that would re-render the chart a second time.
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const max = Math.max(...data.map((item) => item.total), 0);
  const width = 300;
  const height = 114;
  const pad = 10;
  const pointFor = (item: TrendPoint, index: number) => ({
    x: pad + (index * (width - pad * 2)) / Math.max(data.length - 1, 1),
    y: height - pad - (max ? (item.total / max) * (height - pad * 2) : 0),
  });
  const points = data
    .map((item, index) => {
      const point = pointFor(item, index);
      return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    })
    .join(' ');
  const revealKey = data.map((item) => `${item.key}:${item.total}`).join('|');
  const [reveal] = useState(() => new Animated.Value(0));
  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, { toValue: 1, duration: 460, useNativeDriver: false }).start();
  }, [reveal, revealKey]);
  const activeIndex = activeKey === null ? -1 : data.findIndex((item) => item.key === activeKey);
  const active = activeIndex >= 0 ? data[activeIndex] : null;

  return (
    <View accessibilityLabel="Döneme göre kayıtlı araç maliyeti eğilimi" style={styles.chartWrap}>
      <View style={styles.tooltipSlot}>
        {active ? (
          <View style={styles.tooltip}>
            <Text numberOfLines={1} style={styles.tooltipLabel}>
              {active.label}
            </Text>
            <Text numberOfLines={1} style={styles.tooltipValue}>
              {formatValue(active.total)}
            </Text>
          </View>
        ) : data.length ? (
          <Text numberOfLines={1} style={styles.tooltipHint}>
            Bir aya dokunarak tutarı görebilirsiniz.
          </Text>
        ) : null}
      </View>
      <View style={styles.plot}>
        <Animated.View
          testID="report-line-reveal"
          style={{
            overflow: 'hidden',
            width: reveal.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        >
          <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} accessible={false}>
            <Line
              x1={pad}
              x2={width - pad}
              y1={height - pad}
              y2={height - pad}
              stroke={colors.chartGrid}
              strokeWidth={1}
            />
            <Line
              x1={pad}
              x2={width - pad}
              y1={height / 2}
              y2={height / 2}
              stroke={colors.chartGrid}
              strokeWidth={1}
              strokeDasharray="3 5"
            />
            {max ? (
              <Path
                d={`M ${points.split(' ')[0]} L ${points} L ${width - pad},${height - pad} Z`}
                fill={colors.paleAqua}
              />
            ) : null}
            <Polyline
              points={points}
              fill="none"
              stroke={colors.primary}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {active
              ? (() => {
                  const point = pointFor(active, activeIndex);
                  return (
                    <Circle
                      cx={point.x}
                      cy={point.y}
                      r={5}
                      fill={colors.primary}
                      stroke={colors.cardBackground}
                      strokeWidth={2}
                    />
                  );
                })()
              : null}
          </Svg>
        </Animated.View>
        {/* Plain-View hit areas: no gesture ever reaches an SVG node. */}
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
        {data.map((item, index) => (
          <Text
            key={item.key}
            numberOfLines={1}
            style={[styles.chartLabel, index === activeIndex && styles.chartLabelActive]}
          >
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export interface BarChartItem {
  key: string;
  label: string;
  value: number;
  caption?: string;
}

/** Horizontal comparison bars. Entirely plain React Native views. */
export function BarChart({
  items,
  formatValue,
  color,
}: {
  items: readonly BarChartItem[];
  formatValue: (value: number) => string;
  color?: string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const max = Math.max(...items.map((item) => item.value), 0);
  const barColor = color ?? colors.primary;
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
          <View style={styles.track}>
            <GrowingBar percent={max ? (item.value / max) * 100 : 0} color={barColor} />
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

export function GrowingBar({ percent, color }: { percent: number; color: string }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 300, useNativeDriver: false }).start();
  }, [percent, progress]);
  return (
    <Animated.View
      testID="report-bar-entrance"
      style={{
        height: '100%',
        borderRadius: radii.pill,
        backgroundColor: color,
        width: progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0%', `${Math.max(0, Math.min(percent, 100))}%`],
        }),
      }}
    />
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    donutGraphic: { width: 168, height: 168, alignItems: 'center', justifyContent: 'center' },
    donutCenter: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 34,
    },
    donutCenterValue: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.bold,
      fontSize: 17,
      lineHeight: 22,
      textAlign: 'center',
    },
    donutCenterLabel: {
      color: colors.textSecondary,
      ...typography.caption,
      textAlign: 'center',
    },
    donutLegend: { flex: 1, minWidth: 0, gap: spacing.sm },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendLabel: { flex: 1, minWidth: 0, color: colors.textPrimary, ...typography.caption },
    legendShare: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.semibold,
      fontSize: 13,
      flexShrink: 0,
    },

    chartWrap: { gap: spacing.sm },
    plot: { position: 'relative' },
    hitRow: { flexDirection: 'row', flex: 1 },
    hitColumn: { flex: 1 },
    tooltipSlot: { minHeight: 34, justifyContent: 'center' },
    tooltip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.md,
      backgroundColor: colors.paleAqua,
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
    chartLabels: { flexDirection: 'row' },
    chartLabel: {
      flex: 1,
      minWidth: 0,
      textAlign: 'center',
      color: colors.textSecondary,
      ...typography.caption,
      textTransform: 'capitalize',
    },
    chartLabelActive: { color: colors.primary, fontFamily: fontFamilies.semibold },

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
    barValue: {
      color: colors.textPrimary,
      ...typography.label,
      flexShrink: 0,
      maxWidth: '52%',
    },
    barCaption: { color: colors.textSecondary, ...typography.caption },
    track: {
      height: 7,
      borderRadius: radii.pill,
      backgroundColor: colors.neutralSurface,
      overflow: 'hidden',
    },
  });
