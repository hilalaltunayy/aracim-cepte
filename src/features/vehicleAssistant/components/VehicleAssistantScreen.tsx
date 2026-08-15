import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AppButton,
  AppHeader,
  AppInput,
  Card,
  Screen,
  SectionHeader,
  StatusBadge,
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
import { useState } from 'react';
import type { AssistantQuotaState, VehicleAssistantResult } from '../domain/assistantContract';

const suggestedQuestions = [
  'Şu an dikkat etmem gereken bir şey var mı?',
  'Bakım durumumu özetler misin?',
  'Yakıt tüketimimde bir değişim var mı?',
] as const;

const severityPresentation = {
  info: { label: 'Bilgilendirme', tone: 'info' },
  low: { label: 'Takip önerilir', tone: 'neutral' },
  medium: { label: 'Dikkat gerektirir', tone: 'warning' },
  high: { label: 'Öncelikli', tone: 'danger' },
} as const;

export interface VehicleAssistantScreenProps {
  vehicleName: string;
  initialQuota: AssistantQuotaState | null;
  entitlementLimit: number;
  enabled: boolean;
  onAsk(question: string): Promise<VehicleAssistantResult>;
}

export function VehicleAssistantScreen({
  vehicleName,
  initialQuota,
  entitlementLimit,
  enabled,
  onAsk,
}: VehicleAssistantScreenProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [question, setQuestion] = useState('');
  const [responseQuota, setResponseQuota] = useState<AssistantQuotaState | null>(null);
  const [result, setResult] = useState<VehicleAssistantResult | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quota = responseQuota ?? initialQuota;
  const quotaLimit = quota?.limit ?? entitlementLimit;
  const remaining = quota?.remaining ?? quotaLimit;
  const exhausted = remaining <= 0;

  const submit = async () => {
    const value = question.trim();
    if (!value || loading || exhausted || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const next = await onAsk(value);
      setResult(next);
      setEvidenceOpen(false);
      setResponseQuota(next.quota);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Araç Asistanı şu anda kullanılamıyor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Araç Asistanı"
        subtitle={`${vehicleName} için verilerinize dayalı yanıtlar`}
        action={
          <View style={styles.headerIcon} accessibilityElementsHidden>
            <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
          </View>
        }
      />

      <Card style={styles.introCard}>
        <Text style={styles.introTitle}>Aracınız hakkında sorun</Text>
        <Text style={styles.bodyText}>
          Bakım, yakıt, belge ve kaydedilen maliyet verilerinizi anlaşılır biçimde yorumlar. Kesin
          mekanik teşhis veya canlı dış veri sunmaz.
        </Text>
        <Text accessibilityLabel={`Bu ay ${remaining} soru hakkı kaldı`} style={styles.quotaText}>
          Bu ay {remaining} / {quotaLimit} soru kaldı
        </Text>
      </Card>

      {!result ? (
        <View style={styles.suggestions}>
          <Text style={styles.suggestionLabel}>Örnek sorular</Text>
          {suggestedQuestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              accessibilityRole="button"
              accessibilityLabel={suggestion}
              onPress={() => setQuestion(suggestion)}
              style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
              <Text style={styles.suggestionText}>{suggestion}</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <Card style={styles.composerCard}>
        <AppInput
          label="Sorunuz"
          placeholder="Örn. Yakıt tüketimim neden artmış olabilir?"
          value={question}
          onChangeText={(value) => setQuestion(value.slice(0, 600))}
          multiline
          numberOfLines={4}
          editable={!loading && enabled && !exhausted}
        />
        {exhausted ? (
          <Text style={styles.limitText}>Bu ayki Araç Asistanı kullanım sınırınıza ulaştınız.</Text>
        ) : !enabled ? (
          <Text style={styles.limitText}>Araç Asistanı şu anda kullanıma kapalı.</Text>
        ) : null}
        <AppButton
          title="Yanıtla"
          icon="arrow-up-circle-outline"
          onPress={() => void submit()}
          loading={loading}
          disabled={!question.trim() || exhausted || !enabled}
        />
      </Card>

      {loading ? (
        <Card style={styles.loadingCard}>
          <Ionicons name="analytics-outline" size={21} color={colors.primary} />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Araç verileri değerlendiriliyor</Text>
            <Text style={styles.meta}>Yanıt yalnızca bu sorunuz için hazırlanıyor.</Text>
          </View>
        </Card>
      ) : null}
      {error ? (
        <Card style={styles.errorCard}>
          <Ionicons name="information-circle-outline" size={22} color={colors.error} />
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
        </Card>
      ) : null}

      {result ? (
        <View style={styles.responseSection}>
          <SectionHeader title="Yanıt" />
          <Card style={styles.responseCard}>
            <View style={styles.responseHeading}>
              <View style={styles.responseIcon}>
                <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.responseHeadingText}>
                <Text style={styles.cardTitle}>Araç Asistanı</Text>
                <Text style={styles.responseMeta}>
                  Yanıt yalnızca seçili araç verileriyle hazırlandı
                </Text>
              </View>
              <StatusBadge
                label={
                  result.response.safetyEscalation
                    ? 'Güvenlik öncelikli'
                    : severityPresentation[result.response.severity].label
                }
                tone={
                  result.response.safetyEscalation
                    ? 'danger'
                    : severityPresentation[result.response.severity].tone
                }
              />
            </View>
            <Text style={styles.answer}>{result.response.answer}</Text>
          </Card>

          {result.response.evidence.length ? (
            <Card style={styles.evidenceCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Bu cevabı neye göre verdim?"
                accessibilityState={{ expanded: evidenceOpen }}
                style={({ pressed }) => [styles.evidenceToggle, pressed && styles.pressed]}
                onPress={() => setEvidenceOpen((current) => !current)}
              >
                <View style={styles.evidenceIcon} accessible={false}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>Bu cevabı neye göre verdim?</Text>
                  <Text style={styles.meta}>
                    {result.response.evidence.length} araç verisi kullanıldı
                  </Text>
                </View>
                <Ionicons
                  name={evidenceOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.muted}
                  accessible={false}
                />
              </Pressable>
              {evidenceOpen ? (
                <View style={styles.evidenceList}>
                  {result.response.evidence.map((item) => (
                    <View key={`${item.factCode}:${item.value}`} style={styles.detailRow}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={19}
                        color={colors.success}
                        accessible={false}
                      />
                      <View style={styles.flex}>
                        <Text style={styles.detailLabel}>{item.label}</Text>
                        <Text style={styles.meta}>{item.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          ) : null}

          {result.response.suggestions.length ? (
            <Card style={styles.detailCard}>
              <Text style={styles.cardTitle}>Önerilen sonraki adımlar</Text>
              {result.response.suggestions.map((suggestion) => (
                <View key={suggestion} style={styles.detailRow}>
                  <View style={styles.bullet} />
                  <Text style={[styles.bodyText, styles.flex]}>{suggestion}</Text>
                </View>
              ))}
            </Card>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    introCard: { gap: spacing.sm },
    introTitle: { color: colors.navy, ...typography.sectionTitle },
    bodyText: { color: colors.textSecondary, ...typography.body },
    quotaText: { color: colors.primary, ...typography.label, marginTop: spacing.xs },
    suggestions: { gap: spacing.sm },
    suggestionLabel: { color: colors.muted, ...typography.label },
    suggestion: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.cardBackground,
    },
    suggestionText: { flex: 1, color: colors.navy, ...typography.bodyMedium },
    composerCard: { gap: spacing.md },
    limitText: { color: colors.warning, ...typography.caption },
    loadingCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    errorCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      backgroundColor: colors.errorSurface,
    },
    errorText: { flex: 1, color: colors.error, ...typography.body },
    responseSection: { gap: spacing.md },
    responseCard: { gap: spacing.md },
    responseHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    responseHeadingText: { flex: 1, minWidth: 0, gap: 2 },
    responseMeta: { color: colors.muted, ...typography.caption },
    responseIcon: {
      width: 36,
      height: 36,
      borderRadius: radii.md,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { color: colors.navy, ...typography.cardTitle },
    answer: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.regular,
      fontSize: 16,
      lineHeight: 25,
    },
    detailCard: { gap: spacing.md },
    evidenceCard: { gap: spacing.md },
    evidenceToggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    evidenceIcon: {
      width: 36,
      height: 36,
      borderRadius: radii.md,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    evidenceList: { gap: spacing.md, paddingTop: spacing.xs },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    detailLabel: { color: colors.navy, ...typography.bodyMedium },
    meta: { color: colors.muted, ...typography.caption },
    bullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, marginTop: 8 },
    pressed: { opacity: 0.72 },
  });
