import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { getMonthlyTrendTotal, MonthlyTotal } from '@/shared/utils/analytics';
import {
  fontFamilies,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { formatCurrency } from '@/shared/utils/format';

const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 108;
const PAD_X = 10;
const PAD_TOP = 12;
const PAD_BOTTOM = 10;

/**
 * Polished six-month spend trend as a clean area + line chart. Tapping a month
 * selects its point and shows its exact value in the header. Real data only —
 * no Premium deep analytics here.
 */
export function MiniBarChart({
  data,
  footer,
}: {
  data: MonthlyTotal[];
  /** Optional compact summary line shown under the chart (e.g. total fuel litres). */
  footer?: string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const trendTotal = getMonthlyTrendTotal(data);
  const selected = data.find((item) => item.key === selectedKey) ?? null;

  const geometry = useMemo(() => {
    const max = Math.max(...data.map((item) => item.total), 1);
    const innerWidth = VIEW_WIDTH - PAD_X * 2;
    const innerHeight = VIEW_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const points = data.map((item, index) => ({
      key: item.key,
      x: PAD_X + (data.length <= 1 ? innerWidth / 2 : (innerWidth * index) / (data.length - 1)),
      y: PAD_TOP + innerHeight * (1 - item.total / max),
    }));
    const line = points.map((point) => `${point.x},${point.y}`).join(' L ');
    const area =
      points.length > 0
        ? `M ${points[0].x},${VIEW_HEIGHT - PAD_BOTTOM} L ${line} L ${
            points[points.length - 1].x
          },${VIEW_HEIGHT - PAD_BOTTOM} Z`
        : '';
    return { points, linePath: points.length ? `M ${line}` : '', areaPath: area };
  }, [data]);

  return (
    <View style={styles.container}>
      <View style={styles.chartHeader}>
        <View style={styles.summary}>
          <Text style={styles.kicker}>SON 6 AY</Text>
          <Text style={styles.value}>
            {selected ? formatCurrency(selected.total) : formatCurrency(trendTotal)}
          </Text>
        </View>
        <Text style={styles.caption}>{selected ? selected.label : 'Aylık gider'}</Text>
      </View>

      <View style={styles.chart}>
        <Svg width="100%" height={VIEW_HEIGHT} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
          <Defs>
            <LinearGradient id="spendArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity={0.28} />
              <Stop offset="1" stopColor={colors.primary} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          <Line
            x1={PAD_X}
            y1={VIEW_HEIGHT - PAD_BOTTOM}
            x2={VIEW_WIDTH - PAD_X}
            y2={VIEW_HEIGHT - PAD_BOTTOM}
            stroke={colors.chartGrid}
            strokeWidth={1}
          />
          {geometry.areaPath ? <Path d={geometry.areaPath} fill="url(#spendArea)" /> : null}
          {geometry.linePath ? (
            <Path
              d={geometry.linePath}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {geometry.points.map((point) => {
            const isSelected = point.key === selectedKey;
            return isSelected ? (
              <Line
                key={`guide-${point.key}`}
                x1={point.x}
                y1={PAD_TOP - 4}
                x2={point.x}
                y2={VIEW_HEIGHT - PAD_BOTTOM}
                stroke={colors.primary}
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            ) : null;
          })}
          {geometry.points.map((point) => (
            <Circle
              key={point.key}
              cx={point.x}
              cy={point.y}
              r={point.key === selectedKey ? 4.5 : 2.6}
              fill={point.key === selectedKey ? colors.primary : colors.cardBackground}
              stroke={colors.primary}
              strokeWidth={1.6}
            />
          ))}
        </Svg>
        <View style={styles.hitRow}>
          {data.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}: ${formatCurrency(item.total)}`}
              style={styles.hit}
              onPress={() => setSelectedKey((current) => (current === item.key ? null : item.key))}
            />
          ))}
        </View>
      </View>

      <View style={styles.labels}>
        {data.map((item) => (
          <Text
            key={item.key}
            style={[styles.label, item.key === selectedKey && styles.labelSelected]}
          >
            {item.label}
          </Text>
        ))}
      </View>

      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: { gap: spacing.md },
    chartHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    summary: { flex: 1, minWidth: 0 },
    kicker: {
      color: colors.primary,
      fontFamily: fontFamilies.semibold,
      fontSize: 10,
      letterSpacing: 1.05,
    },
    value: { color: colors.navy, fontFamily: fontFamilies.bold, fontSize: 22, lineHeight: 28 },
    caption: {
      color: colors.muted,
      ...typography.caption,
      flexShrink: 1,
      maxWidth: '46%',
      paddingBottom: 3,
      textAlign: 'right',
      textTransform: 'capitalize',
    },
    chart: { position: 'relative' },
    hitRow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
    },
    hit: { flex: 1 },
    labels: { flexDirection: 'row', justifyContent: 'space-between' },
    label: {
      flex: 1,
      color: colors.muted,
      ...typography.caption,
      fontSize: 11,
      textAlign: 'center',
      textTransform: 'capitalize',
    },
    labelSelected: { color: colors.primary, fontFamily: fontFamilies.semibold },
    footer: { color: colors.muted, ...typography.caption },
  });
