import { StyleSheet, Text, View } from 'react-native';
import { AppButton, AppInput } from '@/shared/components/ui';
import { radii, spacing, typography, useThemedStyles, type AppTheme } from '@/shared/theme';
import { getDocumentTypeDefinition } from '../../config/documentTypes';
import type { DocumentType } from '@/domain/entities';
import type { DocumentFormValues } from '../../domain/documentValidation';
import type { DocumentOcrFormPatch, DocumentOcrSuggestion } from '../domain/documentOcrTypes';

export type ReviewableDocumentOcrSuggestion = DocumentOcrSuggestion;

function hasCurrentValue(value: string | null): boolean {
  return Boolean(value?.trim());
}

export function prepareReviewSuggestions(
  suggestions: readonly DocumentOcrSuggestion[],
  _currentValues: DocumentFormValues,
): ReviewableDocumentOcrSuggestion[] {
  return suggestions.map((suggestion) => ({ ...suggestion }));
}

export function buildDocumentOcrFormPatch(
  suggestions: readonly ReviewableDocumentOcrSuggestion[],
): DocumentOcrFormPatch {
  return Object.fromEntries(
    suggestions
      .filter((suggestion) => suggestion.suggestedValue.trim())
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
  const styles = useThemedStyles(createStyles);
  const definition = getDocumentTypeDefinition(documentType);
  const selectedCount = suggestions.filter((suggestion) => suggestion.suggestedValue.trim()).length;

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
          Bulunan alanları doğrudan düzenleyebilir veya temizleyebilirsiniz. Yalnız dolu alanlar
          forma aktarılır; belge ayrıca kaydedilmelidir.
        </Text>
      </View>
      {suggestions.map((suggestion, index) => {
        const field = definition.fields.find((candidate) => candidate.key === suggestion.fieldId);
        const currentValue = currentValues[suggestion.fieldId];
        return (
          <View key={suggestion.fieldId} style={styles.suggestion}>
            <AppInput
              testID={`ocr-suggestion-input-${suggestion.fieldId}`}
              label={field?.label ?? suggestion.fieldId}
              value={suggestion.suggestedValue}
              onChangeText={(suggestedValue) => update(index, { suggestedValue })}
            />
            {hasCurrentValue(currentValue) ? (
              <Text style={styles.currentValue}>
                Forma aktarırsanız mevcut değerin üzerine yazılır.
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
    currentValue: { color: colors.warning, ...typography.caption },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  });
