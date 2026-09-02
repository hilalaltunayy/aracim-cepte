import { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AppButton,
  ErrorBanner,
  FormSection,
  LoadingScreen,
  NoVehicleState,
  Screen,
  SelectField,
  confirmAction,
} from '@/shared/components/ui';
import { AutomotiveBackdrop } from '@/shared/components/AutomotiveBackdrop';
import type { DocumentType } from '@/domain/entities';
import {
  deleteAttachment,
  openAttachment,
  uploadParentAttachment,
} from '@/data/storage/attachments';
import { useDataStore } from '@/store/dataStore';
import { getFriendlyError } from '@/shared/utils/errors';
import { spacing } from '@/shared/theme';
import { goBackOr } from '@/shared/utils/navigation';
import { resolveEntityRoute } from '@/shared/utils/repositoryRules';
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard';
import { haveFormValuesChanged } from '@/shared/utils/unsavedChanges';
import { createRequestId } from '@/shared/utils/requestId';
import { firstRouteParam, safeEntityId } from '@/shared/utils/routeParams';
import { isPendingAttachment, type AttachmentListItem } from '@/features/attachments/domain/types';
import { DocumentDetailsFields } from '@/features/documents/components/DocumentDetailsFields';
import {
  documentTypeOptions,
  getDocumentTypeDefinition,
} from '@/features/documents/config/documentTypes';
import {
  normalizeDocumentValues,
  preserveHiddenLegacyDocumentValues,
  resolveDocumentTitleForTypeChange,
  validateDocument,
  type DocumentFormValues,
} from '@/features/documents/domain/documentValidation';
import type { DocumentOcrFormPatch } from '@/features/documents/ocr/domain/documentOcrTypes';

export default function DocumentEditScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = safeEntityId(params.id);
  const invalidRouteId = Boolean(firstRouteParam(params.id) && !id);
  const { documents, activeVehicleId, saveDocument, deleteDocument, loading, error, bootstrapped } =
    useDataStore();
  const existing = useMemo(() => documents.find((document) => document.id === id), [documents, id]);
  const [type, setType] = useState<DocumentType>(existing?.documentType ?? 'registration');
  const [values, setValues] = useState<DocumentFormValues>({
    title: existing?.title ?? getDocumentTypeDefinition('registration').label,
    documentNumber: existing?.documentNumber ?? '',
    issuerName: existing?.issuerName ?? '',
    startDate: existing?.startDate ?? null,
    eventDate: existing?.eventDate ?? existing?.issueDate ?? null,
    expiryDate: existing?.expiryDate ?? null,
    note: existing?.note ?? '',
  });
  const [attachments, setAttachments] = useState<AttachmentListItem[]>(existing?.attachments ?? []);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const generatedDocumentId = useRef(createRequestId()).current;
  const documentId = existing?.id ?? id ?? generatedDocumentId;
  const validation = validateDocument(type, values);
  const isDirty = haveFormValuesChanged(
    {
      type: existing?.documentType ?? 'registration',
      values: {
        title: existing?.title ?? getDocumentTypeDefinition('registration').label,
        documentNumber: existing?.documentNumber ?? '',
        issuerName: existing?.issuerName ?? '',
        startDate: existing?.startDate ?? null,
        eventDate: existing?.eventDate ?? existing?.issueDate ?? null,
        expiryDate: existing?.expiryDate ?? null,
        note: existing?.note ?? '',
      },
      attachments: (existing?.attachments ?? []).map((item) => item.storagePath),
    },
    {
      type,
      values,
      attachments: attachments.map((item) =>
        isPendingAttachment(item) ? item.uri : item.storagePath,
      ),
    },
  );
  const leaveWithoutPrompt = useUnsavedChangesGuard(isDirty);
  const routeState = invalidRouteId ? 'missing' : resolveEntityRoute(id, documents, bootstrapped);

  const updateValue = <K extends keyof DocumentFormValues>(key: K, value: DocumentFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const applyOcrSuggestions = (patch: DocumentOcrFormPatch) =>
    setValues((current) => ({ ...current, ...patch }));

  const changeType = (nextType: DocumentType) => {
    setValues((current) => ({
      ...current,
      title: resolveDocumentTitleForTypeChange(type, nextType, current.title, Boolean(existing)),
    }));
    setType(nextType);
  };

  const submit = async () => {
    setSubmitted(true);
    if (!validation.valid || !activeVehicleId) return;
    setLocalError(null);
    setSubmitting(true);
    const uploadedPaths: string[] = [];
    try {
      const attachmentPaths: string[] = [];
      for (const attachment of attachments) {
        if (!isPendingAttachment(attachment)) {
          if (!attachment.legacy) attachmentPaths.push(attachment.storagePath);
          continue;
        }
        const uploaded = await uploadParentAttachment(
          activeVehicleId,
          'vehicle_document',
          documentId,
          attachment,
        );
        uploadedPaths.push(uploaded.path);
        attachmentPaths.push(uploaded.path);
      }
      const normalized = preserveHiddenLegacyDocumentValues(
        type,
        normalizeDocumentValues(type, values),
        existing,
      );
      const success = await saveDocument(
        {
          documentType: type,
          ...normalized,
          attachmentPath: existing?.attachmentPath ?? null,
          attachmentPaths,
          keepLegacyAttachment: attachments.some(
            (attachment) => !isPendingAttachment(attachment) && attachment.legacy === true,
          ),
        },
        documentId,
      );
      if (!success) {
        for (const uploadedPath of uploadedPaths) {
          try {
            await deleteAttachment(uploadedPath);
          } catch {
            // Reconciliation will retry without exposing provider details.
          }
        }
        uploadedPaths.length = 0;
        setLocalError('Belge kaydedilemedi. Lütfen tekrar deneyin.');
        return;
      }
      uploadedPaths.length = 0;
      leaveWithoutPrompt(() => {
        Alert.alert('Kaydedildi', 'Belge bilgileri güvenli buluta kaydedildi.');
        goBackOr('/documents');
      });
    } catch (caught) {
      for (const uploadedPath of uploadedPaths) {
        try {
          await deleteAttachment(uploadedPath);
        } catch {
          // Do not replace the original safe error with cleanup details.
        }
      }
      setLocalError(getFriendlyError(caught));
    } finally {
      setSubmitting(false);
    }
  };

  if (routeState === 'loading') return <LoadingScreen />;
  if (routeState === 'create' && !activeVehicleId) {
    return (
      <Screen style={styles.form} backdrop={<AutomotiveBackdrop />}>
        <NoVehicleState onCreate={() => router.replace('/vehicle/edit')} />
      </Screen>
    );
  }
  if (routeState === 'missing') {
    return (
      <Screen style={styles.form} backdrop={<AutomotiveBackdrop />}>
        <ErrorBanner message="Bu belge silinmiş veya artık erişilebilir değil." />
        <AppButton title="Belgelere dön" onPress={() => goBackOr('/documents')} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.form} backdrop={<AutomotiveBackdrop />}>
      {error || localError ? <ErrorBanner message={localError ?? error ?? ''} /> : null}
      <FormSection title="Belge türü">
        <SelectField
          label="Belge türü"
          value={type}
          onChange={changeType}
          options={documentTypeOptions}
        />
      </FormSection>
      <DocumentDetailsFields
        type={type}
        values={values}
        errors={submitted ? validation.errors : {}}
        attachments={attachments}
        disabled={submitting}
        onChange={updateValue}
        onAttachmentsChange={setAttachments}
        onOpenAttachment={(attachment) => openAttachment(attachment.storagePath)}
        onApplyOcrSuggestions={applyOcrSuggestions}
      />
      {existing && values.expiryDate ? (
        <AppButton
          title="Bitiş tarihi için hatırlatıcı ekle"
          variant="secondary"
          icon="notifications-outline"
          onPress={() =>
            router.push({
              pathname: '/reminder/edit',
              params: { dueDate: values.expiryDate ?? '', title: `${values.title} yenileme` },
            })
          }
        />
      ) : null}
      <AppButton title="Belgeyi kaydet" loading={loading || submitting} onPress={submit} />
      {existing ? (
        <AppButton
          title="Belgeyi sil"
          variant="danger"
          onPress={() =>
            confirmAction('Belgeyi sil', 'Belge bilgileri ve ek dosyaları silinecek.', async () => {
              if (await deleteDocument(existing.id)) {
                leaveWithoutPrompt(() => goBackOr('/documents'));
              }
            })
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.xl } });
