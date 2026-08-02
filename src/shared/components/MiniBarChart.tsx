import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { getMonthlyTrendTotal, MonthlyTotal } from '@/shared/utils/analytics';
import {
  fontFamilies,
  radii,
  spacing,
  typography,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { formatCurrency } from '@/shared/utils/format';

function Bar({ item, max }: { item: MonthlyTotal; max: number }) {
  const styles = useThemedStyles(createStyles);
  const [height] = useState(() => new Animated.Value(0));
  const target = max > 0 ? Math.max((item.total / max) * 96, item.total > 0 ? 8 : 2) : 2;
  useEffect(() => {
    Animated.timing(height, { toValue: target, duration: 420, useNativeDriver: false }).start();
  }, [height, target]);
  return (
    <View style={styles.barColumn}>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.bar, { height }]} />
      </View>
      <Text style={styles.label}>{item.label}</Text>
    </View>
  );
}

export function MiniBarChart({ data }: { data: MonthlyTotal[] }) {
  const styles = useThemedStyles(createStyles);
  const max = Math.max(...data.map((item) => item.total), 0);
  const trendTotal = getMonthlyTrendTotal(data);
  return (
    <View style={styles.container}>
      <View style={styles.chartHeader}>
        <View style={styles.summary}>
          <Text style={styles.kicker}>SON 6 AY</Text>
          <Text style={styles.value}>{formatCurrency(trendTotal)}</Text>
        </View>
        <Text style={styles.caption}>Altı aylık toplam gider</Text>
      </View>
      <View style={styles.chart}>
        {data.map((item) => (
          <Bar key={item.key} item={item} max={max} />
        ))}
      </View>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: { gap: spacing.lg },
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
    },
    chart: {
      height: 122,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
    },
    barColumn: { alignItems: 'center', gap: spacing.sm, flex: 1 },
    barTrack: {
      height: 98,
      justifyContent: 'flex-end',
      borderBottomColor: colors.chartGrid,
      borderBottomWidth: 1,
    },
    bar: { width: 24, backgroundColor: colors.primary, borderRadius: radii.pill },
    label: {
      color: colors.muted,
      ...typography.caption,
      fontSize: 11,
      textTransform: 'capitalize',
    },
  });
