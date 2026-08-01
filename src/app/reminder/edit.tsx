import { useMemo, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
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
import { ReminderType } from '@/domain/entities';
import { reminderTypeLabels } from '@/shared/constants/labels';
import { parseDecimal } from '@/shared/utils/format';
import { goBackOr } from '@/shared/utils/navigation';
import { useDataStore } from '@/store/dataStore';
import { spacing } from '@/shared/theme';
import { resolveEntityRoute } from '@/shared/utils/repositoryRules';

export default function ReminderEditScreen() {
  const params = useLocalSearchParams<{ id?: string; dueDate?: string; title?: string }>();
  const { reminders, saveReminder, deleteReminder, loading, error, bootstrapped } = useDataStore();
  const existing = useMemo(
    () => reminders.find((reminder) => reminder.id === params.id),
    [reminders, params.id],
  );
  const [type, setType] = useState<ReminderType>(existing?.reminderType ?? 'periodic_maintenance');
  const [title, setTitle] = useState(
    existing?.title ?? params.title ?? reminderTypeLabels.periodic_maintenance,
  );
  const [date, setDate] = useState<string | null>(existing?.dueDate ?? params.dueDate ?? null);
  const [km, setKm] = useState(existing?.dueKilometer?.toString() ?? '');
  const [submitted, setSubmitted] = useState(false);
  const routeState = resolveEntityRoute(params.id, reminders, bootstrapped);
  const parsedKm = km ? parseDecimal(km) : null;
  const valid =
    title.trim().length > 0 &&
    (date !== null || parsedKm !== null) &&
    (parsedKm === null || parsedKm >= 0);
  const submit = async () => {
    setSubmitted(true);
    if (!valid) return;
    const success = await saveReminder(
      {
        title,
        reminderType: type,
        dueDate: date,
        dueKilometer: parsedKm === null ? null : Math.round(parsedKm),
      },
      existing?.id,
    );
    if (success) {
      Alert.alert(
        'Hatırlatıcı kaydedildi',
        date
          ? 'Bildirim izni varsa cihazınızda yerel bildirim planlandı.'
          : 'Kilometreye dayalı plan kaydedildi.',
      );
      goBackOr('/(tabs)/reminders');
    }
  };
  if (routeState === 'loading') return <LoadingScreen />;
  if (routeState === 'missing') {
    return (
      <Screen style={styles.form}>
        <ErrorBanner message="Bu hatırlatıcı silinmiş veya artık erişilebilir değil." />
        <AppButton title="Hatırlatıcılara dön" onPress={() => goBackOr('/(tabs)/reminders')} />
      </Screen>
    );
  }
  return (
    <Screen style={styles.form}>
      {error ? <ErrorBanner message={error} /> : null}
      <FormSection
        title="Hatırlatma ayrıntıları"
        description="Tarih, kilometre veya ikisini birlikte kullanabilirsiniz."
      >
        <SelectField
          label="Hatırlatıcı türü"
          value={type}
          onChange={(value) => {
            setType(value);
            if (!existing && !title.trim()) setTitle(reminderTypeLabels[value]);
          }}
          options={(Object.keys(reminderTypeLabels) as ReminderType[]).map((value) => ({
            value,
            label: reminderTypeLabels[value],
          }))}
        />
        <AppInput
          label="Başlık"
          value={title}
          onChangeText={setTitle}
          error={submitted && !title.trim() ? 'Başlık gereklidir.' : null}
        />
        <DateField label="Tarih (isteğe bağlı)" value={date} onChange={setDate} optional />
        <AppInput
          label="Kilometre (isteğe bağlı)"
          value={km}
          onChangeText={setKm}
          keyboardType="number-pad"
          error={
            submitted && parsedKm !== null && parsedKm < 0 ? 'Kilometre negatif olamaz.' : null
          }
        />
        {submitted && date === null && parsedKm === null ? (
          <ErrorBanner message="En az bir tarih veya kilometre hedefi girin." />
        ) : null}
      </FormSection>
      <AppButton title="Hatırlatıcıyı kaydet" loading={loading} onPress={submit} />
      {existing ? (
        <AppButton
          title="Hatırlatıcıyı sil"
          variant="danger"
          onPress={() =>
            confirmAction('Hatırlatıcıyı sil', 'Plan ve yerel bildirim kaldırılacak.', async () => {
              if (await deleteReminder(existing.id)) goBackOr('/(tabs)/reminders');
            })
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.xl } });
