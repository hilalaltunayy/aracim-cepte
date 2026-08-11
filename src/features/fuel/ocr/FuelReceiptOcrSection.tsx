import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FuelStationId } from '@/domain/entities';
import { UnifiedAttachmentField } from '@/features/attachments/components/UnifiedAttachmentField';
import { isPendingAttachment, type AttachmentListItem, type PendingAttachment } from '@/features/attachments/domain/types';
import { AppButton, AppInput, ErrorBanner, SelectField } from '@/shared/components/ui';
import { spacing, typography, useThemedStyles, type AppTheme } from '@/shared/theme';
import { FUEL_STATIONS } from '../config/fuelStations';
import type { FuelEntryState } from '../domain/fuelEntry';
import {
  analyzeFuelReceiptAttachment,
  type FuelReceiptOcrField,
  type FuelReceiptOcrSuggestion,
} from './fuelReceiptOcr';

type ReviewSuggestion = FuelReceiptOcrSuggestion & { selected: boolean };
type FuelReceiptPatch = Partial<{
  total: string;
  liters: string;
  pricePerLiter: string;
  stationBrand: FuelStationId;
  recordDate: string;
}>;
type Analyzer = (attachment: PendingAttachment) => ReturnType<typeof analyzeFuelReceiptAttachment>;

function hasValue(field: FuelReceiptOcrField, fuel: FuelEntryState, station: FuelStationId | '', date: string) {
  if (field === 'stationBrand') return Boolean(station);
  if (field === 'recordDate') return Boolean(date);
  return Boolean(fuel[field].trim());
}

export function prepareFuelReceiptReviewSuggestions(
  suggestions: readonly FuelReceiptOcrSuggestion[],
  fuelEntry: FuelEntryState,
  stationBrand: FuelStationId | '',
  recordDate: string,
): ReviewSuggestion[] {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    selected: !hasValue(suggestion.fieldId, fuelEntry, stationBrand, recordDate),
  }));
}

export function buildFuelReceiptFormPatch(
  suggestions: readonly ReviewSuggestion[],
): FuelReceiptPatch {
  const patch: FuelReceiptPatch = {};
  suggestions
    .filter((item) => item.selected && item.value.trim())
    .forEach((item) => {
      if (item.fieldId === 'stationBrand') patch.stationBrand = item.value as FuelStationId;
      else if (item.fieldId === 'recordDate') patch.recordDate = item.value;
      else patch[item.fieldId] = item.value;
    });
  return patch;
}

function message(code: string) {
  if (code === 'unsupported_attachment') {
    return 'Fiş tarama için JPG veya PNG biçiminde bir görüntü ekleyin.';
  }
  if (code === 'no_text' || code === 'no_fields') {
    return 'Fişten okunabilir yakıt bilgisi bulunamadı.';
  }
  return 'Fiş taranamadı. Bilgileri manuel girebilirsiniz.';
}

function fieldLabel(fieldId: FuelReceiptOcrField) {
  if (fieldId === 'total') return 'Toplam';
  if (fieldId === 'liters') return 'Litre';
  if (fieldId === 'pricePerLiter') return 'Litre fiyatı';
  if (fieldId === 'stationBrand') return 'İstasyon';
  return 'Tarih';
}

export function FuelReceiptOcrSection({
  fuelEntry,
  stationBrand,
  recordDate,
  disabled,
  onApply,
  analyze = analyzeFuelReceiptAttachment,
}: {
  fuelEntry: FuelEntryState;
  stationBrand: FuelStationId | '';
  recordDate: string;
  disabled: boolean;
  onApply: (patch: FuelReceiptPatch) => void;
  analyze?: Analyzer;
}) {
  const styles = useThemedStyles(createStyles);
  const [attachments, setAttachments] = useState<AttachmentListItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ReviewSuggestion[]>([]);

  const start = async () => {
    const attachment = attachments.find(
      (item): item is PendingAttachment =>
        isPendingAttachment(item) && ['image/jpeg', 'image/png'].includes(item.mimeType),
    );
    if (!attachment) {
      setError('Fiş tarama için JPG veya PNG biçiminde bir görüntü ekleyin.');
      return;
    }

    setBusy(true);
    setError(null);
    setWarning(null);
    setSuggestions([]);
    try {
      const result = await analyze(attachment);
      if (result.status === 'error') {
        setError(message(result.code));
        return;
      }
      setWarning(
        result.result.inconsistent
          ? 'Fişteki tutarlar birbiriyle uyumlu görünmüyor. Kaydetmeden önce kontrol edin.'
          : null,
      );
      setSuggestions(
        prepareFuelReceiptReviewSuggestions(result.result.suggestions, fuelEntry, stationBrand, recordDate),
      );
    } catch {
      setError('Fiş taranamadı. Bilgileri manuel girebilirsiniz.');
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    onApply(buildFuelReceiptFormPatch(suggestions));
    setSuggestions([]);
    setWarning(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yakıt fişi tarama</Text>
      <Text style={styles.helper}>
        Fiş görseli yalnız tarama için kullanılır; siz onaylamadan forma aktarılmaz veya kaydedilmez.
      </Text>
      <UnifiedAttachmentField
        items={attachments}
        onChange={setAttachments}
        disabled={disabled || busy}
        label="Fiş görseli"
        helper="Kamera, galeri veya dosyadan seçin. JPG ve PNG taranabilir."
      />
      {error ? <ErrorBanner message={error} /> : null}
      {warning ? <Text style={styles.warning}>{warning}</Text> : null}
      {suggestions.length ? (
        <View style={styles.review} testID="fuel-receipt-ocr-review">
          <Text style={styles.title}>Fişten bulunan bilgiler</Text>
          {suggestions.map((suggestion, index) => {
            const currentValueExists = hasValue(suggestion.fieldId, fuelEntry, stationBrand, recordDate);
            return (
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
                {suggestion.fieldId === 'stationBrand' ? (
                  <SelectField
                    label={fieldLabel(suggestion.fieldId)}
                    value={suggestion.value as FuelStationId}
                    options={FUEL_STATIONS.map((station) => ({
                      value: station.id,
                      label: station.label,
                    }))}
                    onChange={(value) =>
                      setSuggestions((items) =>
                        items.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, value } : item,
                        ),
                      )
                    }
                  />
                ) : (
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
                )}
                {currentValueExists ? (
                  <Text style={styles.warning}>Mevcut değer korunuyor; kullanmak için öneriyi seçin.</Text>
                ) : null}
              </View>
            );
          })}
          <View style={styles.actions}>
            <AppButton
              title="Vazgeç"
              compact
              variant="secondary"
              onPress={() => {
                setSuggestions([]);
                setWarning(null);
              }}
            />
            <AppButton
              title="Forma aktar"
              compact
              disabled={!suggestions.some((item) => item.selected)}
              onPress={apply}
            />
          </View>
        </View>
      ) : (
        <AppButton
          title="Fişten bilgileri tara"
          icon="scan-outline"
          variant="secondary"
          loading={busy}
          disabled={disabled || busy}
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
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: spacing.md,
      backgroundColor: colors.elevatedSurface,
    },
    suggestion: { gap: spacing.xs },
    toggle: { color: colors.primaryAction, ...typography.caption },
    warning: { color: colors.warning, ...typography.caption },
    actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  });
