import { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AttachmentField } from '@/shared/components/AttachmentField';
import {
  AppButton,
  AppInput,
  DateField,
  ErrorBanner,
  FormSection,
  LoadingScreen,
  Screen,
  SelectField,
  confirmAction,
} from '@/shared/components/ui';
import { DocumentType } from '@/domain/entities';
import { documentTypeLabels } from '@/shared/constants/labels';
import {
  deleteAttachment,
  openAttachment,
  PickedAttachment,
  uploadAttachment,
} from '@/data/storage/attachments';
import { useDataStore } from '@/store/dataStore';
import { getFriendlyError } from '@/shared/utils/errors';
import { spacing } from '@/shared/theme';
import { goBackOr } from '@/shared/utils/navigation';
import { resolveEntityRoute } from '@/shared/utils/repositoryRules';
import { ATTACHMENT_OPEN_ERROR_MESSAGE } from '@/data/storage/attachmentRules';
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard';
import { haveFormValuesChanged } from '@/shared/utils/unsavedChanges';
import { createRequestId } from '@/shared/utils/requestId';

export default function DocumentEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { documents, activeVehicleId, saveDocument, deleteDocument, loading, error, bootstrapped } =
    useDataStore();
  const existing = useMemo(() => documents.find((document) => document.id === id), [documents, id]);
  const [type, setType] = useState<DocumentType>(existing?.documentType ?? 'registration');
  const [title, setTitle] = useState(existing?.title ?? documentTypeLabels.registration);
  const [number, setNumber] = useState(existing?.documentNumber ?? '');
  const [issueDate, setIssueDate] = useState<string | null>(existing?.issueDate ?? null);
  const [expiryDate, setExpiryDate] = useState<string | null>(existing?.expiryDate ?? null);
  const [note, setNote] = useState(existing?.note ?? '');
  const [attachmentPath, setAttachmentPath] = useState(existing?.attachmentPath ?? null);
  const [picked, setPicked] = useState<PickedAttachment | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [opening, setOpening] = useState(false);
  const uploadRequestId = useRef(createRequestId());
  const isDirty = haveFormValuesChanged(
    {
      type: existing?.documentType ?? 'registration',
      title: existing?.title ?? documentTypeLabels.registration,
      number: existing?.documentNumber ?? '',
      issueDate: existing?.issueDate ?? null,
      expiryDate: existing?.expiryDate ?? null,
      note: existing?.note ?? '',
      attachmentPath: existing?.attachmentPath ?? null,
      pickedUri: null,
    },
    {
      type,
      title,
      number,
      issueDate,
      expiryDate,
      note,
      attachmentPath,
      pickedUri: picked?.uri ?? null,
    },
  );
  const leaveWithoutPrompt = useUnsavedChangesGuard(isDirty);
  const routeState = resolveEntityRoute(id, documents, bootstrapped);
  const datesValid = !issueDate || !expiryDate || expiryDate >= issueDate;
  const submit = async () => {
    setSubmitted(true);
    if (!title.trim() || !datesValid || !activeVehicleId) return;
    setLocalError(null);
    setSubmitting(true);
    let uploadedPath: string | null = null;
    try {
      let path = attachmentPath;
      if (picked) {
        path = await uploadAttachment(activeVehicleId, picked, uploadRequestId.current);
        uploadedPath = path;
      }
      const success = await saveDocument(
        {
          documentType: type,
          title,
          documentNumber: number || null,
          issueDate,
          expiryDate,
          note: note || null,
          attachmentPath: path,
        },
        existing?.id,
      );
      if (success) {
        uploadedPath = null;
        if (existing?.attachmentPath && existing.attachmentPath !== path)
          await deleteAttachment(existing.attachmentPath);
        leaveWithoutPrompt(() => {
          Alert.alert('Kaydedildi', 'Belge bilgileri güvenli buluta kaydedildi.');
          goBackOr('/documents');
        });
      }
    } catch (caught) {
      if (uploadedPath) {
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
  const openExistingAttachment = async () => {
    if (!existing?.attachmentPath || opening) return;
    setLocalError(null);
    setOpening(true);
    try {
      await openAttachment(existing.attachmentPath);
    } catch {
      setLocalError(ATTACHMENT_OPEN_ERROR_MESSAGE);
    } finally {
      setOpening(false);
    }
  };
  if (routeState === 'loading') return <LoadingScreen />;
  if (routeState === 'missing') {
    return (
      <Screen style={styles.form}>
        <ErrorBanner message="Bu belge silinmiş veya artık erişilebilir değil." />
        <AppButton title="Belgelere dön" onPress={() => goBackOr('/documents')} />
      </Screen>
    );
  }
  return (
    <Screen style={styles.form}>
      {error || localError ? <ErrorBanner message={localError ?? error ?? ''} /> : null}
      <FormSection title="Belge bilgileri">
        <SelectField
          label="Belge türü"
          value={type}
          onChange={(value) => {
            setType(value);
            if (!existing) setTitle(documentTypeLabels[value]);
          }}
          options={(Object.keys(documentTypeLabels) as DocumentType[]).map((value) => ({
            value,
            label: documentTypeLabels[value],
          }))}
        />
        <AppInput
          label="Başlık"
          value={title}
          onChangeText={setTitle}
          error={submitted && !title.trim() ? 'Başlık gereklidir.' : null}
        />
        <AppInput label="Belge numarası" value={number} onChangeText={setNumber} />
      </FormSection>
      <FormSection
        title="Geçerlilik ve ek"
        description="Bitiş tarihi girerseniz daha sonra tek dokunuşla hatırlatıcı oluşturabilirsiniz."
      >
        <DateField label="Düzenlenme tarihi" value={issueDate} onChange={setIssueDate} optional />
        <DateField label="Bitiş tarihi" value={expiryDate} onChange={setExpiryDate} optional />
        {submitted && !datesValid ? (
          <ErrorBanner message="Bitiş tarihi düzenlenme tarihinden önce olamaz." />
        ) : null}
        <AppInput label="Not" value={note} onChangeText={setNote} multiline />
        <AttachmentField
          picked={picked}
          existingPath={attachmentPath}
          onPick={(attachment) => {
            uploadRequestId.current = createRequestId();
            setPicked(attachment);
          }}
          onRemove={() => {
            setPicked(null);
            setAttachmentPath(null);
          }}
        />
      </FormSection>
      {existing?.attachmentPath ? (
        <AppButton
          title="Mevcut eki aç"
          variant="secondary"
          loading={opening}
          onPress={() => void openExistingAttachment()}
        />
      ) : null}
      {existing && expiryDate ? (
        <AppButton
          title="Bitiş tarihi için hatırlatıcı ekle"
          variant="secondary"
          icon="notifications-outline"
          onPress={() =>
            router.push({
              pathname: '/reminder/edit',
              params: { dueDate: expiryDate, title: `${title} yenileme` },
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
            confirmAction('Belgeyi sil', 'Belge bilgileri ve ek dosyası silinecek.', async () => {
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
