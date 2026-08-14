import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DocumentType } from '@/domain/entities';
import {
  isPendingAttachment,
  type AttachmentListItem,
  type PendingAttachment,
} from '@/features/attachments/domain/types';
import { AppButton, ErrorBanner } from '@/shared/components/ui';
import { spacing, typography, useThemedStyles, type AppTheme } from '@/shared/theme';
import type { DocumentFormValues } from '../../domain/documentValidation';
import type { DocumentOcrAnalysisResult, DocumentOcrFormPatch } from '../domain/documentOcrTypes';
import { analyzeDocumentAttachment, getDocumentOcrMessage } from '../services/documentOcrService';
import { commitOcrUsage, releaseOcrUsage, reserveOcrUsage, type OcrUsage } from '@/features/entitlements/services/ocrUsageQuota';
import {
  DocumentOcrReviewPanel,
  prepareReviewSuggestions,
  type ReviewableDocumentOcrSuggestion,
} from './DocumentOcrReviewPanel';

type AnalyzeDocument = (
  documentType: DocumentType,
  attachment: PendingAttachment,
) => Promise<DocumentOcrAnalysisResult>;

export function DocumentOcrSection({
  documentType,
  attachments,
  currentValues,
  disabled,
  onApply,
  analyze = analyzeDocumentAttachment,
}: {
  documentType: DocumentType;
  attachments: AttachmentListItem[];
  currentValues: DocumentFormValues;
  disabled: boolean;
  onApply: (patch: DocumentOcrFormPatch) => void;
  analyze?: AnalyzeDocument;
}) {
  const styles = useThemedStyles(createStyles);
  const requestId = useRef(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ReviewableDocumentOcrSuggestion[]>([]);
  const [usage, setUsage] = useState<OcrUsage | null>(null);

  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );

  const start = async () => {
    if (analyzing || disabled) return;
    const attachment = attachments.find(
      (item): item is PendingAttachment =>
        isPendingAttachment(item) &&
        (item.mimeType === 'image/jpeg' || item.mimeType === 'image/png'),
    );
    if (!attachment) {
      setError('Belge tarama için JPG veya PNG biçiminde bir görüntü ekleyin.');
      return;
    }
    const currentRequestId = ++requestId.current;
    let operationId: string;
    try {
      ({ operationId } = await reserveOcrUsage('document'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Kullanım limiti şu anda kontrol edilemiyor. Lütfen tekrar deneyin.');
      return;
    }
    setError(null);
    setSuggestions([]);
    setAnalyzing(true);
    let result: DocumentOcrAnalysisResult;
    try {
      result = await analyze(documentType, attachment);
    } catch {
      result = { status: 'error', code: 'failed' };
    }
    if (currentRequestId !== requestId.current) { void releaseOcrUsage(operationId); return; }
    setAnalyzing(false);
    if (result.status !== 'success') {
      void releaseOcrUsage(operationId);
      setError(getDocumentOcrMessage(result));
      return;
    }
    try { setUsage(await commitOcrUsage(operationId)); } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Tarama sonucu kaydedilemedi. Lütfen tekrar deneyin.'); return;
    }
    setSuggestions(prepareReviewSuggestions(result.suggestions, currentValues));
  };

  const cancel = () => {
    requestId.current += 1;
    setAnalyzing(false);
    setSuggestions([]);
    setError(null);
  };

  const apply = (patch: DocumentOcrFormPatch) => {
    onApply(patch);
    setSuggestions([]);
    setError(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>Belge tarama</Text>
        <Text style={styles.helper}>
          Görseldeki bilgiler öneri olarak hazırlanır; siz onaylamadan forma aktarılmaz.
        </Text>
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      {usage ? <Text style={styles.helper}>{usage.usedCount}/{usage.monthlyQuota} tarama bu ay kullanıldı</Text> : null}
      {suggestions.length ? (
        <DocumentOcrReviewPanel
          documentType={documentType}
          suggestions={suggestions}
          currentValues={currentValues}
          onChange={setSuggestions}
          onApply={apply}
          onCancel={cancel}
        />
      ) : (
        <AppButton
          title="Belgeden bilgileri tara"
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
    heading: { gap: spacing.xs },
    title: { color: colors.textPrimary, ...typography.label },
    helper: { color: colors.textSecondary, ...typography.caption },
  });
