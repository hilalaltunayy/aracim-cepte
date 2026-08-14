import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AttachmentListItem, PendingAttachment } from '@/features/attachments/domain/types';
import { isPendingAttachment } from '@/features/attachments/domain/types';
import { AppButton, AppInput, ErrorBanner } from '@/shared/components/ui';
import { spacing, typography, useThemedStyles, type AppTheme } from '@/shared/theme';
import { commitOcrUsage, releaseOcrUsage, reserveOcrUsage, type OcrUsage } from '@/features/entitlements/services/ocrUsageQuota';
import type { MaintenanceDetailsFormValues } from '../domain/maintenanceDetails';
import {
  analyzeMaintenanceReceiptAttachment,
  type MaintenanceReceiptOcrField,
  type MaintenanceReceiptOcrSuggestion,
} from './maintenanceReceiptOcr';

export type MaintenanceReceiptPatch = Partial<
  Pick<MaintenanceDetailsFormValues, 'serviceName' | 'invoiceNumber' | 'partsCost' | 'laborCost'> & {
    recordDate: string;
    total: string;
  }
>;
type ReviewSuggestion = MaintenanceReceiptOcrSuggestion & { selected: boolean };
type Analyzer = (attachment: PendingAttachment) => ReturnType<typeof analyzeMaintenanceReceiptAttachment>;

function fieldLabel(field: MaintenanceReceiptOcrField): string {
  if (field === 'serviceName') return 'Servis / İşletme';
  if (field === 'recordDate') return 'Tarih';
  if (field === 'invoiceNumber') return 'Fatura / Fiş no';
  if (field === 'partsCost') return 'Parça tutarı';
  if (field === 'laborCost') return 'İşçilik tutarı';
  return 'Toplam';
}

function hasCurrentValue(
  field: MaintenanceReceiptOcrField,
  details: MaintenanceDetailsFormValues,
  total: string,
  recordDate: string,
): boolean {
  if (field === 'recordDate') return Boolean(recordDate);
  if (field === 'total') return Boolean(total.trim());
  return Boolean(details[field].trim());
}

export function prepareMaintenanceReceiptReviewSuggestions(
  suggestions: readonly MaintenanceReceiptOcrSuggestion[],
  details: MaintenanceDetailsFormValues,
  total: string,
  recordDate: string,
): ReviewSuggestion[] {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    selected: !hasCurrentValue(suggestion.fieldId, details, total, recordDate),
  }));
}

export function buildMaintenanceReceiptPatch(
  suggestions: readonly ReviewSuggestion[],
): MaintenanceReceiptPatch {
  return Object.fromEntries(
    suggestions
      .filter((suggestion) => suggestion.selected && suggestion.value.trim())
      .map((suggestion) => [suggestion.fieldId, suggestion.value.trim()]),
  ) as MaintenanceReceiptPatch;
}

function errorMessage(code: string): string {
  if (code === 'unsupported_attachment') {
    return 'Fiş tarama için JPG veya PNG biçiminde bir görüntü ekleyin.';
  }
  if (code === 'no_text' || code === 'no_fields') {
    return 'Fişten okunabilir bakım bilgisi bulunamadı.';
  }
  return 'Fiş taranamadı. Bilgileri manuel girebilirsiniz.';
}

export function MaintenanceReceiptOcrSection({
  attachments,
  details,
  total,
  recordDate,
  disabled,
  onApply,
  analyze = analyzeMaintenanceReceiptAttachment,
}: {
  attachments: AttachmentListItem[];
  details: MaintenanceDetailsFormValues;
  total: string;
  recordDate: string;
  disabled: boolean;
  onApply: (patch: MaintenanceReceiptPatch) => void;
  analyze?: Analyzer;
}) {
  const styles = useThemedStyles(createStyles);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ReviewSuggestion[]>([]);
  const [usage, setUsage] = useState<OcrUsage | null>(null);

  const start = async () => {
    if (disabled || analyzing) return;
    const attachment = attachments.find(
      (item): item is PendingAttachment =>
        isPendingAttachment(item) && ['image/jpeg', 'image/png'].includes(item.mimeType),
    );
    if (!attachment) {
      setError('Fiş tarama için JPG veya PNG biçiminde bir görüntü ekleyin.');
      return;
    }
    let operationId: string;
    try { ({ operationId } = await reserveOcrUsage('maintenance_receipt')); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Kullanım limiti şu anda kontrol edilemiyor. Lütfen tekrar deneyin.'); return; }
    setAnalyzing(true);
    setError(null);
    setSuggestions([]);
    const result = await analyze(attachment).catch(() => ({ status: 'error' as const, code: 'failed' as const }));
    setAnalyzing(false);
    if (result.status === 'error') {
      void releaseOcrUsage(operationId);
      setError(errorMessage(result.code));
      return;
    }
    try { setUsage(await commitOcrUsage(operationId)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Tarama sonucu kaydedilemedi. Lütfen tekrar deneyin.'); return; }
    setSuggestions(prepareMaintenanceReceiptReviewSuggestions(result.result.suggestions, details, total, recordDate));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bakım fişi tarama</Text>
      <Text style={styles.helper}>Bulunan bilgiler öneridir; onaylamadan forma aktarılmaz veya kaydedilmez.</Text>
      {usage ? <Text style={styles.helper}>{usage.usedCount}/{usage.monthlyQuota} tarama bu ay kullanıldı</Text> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {suggestions.length ? (
        <View style={styles.review} testID="maintenance-receipt-ocr-review">
          <Text style={styles.title}>Fişten bulunan bilgiler</Text>
          {suggestions.map((suggestion, index) => (
            <View key={suggestion.fieldId} style={styles.suggestion}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={`${fieldLabel(suggestion.fieldId)} önerisini forma aktar`}
                accessibilityState={{ checked: suggestion.selected }}
                onPress={() =>
                  setSuggestions((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, selected: !item.selected } : item,
                    ),
                  )
                }
              >
                <Text style={styles.toggle}>
                  {suggestion.selected ? '✓ Forma aktarılacak' : '○ Öneriyi kullanma'}
                </Text>
              </Pressable>
              <AppInput
                label={fieldLabel(suggestion.fieldId)}
                value={suggestion.value}
                editable={suggestion.selected}
                onChangeText={(value) =>
                  setSuggestions((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, value } : item,
                    ),
                  )
                }
              />
              {hasCurrentValue(suggestion.fieldId, details, total, recordDate) ? (
                <Text style={styles.warning}>Mevcut değer korunuyor; kullanmak için öneriyi seçin.</Text>
              ) : null}
            </View>
          ))}
          <View style={styles.actions}>
            <AppButton title="Vazgeç" compact variant="secondary" onPress={() => setSuggestions([])} />
            <AppButton
              title="Forma aktar"
              compact
              disabled={!suggestions.some((suggestion) => suggestion.selected)}
              onPress={() => {
                onApply(buildMaintenanceReceiptPatch(suggestions));
                setSuggestions([]);
              }}
            />
          </View>
        </View>
      ) : (
        <AppButton
          title="Fişten bilgileri tara"
          icon="scan-outline"
          variant="secondary"
          loading={analyzing}
          disabled={disabled || analyzing}
          onPress={() => void start()}
        />
      )}
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: { gap: spacing.sm },
    title: { color: colors.textPrimary, ...typography.label },
    helper: { color: colors.textSecondary, ...typography.caption },
    review: { gap: spacing.sm, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.elevatedSurface },
    suggestion: { gap: spacing.xs },
    toggle: { color: colors.primaryAction, ...typography.caption },
    warning: { color: colors.warning, ...typography.caption },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  });
