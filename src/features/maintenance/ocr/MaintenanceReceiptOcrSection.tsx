import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AttachmentListItem, PendingAttachment } from '@/features/attachments/domain/types';
import { isPendingAttachment } from '@/features/attachments/domain/types';
import { AppButton, AppInput, ErrorBanner } from '@/shared/components/ui';
import { spacing, typography, useThemedStyles, type AppTheme } from '@/shared/theme';
import {
  commitOcrUsage,
  releaseOcrUsage,
  reserveOcrUsage,
  type OcrUsage,
} from '@/features/entitlements/services/ocrUsageQuota';
import type { MaintenanceDetailsFormValues } from '../domain/maintenanceDetails';
import { createCustomMaintenanceItemId } from '../config/maintenanceCatalog';
import {
  analyzeMaintenanceReceiptAttachment,
  type MaintenanceReceiptOcrField,
  type MaintenanceReceiptLineItem,
  type MaintenanceReceiptOcrSuggestion,
} from './maintenanceReceiptOcr';

export type MaintenanceReceiptPatch = Partial<
  Pick<
    MaintenanceDetailsFormValues,
    'serviceName' | 'invoiceNumber' | 'partsCost' | 'laborCost'
  > & {
    recordDate: string;
    total: string;
    maintenanceItemTypes: string[];
    notesAppend: string;
  }
>;
type ReviewSuggestion = MaintenanceReceiptOcrSuggestion;
type Analyzer = (
  attachment: PendingAttachment,
) => ReturnType<typeof analyzeMaintenanceReceiptAttachment>;

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
  _details: MaintenanceDetailsFormValues,
  _total: string,
  _recordDate: string,
): ReviewSuggestion[] {
  return suggestions.map((suggestion) => ({ ...suggestion }));
}

export function buildMaintenanceReceiptPatch(
  suggestions: readonly ReviewSuggestion[],
  lineItems: readonly MaintenanceReceiptLineItem[] = [],
): MaintenanceReceiptPatch {
  const patch = Object.fromEntries(
    suggestions
      .filter((suggestion) => suggestion.value.trim())
      .map((suggestion) => [suggestion.fieldId, suggestion.value.trim()]),
  ) as MaintenanceReceiptPatch;
  const reviewedItems = lineItems.filter((item) => item.label.trim() && item.lineTotal.trim());
  const itemTypes = reviewedItems
    .map((item) => createCustomMaintenanceItemId(item.label))
    .filter((item): item is string => Boolean(item));
  if (itemTypes.length) patch.maintenanceItemTypes = [...new Set(itemTypes)];
  if (reviewedItems.length) {
    patch.notesAppend = [
      'Fiş kalemleri:',
      ...reviewedItems.map((item) =>
        [
          item.label.trim(),
          item.quantity.trim() ? `${item.quantity.trim()} adet` : '',
          item.unitPrice.trim() ? `${item.unitPrice.trim()} TL/adet` : '',
          item.lineTotal.trim() ? `${item.lineTotal.trim()} TL` : '',
        ]
          .filter(Boolean)
          .join(' · '),
      ),
    ].join('\n');
  }
  return patch;
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
  const [lineItems, setLineItems] = useState<MaintenanceReceiptLineItem[]>([]);
  const localLineItemSequence = useRef(0);
  const [usage, setUsage] = useState<OcrUsage | null>(null);
  const createBlankLineItem = (): MaintenanceReceiptLineItem => ({
    id: `manual-line-${++localLineItemSequence.current}`,
    label: '',
    quantity: '',
    unitPrice: '',
    lineTotal: '',
    category: 'unknown',
  });

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
    try {
      ({ operationId } = await reserveOcrUsage('maintenance_receipt'));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Kullanım limiti şu anda kontrol edilemiyor. Lütfen tekrar deneyin.',
      );
      return;
    }
    setAnalyzing(true);
    setError(null);
    setSuggestions([]);
    setLineItems([]);
    const result = await analyze(attachment).catch(() => ({
      status: 'error' as const,
      code: 'failed' as const,
    }));
    setAnalyzing(false);
    if (result.status === 'error') {
      void releaseOcrUsage(operationId);
      setError(errorMessage(result.code));
      return;
    }
    try {
      setUsage(await commitOcrUsage(operationId));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Tarama sonucu kaydedilemedi. Lütfen tekrar deneyin.',
      );
      return;
    }
    setSuggestions(
      prepareMaintenanceReceiptReviewSuggestions(
        result.result.suggestions,
        details,
        total,
        recordDate,
      ),
    );
    setLineItems(result.result.lineItems ?? []);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bakım fişi tarama</Text>
      <Text style={styles.helper}>
        Bulunan bilgiler öneridir; onaylamadan forma aktarılmaz veya kaydedilmez.
      </Text>
      {usage ? (
        <Text style={styles.helper}>
          {usage.usedCount}/{usage.monthlyQuota} tarama bu ay kullanıldı
        </Text>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
      {suggestions.length || lineItems.length ? (
        <View style={styles.review} testID="maintenance-receipt-ocr-review">
          <Text style={styles.title}>Fişten bulunan bilgiler</Text>
          {suggestions.map((suggestion, index) => (
            <View key={suggestion.fieldId} style={styles.suggestion}>
              <AppInput
                label={fieldLabel(suggestion.fieldId)}
                value={suggestion.value}
                onChangeText={(value) =>
                  setSuggestions((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, value } : item,
                    ),
                  )
                }
              />
              {hasCurrentValue(suggestion.fieldId, details, total, recordDate) ? (
                <Text style={styles.warning}>
                  Forma aktarırsanız mevcut değerin üzerine yazılır.
                </Text>
              ) : null}
            </View>
          ))}
          {lineItems.length ? (
            <View style={styles.lineItems}>
              <Text style={styles.title}>Parça / hizmet kalemleri</Text>
              <Text style={styles.helper}>
                Yanlış satırı kaldırabilir, bulunan değerleri doğrudan düzeltebilirsiniz.
              </Text>
              {lineItems.map((item, index) => (
                <View key={item.id} style={styles.lineItem}>
                  <AppInput
                    label={`Kalem ${index + 1}`}
                    value={item.label}
                    onChangeText={(label) =>
                      setLineItems((items) =>
                        items.map((candidate) =>
                          candidate.id === item.id ? { ...candidate, label } : candidate,
                        ),
                      )
                    }
                  />
                  <View style={styles.lineItemNumbers}>
                    <View style={styles.lineItemNumber}>
                      <AppInput
                        label="Adet"
                        value={item.quantity}
                        keyboardType="decimal-pad"
                        onChangeText={(quantity) =>
                          setLineItems((items) =>
                            items.map((candidate) =>
                              candidate.id === item.id ? { ...candidate, quantity } : candidate,
                            ),
                          )
                        }
                      />
                    </View>
                    <View style={styles.lineItemNumber}>
                      <AppInput
                        label="Birim fiyat"
                        value={item.unitPrice}
                        keyboardType="decimal-pad"
                        onChangeText={(unitPrice) =>
                          setLineItems((items) =>
                            items.map((candidate) =>
                              candidate.id === item.id ? { ...candidate, unitPrice } : candidate,
                            ),
                          )
                        }
                      />
                    </View>
                    <View style={styles.lineItemNumber}>
                      <AppInput
                        label="Satır toplamı"
                        value={item.lineTotal}
                        keyboardType="decimal-pad"
                        onChangeText={(lineTotal) =>
                          setLineItems((items) =>
                            items.map((candidate) =>
                              candidate.id === item.id ? { ...candidate, lineTotal } : candidate,
                            ),
                          )
                        }
                      />
                    </View>
                  </View>
                  <AppButton
                    title="Satırı kaldır"
                    variant="ghost"
                    compact
                    onPress={() =>
                      setLineItems((items) => items.filter((candidate) => candidate.id !== item.id))
                    }
                  />
                </View>
              ))}
              <AppButton
                title="Satır ekle"
                variant="secondary"
                compact
                onPress={() => setLineItems((items) => [...items, createBlankLineItem()])}
              />
            </View>
          ) : (
            <AppButton
              title="Kalem ekle"
              variant="secondary"
              compact
              onPress={() => setLineItems([createBlankLineItem()])}
            />
          )}
          <View style={styles.actions}>
            <AppButton
              title="Vazgeç"
              compact
              variant="secondary"
              onPress={() => {
                setSuggestions([]);
                setLineItems([]);
              }}
            />
            <AppButton
              title="Forma aktar"
              compact
              disabled={
                !suggestions.some((suggestion) => suggestion.value.trim()) &&
                !lineItems.some((item) => item.label.trim() && item.lineTotal.trim())
              }
              onPress={() => {
                onApply(buildMaintenanceReceiptPatch(suggestions, lineItems));
                setSuggestions([]);
                setLineItems([]);
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
    review: {
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.elevatedSurface,
    },
    suggestion: { gap: spacing.xs },
    warning: { color: colors.warning, ...typography.caption },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    lineItems: { gap: spacing.sm, paddingTop: spacing.xs },
    lineItem: {
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    lineItemNumbers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    lineItemNumber: { flex: 1, minWidth: 92 },
  });
