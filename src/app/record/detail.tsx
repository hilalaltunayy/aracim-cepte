import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AppButton,
  Card,
  ErrorBanner,
  LoadingScreen,
  Screen,
} from '@/shared/components/ui';
import { AutomotiveBackdrop } from '@/shared/components/AutomotiveBackdrop';
import { useDataStore } from '@/store/dataStore';
import { resolveEntityRoute } from '@/shared/utils/repositoryRules';
import { firstRouteParam, safeEntityId, editRecordHref } from '@/shared/utils/routeParams';
import { goBackOr } from '@/shared/utils/navigation';
import { buildRecordDetailView } from '@/features/records/recordDetail';
import { openAttachment } from '@/data/storage/attachments';
import { fontFamilies, radii, spacing, useThemedStyles, type AppTheme } from '@/shared/theme';

export default function RecordDetailScreen() {
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = safeEntityId(params.id);
  const invalidRouteId = Boolean(firstRouteParam(params.id) && !routeId);
  const records = useDataStore((state) => state.records);
  const bootstrapped = useDataStore((state) => state.bootstrapped);
  const record = useMemo(
    () => records.find((item) => item.id === routeId),
    [records, routeId],
  );
  const routeState = invalidRouteId
    ? 'missing'
    : resolveEntityRoute(routeId, records, bootstrapped);

  if (routeState === 'loading') return <LoadingScreen />;

  if (routeState === 'missing' || !record) {
    return (
      <Screen>
        <ErrorBanner message="Bu kayıt silinmiş veya artık erişilebilir değil." />
        <AppButton title="Geçmişe dön" onPress={() => goBackOr('/(tabs)/history')} />
      </Screen>
    );
  }

  const view = buildRecordDetailView(record);
  const attachments = record.attachments ?? [];

  return (
    <Screen backdrop={<AutomotiveBackdrop />}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name={view.icon} size={22} color={styles.iconGlyph.color} accessible={false} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{view.title}</Text>
          <Text style={styles.typeLabel}>{view.typeLabel}</Text>
        </View>
      </View>

      {view.groups.map((group, index) => (
        <Card key={group.title ?? `group-${index}`} style={styles.group}>
          {group.title ? <Text style={styles.groupTitle}>{group.title}</Text> : null}
          {group.rows.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue}>{row.value}</Text>
            </View>
          ))}
        </Card>
      ))}

      {attachments.length ? (
        <Card style={styles.group}>
          <Text style={styles.groupTitle}>Ekler</Text>
          {attachments.map((attachment) => (
            <Pressable
              key={attachment.id}
              accessibilityRole="button"
              accessibilityLabel={`${attachment.originalName} ekini aç`}
              style={({ pressed }) => [styles.attachment, pressed && styles.attachmentPressed]}
              onPress={() => void openAttachment(attachment.storagePath)}
            >
              <Ionicons
                name="document-attach-outline"
                size={18}
                color={styles.iconGlyph.color}
                accessible={false}
              />
              <Text style={styles.attachmentName} numberOfLines={1}>
                {attachment.originalName}
              </Text>
            </Pressable>
          ))}
        </Card>
      ) : null}

      <AppButton title="Düzenle" onPress={() => router.push(editRecordHref(record.id))} />
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    icon: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.paleAqua,
    },
    iconGlyph: { color: colors.primary },
    headerText: { flex: 1, gap: 2 },
    title: { color: colors.textPrimary, fontFamily: fontFamilies.semibold, fontSize: 18 },
    typeLabel: { color: colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: 13 },
    group: { gap: spacing.sm },
    groupTitle: {
      color: colors.textSecondary,
      fontFamily: fontFamilies.semibold,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
    rowLabel: { color: colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: 14 },
    rowValue: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.medium,
      fontSize: 14,
      flexShrink: 1,
      textAlign: 'right',
    },
    attachment: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 40,
    },
    attachmentPressed: { opacity: 0.6 },
    attachmentName: { color: colors.primary, fontFamily: fontFamilies.medium, fontSize: 14, flex: 1 },
  });
