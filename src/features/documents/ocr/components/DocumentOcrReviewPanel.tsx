import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput } from '@/shared/components/ui';
import {
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { getDocumentTypeDefinition } from '../../config/documentTypes';
import type { DocumentType } from '@/domain/entities';
import type { DocumentFormValues } from '../../domain/documentValidation';
import type { DocumentOcrFormPatch, DocumentOcrSuggestion } from '../domain/documentOcrTypes';

export interface ReviewableDocumentOcrSuggestion extends DocumentOcrSuggestion {
  selected: boolean;
}

function hasCurrentValue(value: string | null): boolean {
  return Boolean(value?.trim());
}

export function prepareReviewSuggestions(
  suggestions: readonly DocumentOcrSuggestion[],
  currentValues: DocumentFormValues,
): ReviewableDocumentOcrSuggestion[] {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    selected: !hasCurrentValue(currentValues[suggestion.fieldId]),
  }));
}

export function buildDocumentOcrFormPatch(
  suggestions: readonly ReviewableDocumentOcrSuggestion[],
): DocumentOcrFormPatch {
  return Object.fromEntries(
    suggestions
      .filter((suggestion) => suggestion.selected && suggestion.suggestedValue.trim())
      .map((suggestion) => [suggestion.fieldId, suggestion.suggestedValue.trim()]),
  ) as DocumentOcrFormPatch;
}

export function DocumentOcrReviewPanel({
  documentType,
  suggestions,
  currentValues,
  onChange,
  onApply,
  onCancel,
}: {
  documentType: DocumentType;
  suggestions: ReviewableDocumentOcrSuggestion[];
  currentValues: DocumentFormValues;
  onChange: (suggestions: ReviewableDocumentOcrSuggestion[]) => void;
  onApply: (patch: DocumentOcrFormPatch) => void;
  onCancel: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const definition = getDocumentTypeDefinition(documentType);
  const selectedCount = suggestions.filter(
    (suggestion) => suggestion.selected && suggestion.suggestedValue.trim(),
  ).length;

  const update = (index: number, patch: Partial<ReviewableDocumentOcrSuggestion>) => {
    onChange(
      suggestions.map((suggestion, candidateIndex) =>
        candidateIndex === index ? { ...suggestion, ...patch } : suggestion,
      ),
    );
  };

  return (
    <View style={styles.container} testID="document-ocr-review">
      <View style={styles.heading}>
        <Text style={styles.title}>Belgeden bulunan bilgiler</Text>
        <Text style={styles.helper}>
          Yalnız seçtiğiniz öneriler forma aktarılır. Belge ayrıca kaydedilmelidir.
        </Text>
      </View>
      {suggestions.map((suggestion, index) => {
        const field = definition.fields.find((candidate) => candidate.key === suggestion.fieldId);
        const currentValue = currentValues[suggestion.fieldId];
        return (
          <View key={suggestion.fieldId} style={styles.suggestion}>
            <Pressable
              testID={`ocr-suggestion-toggle-${suggestion.fieldId}`}
              accessibilityRole="checkbox"
              accessibilityLabel={`${field?.label ?? suggestion.fieldId} önerisini forma aktar`}
              accessibilityState={{ checked: suggestion.selected }}
              style={({ pressed }) => [styles.selectionRow, pressed && styles.pressed]}
              onPress={() => update(index, { selected: !suggestion.selected })}
            >
              <Ionicons
                name={suggestion.selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={colors.primaryAction}
                accessible={false}
              />
              <Text style={styles.selectionLabel}>
                {suggestion.selected ? 'Forma aktarılacak' : 'Öneriyi kullanma'}
              </Text>
            </Pressable>
            <AppInput
              testID={`ocr-suggestion-input-${suggestion.fieldId}`}
              label={field?.label ?? suggestion.fieldId}
              value={suggestion.suggestedValue}
              editable={suggestion.selected}
              onChangeText={(suggestedValue) => update(index, { suggestedValue })}
            />
            {hasCurrentValue(currentValue) ? (
              <Text style={styles.currentValue}>
                Mevcut değer korunuyor. Bu öneriyi seçerseniz üzerine yazılır.
              </Text>
            ) : null}
          </View>
        );
      })}
      <View style={styles.actions}>
        <AppButton title="Vazgeç" variant="secondary" compact onPress={onCancel} />
        <AppButton
          title="Forma aktar"
          compact
          disabled={selectedCount === 0}
          onPress={() => onApply(buildDocumentOcrFormPatch(suggestions))}
        />
      </View>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: spacing.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      backgroundColor: colors.elevatedSurface,
    },
    heading: { gap: spacing.xs },
    title: { color: colors.textPrimary, ...typography.cardTitle },
    helper: { color: colors.textSecondary, ...typography.caption },
    suggestion: {
      gap: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    selectionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    selectionLabel: { color: colors.textPrimary, ...typography.label },
    currentValue: { color: colors.warning, ...typography.caption },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    pressed: { opacity: 0.72 },
  });
