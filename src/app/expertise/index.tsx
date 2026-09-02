import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, Card, EmptyState, Screen } from '@/shared/components/ui';
import { AutomotiveBackdrop } from '@/shared/components/AutomotiveBackdrop';
import { useDataStore } from '@/store/dataStore';
import {
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { formatDate } from '@/shared/utils/format';

export default function ExpertiseListScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const reports = useDataStore((state) => state.expertiseReports);
  return (
    <Screen backdrop={<AutomotiveBackdrop />}>
      <AppButton
        title="Yeni ekspertiz raporu"
        icon="add"
        onPress={() => router.push('/expertise/edit')}
      />
      {reports.length ? (
        <View style={styles.list}>
          {reports.map((report) => (
            <Card key={report.id} style={styles.card}>
              <View style={styles.icon}>
                <Ionicons name="clipboard-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.content}>
                <Text style={styles.title}>{report.companyName ?? 'Ekspertiz raporu'}</Text>
                <Text style={styles.meta}>{formatDate(report.reportDate)}</Text>
                {report.reportNumber ? (
                  <Text style={styles.meta}>Rapor no: {report.reportNumber}</Text>
                ) : null}
                <Text style={styles.meta}>
                  {report.attachments.length
                    ? `${report.attachments.length} ek dosya`
                    : 'Ek dosya yok'}
                </Text>
              </View>
              <AppButton
                title="Aç"
                variant="ghost"
                compact
                onPress={() =>
                  router.navigate({ pathname: '/expertise/edit', params: { id: report.id } })
                }
              />
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="Ekspertiz raporu yok"
          message="Rapor bilgilerini ve özel ek dosyasını güvenle saklayın."
          icon="clipboard-outline"
        />
      )}
      <AppButton
        title="Gövde durumuna git"
        variant="secondary"
        onPress={() => router.push('/body-condition')}
      />
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    list: { gap: spacing.md },
    card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
    icon: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: { flex: 1, gap: 3 },
    title: { color: colors.navy, ...typography.cardTitle },
    meta: { color: colors.muted, fontSize: 12 },
  });
