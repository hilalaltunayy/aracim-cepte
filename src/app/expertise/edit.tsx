import { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { UnifiedAttachmentField } from '@/features/attachments/components/UnifiedAttachmentField';
import {
  AppButton,
  AppInput,
  DateField,
  ErrorBanner,
  FormSection,
  LoadingScreen,
  NoVehicleState,
  Screen,
  confirmAction,
} from '@/shared/components/ui';
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
import {
  isPendingAttachment,
  type AttachmentListItem,
} from '@/features/attachments/domain/types';

export default function ExpertiseEditScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = safeEntityId(params.id);
  const invalidRouteId = Boolean(firstRouteParam(params.id) && !id);
  const {
    expertiseReports,
    activeVehicleId,
    saveExpertise,
    deleteExpertise,
    loading,
    error,
    bootstrapped,
  } = useDataStore();
  const existing = useMemo(
    () => expertiseReports.find((report) => report.id === id),
    [expertiseReports, id],
  );
  const [date, setDate] = useState<string | null>(existing?.reportDate ?? null);
  const [company, setCompany] = useState(existing?.companyName ?? '');
  const [number, setNumber] = useState(existing?.reportNumber ?? '');
  const [note, setNote] = useState(existing?.overallNote ?? '');
  const [attachments, setAttachments] = useState<AttachmentListItem[]>(
    existing?.attachments ?? [],
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const generatedReportId = useRef(createRequestId()).current;
  const reportId = existing?.id ?? id ?? generatedReportId;
  const isDirty = haveFormValuesChanged(
    {
      date: existing?.reportDate ?? null,
      company: existing?.companyName ?? '',
      number: existing?.reportNumber ?? '',
      note: existing?.overallNote ?? '',
      attachments: (existing?.attachments ?? []).map((item) => item.storagePath),
    },
    {
      date,
      company,
      number,
      note,
      attachments: attachments.map((item) =>
        isPendingAttachment(item) ? item.uri : item.storagePath,
      ),
    },
  );
  const leaveWithoutPrompt = useUnsavedChangesGuard(isDirty);
  const routeState = invalidRouteId
    ? 'missing'
    : resolveEntityRoute(id, expertiseReports, bootstrapped);
  const submit = async () => {
    if (!activeVehicleId) return;
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
          'expertise_report',
          reportId,
          attachment,
        );
        uploadedPaths.push(uploaded.path);
        attachmentPaths.push(uploaded.path);
      }
      const success = await saveExpertise(
        {
          reportDate: date,
          companyName: company || null,
          reportNumber: number || null,
          overallNote: note || null,
          attachmentPath: existing?.attachmentPath ?? null,
          attachmentPaths,
          keepLegacyAttachment: attachments.some(
            (attachment) => !isPendingAttachment(attachment) && attachment.legacy === true,
          ),
        },
        reportId,
      );
      if (!success) {
        for (const uploadedPath of uploadedPaths) {
          try {
            await deleteAttachment(uploadedPath);
          } catch {
            // Reconciliation will retry cleanup without exposing provider details.
          }
        }
        uploadedPaths.length = 0;
        setLocalError('Ekspertiz raporu kaydedilemedi. Lütfen tekrar deneyin.');
        return;
      }
      uploadedPaths.length = 0;
      leaveWithoutPrompt(() => {
        Alert.alert('Kaydedildi', 'Ekspertiz raporu kaydedildi.');
        goBackOr('/expertise');
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
  const remove = () =>
    existing &&
    confirmAction('Raporu sil', 'Bu rapor ve ek dosyası silinecek.', async () => {
      if (await deleteExpertise(existing.id)) leaveWithoutPrompt(() => goBackOr('/expertise'));
    });
  if (routeState === 'loading') return <LoadingScreen />;
  if (routeState === 'create' && !activeVehicleId) {
    return (
      <Screen style={styles.form}>
        <NoVehicleState onCreate={() => router.replace('/vehicle/edit')} />
      </Screen>
    );
  }
  if (routeState === 'missing') {
    return (
      <Screen style={styles.form}>
        <ErrorBanner message="Bu ekspertiz raporu silinmiş veya artık erişilebilir değil." />
        <AppButton title="Raporlara dön" onPress={() => goBackOr('/expertise')} />
      </Screen>
    );
  }
  return (
    <Screen style={styles.form}>
      {error || localError ? <ErrorBanner message={localError ?? error ?? ''} /> : null}
      <FormSection title="Rapor bilgileri">
        <DateField label="Rapor tarihi" value={date} onChange={setDate} optional />
        <AppInput label="Firma adı" value={company} onChangeText={setCompany} />
        <AppInput label="Rapor numarası" value={number} onChangeText={setNumber} />
        <AppInput label="Genel not" value={note} onChangeText={setNote} multiline />
        <UnifiedAttachmentField
          items={attachments}
          disabled={submitting}
          onChange={setAttachments}
          onOpen={(attachment) => openAttachment(attachment.storagePath)}
        />
      </FormSection>
      <AppButton title="Raporu kaydet" loading={loading || submitting} onPress={submit} />
      {existing ? <AppButton title="Raporu sil" variant="danger" onPress={remove} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.xl } });
