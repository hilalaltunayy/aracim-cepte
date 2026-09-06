import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, Card, Screen, StatusBadge } from '@/shared/components/ui';
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
import {
  useAssistantSessionStore,
  type AssistantChatMessage,
} from '../state/assistantSessionStore';

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

type ChatMessage = AssistantChatMessage;

/** Stable identity so an absent thread never re-renders the screen in a loop. */
const EMPTY_THREAD: readonly ChatMessage[] = [];

export interface VehicleAssistantScreenProps {
  /** Scopes the session thread; each vehicle keeps its own chat history. */
  vehicleId: string;
  vehicleName: string;
  userName?: string;
  initialQuota: AssistantQuotaState | null;
  entitlementLimit: number;
  enabled: boolean;
  onAsk(question: string): Promise<VehicleAssistantResult>;
  /** Re-reads the server-authoritative quota so the chip never shows stale state. */
  onSyncQuota?(): Promise<AssistantQuotaState | null>;
  onUpgrade?(): void;
}

export function VehicleAssistantScreen({
  vehicleId,
  vehicleName,
  userName,
  initialQuota,
  entitlementLimit,
  enabled,
  onAsk,
  onSyncQuota,
  onUpgrade,
}: VehicleAssistantScreenProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const scrollRef = useRef<ScrollView>(null);
  // Thread and draft live in a session-only store, so leaving this tab and
  // coming back restores the conversation. Nothing here is persisted.
  const messages = useAssistantSessionStore((state) => state.threads[vehicleId]) ?? EMPTY_THREAD;
  const question = useAssistantSessionStore((state) => state.drafts[vehicleId]) ?? '';
  const createMessageId = useAssistantSessionStore((state) => state.createMessageId);
  const appendMessages = useAssistantSessionStore((state) => state.appendMessages);
  const patchMessage = useAssistantSessionStore((state) => state.patchMessage);
  const removeMessage = useAssistantSessionStore((state) => state.removeMessage);
  const setDraft = useAssistantSessionStore((state) => state.setDraft);
  const setQuestion = (value: string) => setDraft(vehicleId, value);
  const [quota, setQuota] = useState<AssistantQuotaState | null>(initialQuota);
  const [openEvidence, setOpenEvidence] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const quotaLimit = quota?.limit ?? entitlementLimit;
  // `used` is the server-authoritative COMMITTED count (get_my_ai_usage counts
  // only committed rows). It is never incremented locally: a reserved/released
  // attempt must not move this number.
  const used = Math.min(quotaLimit, Math.max(0, quota?.used ?? 0));
  const remaining = Math.max(0, quotaLimit - used);
  const exhausted = remaining <= 0;
  const started = messages.length > 0;

  const scrollToEnd = (animated = true) => {
    const run = () => scrollRef.current?.scrollToEnd({ animated });
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else run();
  };

  // A restored thread should open on the latest answer, not at the top.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || messages.length === 0) return;
    restoredRef.current = true;
    scrollToEnd(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = async (raw: string) => {
    const value = raw.trim();
    if (!value || loading || exhausted || !enabled) return;
    const pendingId = createMessageId();
    appendMessages(vehicleId, [
      { id: createMessageId(), role: 'user', text: value },
      { id: pendingId, role: 'assistant', pending: true, question: value },
    ]);
    setQuestion('');
    setLoading(true);
    scrollToEnd();
    try {
      const result = await onAsk(value);
      setQuota(result.quota);
      patchMessage(vehicleId, pendingId, { pending: false, result });
    } catch (caught) {
      patchMessage(vehicleId, pendingId, {
        pending: false,
        error:
          caught instanceof Error ? caught.message : 'Araç Asistanı şu anda kullanılamıyor.',
      });
      // A failed answer must not leave a misleading quota chip: re-read the
      // server-authoritative committed usage.
      if (onSyncQuota) {
        void onSyncQuota()
          .then((fresh) => fresh && setQuota(fresh))
          .catch(() => undefined);
      }
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  };

  const retry = (message: ChatMessage) => {
    if (!message.question) return;
    removeMessage(vehicleId, message.id);
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
          accessibilityLabel={
            loading
              ? 'Sorunuz işleniyor'
              : `Bugün ${quotaLimit} hakkın ${used} tanesi kullanıldı`
          }
        >
          <Ionicons
            name={loading ? 'ellipsis-horizontal' : 'flash-outline'}
            size={13}
            color={colors.primary}
            accessible={false}
          />
          {/* Shows COMMITTED usage as used/limit. A failed or in-flight request
              never moves it — an in-progress request shows its own state. */}
          <Text style={styles.quotaChipText}>
            {loading ? 'İşleniyor…' : `Bugün ${used}/${quotaLimit}`}
          </Text>
        </View>
      </View>

      {/* The single main scroll: everything below the header is one thread, and
          answer cards render inline rather than inside their own scroll box. */}
      <ScrollView
        ref={scrollRef}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
          {/* A compact chat field rather than the tall floating-label form input:
              the thread keeps the screen, the composer only takes what it needs
              and grows to at most a few lines. */}
          <TextInput
            style={styles.composerInput}
            accessibilityLabel="Mesajınız"
            placeholder="Aracınız hakkında sorun"
            placeholderTextColor={colors.muted}
            value={question}
            onChangeText={(value) => setQuestion(value.slice(0, 600))}
            editable={!loading && enabled && !exhausted}
            multiline
            textAlignVertical="center"
          />
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
    composer: {
      gap: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    limitRow: { gap: spacing.xs, alignItems: 'flex-start' },
    limitText: { color: colors.warning, ...typography.caption },
    composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
    composerInput: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      maxHeight: 132,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      color: colors.textPrimary,
      fontFamily: fontFamilies.regular,
      fontSize: 15,
      lineHeight: 21,
    },
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
