import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppHeader, EmptyState, Screen } from '@/shared/components/ui';
import { RecordCard } from '@/shared/components/entityCards';
import { RecordType } from '@/domain/entities';
import { useDataStore } from '@/store/dataStore';
import { fontFamilies, radii, spacing, useThemedStyles, type AppTheme } from '@/shared/theme';
import { sortRecords } from '@/shared/utils/analytics';
import { getSelectionAccessibilityState } from '@/shared/utils/accessibility';

type Filter = 'all' | RecordType;
const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'fuel', label: 'Yakıt' },
  { value: 'maintenance', label: 'Bakım' },
  { value: 'expense', label: 'Diğer' },
];

export default function HistoryScreen() {
  const styles = useThemedStyles(createStyles);
  const [filter, setFilter] = useState<Filter>('all');
  const records = useDataStore((state) => state.records);
  const filtered = sortRecords(records).filter(
    (record) => filter === 'all' || record.recordType === filter,
  );
  return (
    <Screen>
      <AppHeader title="Geçmiş" subtitle={`${records.length} kayıt`} />
      <View style={styles.filters} accessibilityRole="radiogroup">
        {filters.map((item) => (
          <Pressable
            key={item.value}
            accessibilityRole="radio"
            accessibilityLabel={`${item.label} kayıtlarını göster`}
            accessibilityState={getSelectionAccessibilityState(filter === item.value)}
            style={[styles.pill, filter === item.value && styles.pillSelected]}
            onPress={() => setFilter(item.value)}
          >
            <Text style={[styles.pillText, filter === item.value && styles.pillTextSelected]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {filtered.length ? (
        <View style={styles.list}>
          {filtered.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onPress={() => router.push({ pathname: '/record/edit', params: { id: record.id } })}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          title="Bu filtrede kayıt yok"
          message="Yeni bir kayıt eklediğinizde burada tarih sırasıyla görünecek."
          icon="time-outline"
        />
      )}
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    filters: { flexDirection: 'row', gap: spacing.sm },
    pill: {
      flex: 1,
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.pill,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillSelected: { backgroundColor: colors.primaryAction, borderColor: colors.primaryAction },
    pillText: { color: colors.muted, fontFamily: fontFamilies.semibold, fontSize: 12 },
    pillTextSelected: { color: colors.onPrimary },
    list: { gap: spacing.md },
  });
