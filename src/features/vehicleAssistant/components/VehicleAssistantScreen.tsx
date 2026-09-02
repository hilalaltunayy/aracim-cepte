import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, Card, Screen, StatusBadge } from '@/shared/components/ui';
import { AutomotiveBackdrop } from '@/shared/components/AutomotiveBackdrop';
import {
  fontFamilies,
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import type { AssistantQuotaState, VehicleAssistantResult } from '../domain/assistantContract';

const suggestedQuestions = [
  'Şu an dikkat etmem gereken bir şey var mı?',
  'Bakım durumumu özetler misin?',
  'Yakıt tüketimimde bir değişim var mı?',
  'Son ay yakıta ne kadar harcadım?',
] as const;

const severityPresentation = {
  info: { label: 'Bilgilendirme', tone: 'info' },
  low: { label: 'Takip önerilir', tone: 'neutral' },
  medium: { label: 'Dikkat gerektirir', tone: 'warning' },
  high: { label: 'Öncelikli', tone: 'danger' },
} as const;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  result?: VehicleAssistantResult;
  error?: string;
  pending?: boolean;
  question?: string;
}

export interface VehicleAssistantScreenProps {
  vehicleName: string;
  userName?: string;
  initialQuota: AssistantQuotaState | null;
  entitlementLimit: number;
  enabled: boolean;
  onAsk(question: string): Promise<VehicleAssistantResult>;
  onUpgrade?(): void;
}

export function VehicleAssistantScreen({
  vehicleName,
  userName,
  initialQuota,
  entitlementLimit,
  enabled,
  onAsk,
  onUpgrade,
}: VehicleAssistantScreenProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const scrollRef = useRef<ScrollView>(null);
  const idRef = useRef(0);
  const nextId = () => `m${(idRef.current += 1)}`;
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quota, setQuota] = useState<AssistantQuotaState | null>(initialQuota);
  const [openEvidence, setOpenEvidence] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const quotaLimit = quota?.limit ?? entitlementLimit;
  const remaining = quota?.remaining ?? quotaLimit;
  const exhausted = remaining <= 0;
  const started = messages.length > 0;

  const scrollToEnd = () => {
    const run = () => scrollRef.current?.scrollToEnd({ animated: true });
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else run();
  };

  const ask = async (raw: string) => {
    const value = raw.trim();
    if (!value || loading || exhausted || !enabled) return;
    const pendingId = nextId();
    setMessages((current) => [
      ...current,
      { id: nextId(), role: 'user', text: value },
      { id: pendingId, role: 'assistant', pending: true, question: value },
    ]);
    setQuestion('');
    setLoading(true);
    scrollToEnd();
    try {
      const result = await onAsk(value);
      setQuota(result.quota);
      setMessages((current) =>
        current.map((message) =>
          message.id === pendingId ? { ...message, pending: false, result } : message,
        ),
      );
    } catch (caught) {
      setMessages((current) =>
        current.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                pending: false,
                error:
                  caught instanceof Error
                    ? caught.message
                    : 'Araç Asistanı şu anda kullanılamıyor.',
              }
            : message,
        ),
      );
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  };

  const retry = (message: ChatMessage) => {
    if (!message.question) return;
    setMessages((current) => current.filter((item) => item.id !== message.id));
    void ask(message.question);
  };

  const toggleEvidence = (id: string) =>
    setOpenEvidence((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Screen scroll={false} backdrop={<AutomotiveBackdrop />}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Araç Asistanı</Text>
          <Text style={styles.subtitle}>{vehicleName} verilerinize dayalı yanıtlar</Text>
        </View>
        <View
          style={styles.quotaChip}
          accessibilityLabel={`Bugün ${Math.max(0, remaining)} soru hakkınız kaldı`}
        >
          <Ionicons name="flash-outline" size={13} color={colors.primary} accessible={false} />
          <Text style={styles.quotaChipText}>
            Bugün {Math.max(0, remaining)}/{quotaLimit}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        keyboardShouldPersistTaps="handled"
      >
        {!started ? (
          <View style={styles.greeting}>
            <View style={styles.greetingIcon}>
              <Ionicons name="sparkles" size={20} color={colors.primary} accessible={false} />
            </View>
            <Text style={styles.greetingTitle}>
              {userName ? `Merhaba ${userName}, aracınız hakkında sorun` : 'Aracınız hakkında sorun'}
            </Text>
            <Text style={styles.greetingBody}>
              Bakım, yakıt, belge ve maliyet kayıtlarınızı yorumlar. Kesin mekanik teşhis veya canlı
              dış veri sunmaz.
            </Text>
          </View>
        ) : null}

        {!started ? (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionLabel}>Örnek sorular</Text>
            <View style={styles.chipRow}>
              {suggestedQuestions.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  accessibilityRole="button"
                  accessibilityLabel={suggestion}
                  onPress={() => void ask(suggestion)}
                  disabled={exhausted || !enabled}
                  style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                >
                  <Text style={styles.chipText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {messages.map((message) =>
          message.role === 'user' ? (
            <View key={message.id} style={styles.userBubble}>
              <Text style={styles.userText}>{message.text}</Text>
            </View>
          ) : (
            <View key={message.id} style={styles.assistantRow}>
              <View style={styles.assistantAvatar}>
                <Ionicons name="sparkles" size={15} color={colors.primary} accessible={false} />
              </View>
              <View style={styles.assistantBubble}>
                {message.pending ? (
                  <Text style={styles.thinking}>Araç verileri değerlendiriliyor…</Text>
                ) : message.error ? (
                  <View style={styles.errorBlock}>
                    <Text accessibilityRole="alert" style={styles.errorText}>
                      {message.error}
                    </Text>
                    <AppButton
                      title="Tekrar dene"
                      compact
                      variant="ghost"
                      onPress={() => retry(message)}
                    />
                  </View>
                ) : message.result ? (
                  <AssistantAnswer
                    styles={styles}
                    colors={colors}
                    result={message.result}
                    evidenceOpen={openEvidence.has(message.id)}
                    onToggleEvidence={() => toggleEvidence(message.id)}
                  />
                ) : null}
              </View>
            </View>
          ),
        )}
      </ScrollView>

      <View style={styles.composer}>
        {exhausted ? (
          <View style={styles.limitRow}>
            <Text style={styles.limitText}>
              Bugünkü Araç Asistanı kullanım sınırınıza ulaştınız.
            </Text>
            {onUpgrade ? (
              <AppButton title="Premium’u incele" compact variant="ghost" onPress={onUpgrade} />
            ) : null}
          </View>
        ) : !enabled ? (
          <Text style={styles.limitText}>Araç Asistanı şu anda kullanıma kapalı.</Text>
        ) : null}
        <View style={styles.composerRow}>
          <View style={styles.composerInput}>
            <AppInput
              label="Mesajınız"
              value={question}
              onChangeText={(value) => setQuestion(value.slice(0, 600))}
              editable={!loading && enabled && !exhausted}
              multiline
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gönder"
            onPress={() => void ask(question)}
            disabled={!question.trim() || loading || exhausted || !enabled}
            style={({ pressed }) => [
              styles.sendButton,
              (!question.trim() || loading || exhausted || !enabled) && styles.sendButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="arrow-up" size={20} color={colors.onPrimary} accessible={false} />
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function AssistantAnswer({
  styles,
  colors,
  result,
  evidenceOpen,
  onToggleEvidence,
}: {
  styles: ReturnType<typeof createStyles>;
  colors: AppTheme['colors'];
  result: VehicleAssistantResult;
  evidenceOpen: boolean;
  onToggleEvidence: () => void;
}) {
  const badge = result.response.safetyEscalation
    ? { label: 'Güvenlik öncelikli', tone: 'danger' as const }
    : severityPresentation[result.response.severity];
  return (
    <View style={styles.answerBody}>
      <View style={styles.answerHeading}>
        <Text style={styles.answerName}>Araç Asistanı</Text>
        <StatusBadge label={badge.label} tone={badge.tone} />
      </View>
      <Text style={styles.answerText}>{result.response.answer}</Text>

      {result.response.evidence.length ? (
        <Card style={styles.evidenceCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bu cevabı neye göre verdim?"
            accessibilityState={{ expanded: evidenceOpen }}
            style={({ pressed }) => [styles.evidenceToggle, pressed && styles.pressed]}
            onPress={onToggleEvidence}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.primary}
              accessible={false}
            />
            <Text style={styles.evidenceTitle}>Bu cevabı neye göre verdim?</Text>
            <Ionicons
              name={evidenceOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.muted}
              accessible={false}
            />
          </Pressable>
          {evidenceOpen ? (
            <View style={styles.evidenceList}>
              {result.response.evidence.map((item) => (
                <View key={`${item.factCode}:${item.value}`} style={styles.evidenceItem}>
                  <Text style={styles.evidenceLabel}>{item.label}</Text>
                  <Text style={styles.evidenceValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      {result.response.suggestions.length ? (
        <View style={styles.suggestionsBlock}>
          <Text style={styles.suggestionsTitle}>Önerilen sonraki adımlar</Text>
          {result.response.suggestions.map((suggestion) => (
            <View key={suggestion} style={styles.suggestionItem}>
              <View style={styles.bullet} />
              <Text style={styles.suggestionItemText}>{suggestion}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.sm },
    headerText: { flex: 1, gap: 2 },
    title: { color: colors.navy, ...typography.sectionTitle },
    subtitle: { color: colors.muted, ...typography.caption },
    quotaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.paleAqua,
    },
    quotaChipText: { color: colors.primary, fontFamily: fontFamilies.semibold, fontSize: 12 },
    thread: { flex: 1 },
    threadContent: { gap: spacing.md, paddingVertical: spacing.md },
    greeting: { gap: spacing.sm },
    greetingIcon: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    greetingTitle: { color: colors.navy, ...typography.sectionTitle },
    greetingBody: { color: colors.textSecondary, ...typography.body },
    suggestions: { gap: spacing.sm },
    suggestionLabel: { color: colors.muted, ...typography.label },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.cardBackground,
    },
    chipText: { color: colors.navy, fontFamily: fontFamilies.medium, fontSize: 13 },
    userBubble: {
      alignSelf: 'flex-end',
      maxWidth: '86%',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.lg,
      borderBottomRightRadius: 4,
      backgroundColor: colors.primaryAction,
    },
    userText: { color: colors.onPrimary, ...typography.body },
    assistantRow: { flexDirection: 'row', gap: spacing.sm, maxWidth: '96%' },
    assistantAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    assistantBubble: {
      flex: 1,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderTopLeftRadius: 4,
      backgroundColor: colors.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    thinking: { color: colors.muted, ...typography.body, fontStyle: 'italic' },
    errorBlock: { gap: spacing.sm, alignItems: 'flex-start' },
    errorText: { color: colors.error, ...typography.body },
    answerBody: { gap: spacing.md },
    answerHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    answerName: { color: colors.navy, ...typography.cardTitle },
    answerText: { color: colors.textPrimary, fontFamily: fontFamilies.regular, fontSize: 15, lineHeight: 23 },
    evidenceCard: { gap: spacing.sm, backgroundColor: colors.surfaceMuted },
    evidenceToggle: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    evidenceTitle: { flex: 1, color: colors.navy, fontFamily: fontFamilies.semibold, fontSize: 13 },
    evidenceList: { gap: spacing.sm },
    evidenceItem: { gap: 1 },
    evidenceLabel: { color: colors.navy, fontFamily: fontFamilies.medium, fontSize: 13 },
    evidenceValue: { color: colors.muted, ...typography.caption },
    suggestionsBlock: { gap: spacing.xs },
    suggestionsTitle: { color: colors.navy, fontFamily: fontFamilies.semibold, fontSize: 13 },
    suggestionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    suggestionItemText: { flex: 1, color: colors.textSecondary, ...typography.body },
    bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 8 },
    composer: { gap: spacing.sm, paddingTop: spacing.sm },
    limitRow: { gap: spacing.xs, alignItems: 'flex-start' },
    limitText: { color: colors.warning, ...typography.caption },
    composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
    composerInput: { flex: 1 },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primaryAction,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: { backgroundColor: colors.disabledSurface },
    pressed: { opacity: 0.72 },
  });
