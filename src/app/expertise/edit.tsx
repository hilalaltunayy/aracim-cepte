import { useMemo, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AttachmentField } from '@/shared/components/AttachmentField';
import {
  AppButton,
  AppInput,
  DateField,
  ErrorBanner,
  FormSection,
  LoadingScreen,
  Screen,
  confirmAction,
} from '@/shared/components/ui';
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

export default function ExpertiseEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
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
  const [attachmentPath, setAttachmentPath] = useState(existing?.attachmentPath ?? null);
  const [picked, setPicked] = useState<PickedAttachment | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const routeState = resolveEntityRoute(id, expertiseReports, bootstrapped);
  const submit = async () => {
    if (!activeVehicleId) return;
    setLocalError(null);
    setSubmitting(true);
    let uploadedPath: string | null = null;
    try {
      let path = attachmentPath;
      if (picked) {
        path = await uploadAttachment(activeVehicleId, picked);
        uploadedPath = path;
      }
      const success = await saveExpertise(
        {
          reportDate: date,
          companyName: company || null,
          reportNumber: number || null,
          overallNote: note || null,
          attachmentPath: path,
        },
        existing?.id,
      );
      if (success) {
        uploadedPath = null;
        if (existing?.attachmentPath && existing.attachmentPath !== path)
          await deleteAttachment(existing.attachmentPath);
        Alert.alert('Kaydedildi', 'Ekspertiz raporu kaydedildi.');
        goBackOr('/expertise');
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
  const remove = () =>
    existing &&
    confirmAction('Raporu sil', 'Bu rapor ve ek dosyası silinecek.', async () => {
      if (await deleteExpertise(existing.id)) {
        goBackOr('/expertise');
      }
    });
  if (routeState === 'loading') return <LoadingScreen />;
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
      {error || localError ? <ErrorBanner message={error ?? localError ?? ''} /> : null}
      <FormSection title="Rapor bilgileri">
        <DateField label="Rapor tarihi" value={date} onChange={setDate} optional />
        <AppInput label="Firma adı" value={company} onChangeText={setCompany} />
        <AppInput label="Rapor numarası" value={number} onChangeText={setNumber} />
        <AppInput label="Genel not" value={note} onChangeText={setNote} multiline />
        <AttachmentField
          picked={picked}
          existingPath={attachmentPath}
          onPick={setPicked}
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
          onPress={() => void openAttachment(existing.attachmentPath!)}
        />
      ) : null}
      <AppButton title="Raporu kaydet" loading={loading || submitting} onPress={submit} />
      {existing ? <AppButton title="Raporu sil" variant="danger" onPress={remove} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.xl } });
