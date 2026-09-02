import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AppButton,
  AppInput,
  ErrorBanner,
  FormSection,
  LoadingScreen,
  NoVehicleState,
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
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard';
import { haveFormValuesChanged } from '@/shared/utils/unsavedChanges';
import {
  DEFAULT_NOTIFICATION_LEAD_DAYS,
  NOTIFICATION_LEAD_OPTIONS,
  normalizeLeadDays,
} from '@/features/reminders/notificationSchedule';
import { getNotificationLeadDays } from '@/features/reminders/notificationPreferences';
import { firstRouteParam, safeEntityId } from '@/shared/utils/routeParams';
import { validateReminderDateTime } from '@/features/reminders/reminderDateTimeValidation';
import { ReminderScheduleFields } from '@/features/reminders/ReminderScheduleFields';
import { resolveReminderTimeForForm } from '@/features/reminders/reminderSchedulePreferences';
import {
  isAutomaticReminderTitle,
  titleAfterReminderTypeChange,
} from '@/features/reminders/reminderTitle';

export default function ReminderEditScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    dueDate?: string | string[];
    title?: string | string[];
  }>();
  const reminderId = safeEntityId(params.id);
  const requestedDate = firstRouteParam(params.dueDate);
  const requestedTitle = firstRouteParam(params.title);
  const {
    reminders,
    vehicles,
    activeVehicleId,
    saveReminder,
    deleteReminder,
    loading,
    error,
    bootstrapped,
    entitlements,
  } = useDataStore();
  const activeVehicle = vehicles.find((vehicle) => vehicle.id === activeVehicleId);
  const existing = useMemo(
    () => reminders.find((reminder) => reminder.id === reminderId),
    [reminders, reminderId],
  );
  const [type, setType] = useState<ReminderType>(existing?.reminderType ?? 'periodic_maintenance');
  const [title, setTitle] = useState(
    existing?.title ?? requestedTitle ?? reminderTypeLabels.periodic_maintenance,
  );
  const [titleIsAutomatic, setTitleIsAutomatic] = useState(() =>
    requestedTitle
      ? false
      : existing
        ? isAutomaticReminderTitle(existing.title, existing.reminderType)
        : true,
  );
  const [date, setDate] = useState<string | null>(existing?.dueDate ?? requestedDate ?? null);
  const canCustomizeTime = entitlements.customReminderTime;
  const [time, setTime] = useState(() =>
    resolveReminderTimeForForm(existing?.dueTime, canCustomizeTime),
  );
  const [km, setKm] = useState(existing?.dueKilometer?.toString() ?? '');
  const [leadChoice, setLeadChoice] = useState('1');
  const [customLeadDays, setCustomLeadDays] = useState('2');
  const [initialLeadDays, setInitialLeadDays] = useState(DEFAULT_NOTIFICATION_LEAD_DAYS);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (!existing) return;
    let mounted = true;
    void getNotificationLeadDays(existing.id).then((days) => {
      if (!mounted) return;
      setInitialLeadDays(days);
      if ([7, 3, 1, 0].includes(days)) setLeadChoice(String(days));
      else {
        setLeadChoice('custom');
        setCustomLeadDays(String(days));
      }
    });
    return () => {
      mounted = false;
    };
  }, [existing]);
  const parsedCustomLead = customLeadDays ? parseDecimal(customLeadDays) : null;
  const selectedLeadDays =
    leadChoice === 'custom' && parsedCustomLead !== null ? parsedCustomLead : Number(leadChoice);
  const leadDaysValid =
    Number.isInteger(selectedLeadDays) && selectedLeadDays >= 0 && selectedLeadDays <= 365;
  const isDirty = haveFormValuesChanged(
    {
      type: existing?.reminderType ?? 'periodic_maintenance',
      title: existing?.title ?? requestedTitle ?? reminderTypeLabels.periodic_maintenance,
      date: existing?.dueDate ?? requestedDate ?? null,
      time: resolveReminderTimeForForm(existing?.dueTime, canCustomizeTime),
      km: existing?.dueKilometer?.toString() ?? '',
      notificationLeadDays: initialLeadDays,
    },
    { type, title, date, time, km, notificationLeadDays: selectedLeadDays },
  );
  const leaveWithoutPrompt = useUnsavedChangesGuard(isDirty);
  const routeState = resolveEntityRoute(reminderId, reminders, bootstrapped);
  const parsedKm = km ? parseDecimal(km) : null;
  const dateTimeValidation = validateReminderDateTime(date, time);
  const valid =
    title.trim().length > 0 &&
    (date !== null || parsedKm !== null) &&
    (parsedKm === null || parsedKm >= 0) &&
    (!date || leadDaysValid) &&
    dateTimeValidation.valid;
  const submit = async () => {
    setSubmitted(true);
    if (!valid) return;
    const success = await saveReminder(
      {
        title,
        reminderType: type,
        dueDate: date,
        dueTime: date ? time : null,
        dueKilometer: parsedKm === null ? null : Math.round(parsedKm),
        notificationLeadDays: normalizeLeadDays(selectedLeadDays),
      },
      existing?.id,
    );
    if (success) {
      const notificationNotice = useDataStore.getState().lastReminderNotice;
      leaveWithoutPrompt(() => {
        Alert.alert(
          'Hatırlatıcı kaydedildi',
          notificationNotice ??
            (date
              ? 'Bildirim izni varsa cihazınızda yerel bildirim planlandı.'
              : 'Kilometreye dayalı plan kaydedildi.'),
        );
        goBackOr('/(tabs)/reminders');
      });
    }
  };
  if (routeState === 'loading') return <LoadingScreen />;
  if (!activeVehicle) {
    return (
      <Screen style={styles.form}>
        <NoVehicleState onCreate={() => router.replace('/vehicle/edit')} />
      </Screen>
    );
  }
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
            setTitle((currentTitle) =>
              titleAfterReminderTypeChange(currentTitle, type, value, titleIsAutomatic),
            );
            setType(value);
          }}
          options={(Object.keys(reminderTypeLabels) as ReminderType[]).map((value) => ({
            value,
            label: reminderTypeLabels[value],
          }))}
        />
        <AppInput
          label="Başlık"
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            setTitleIsAutomatic(false);
          }}
          error={submitted && !title.trim() ? 'Başlık gereklidir.' : null}
        />
        <ReminderScheduleFields
          date={date}
          time={time}
          onDateChange={setDate}
          onTimeChange={setTime}
          canCustomizeTime={canCustomizeTime}
        />
        {date ? (
          <>
            <SelectField
              label="Beni ne zaman uyar?"
              value={leadChoice}
              onChange={setLeadChoice}
              options={NOTIFICATION_LEAD_OPTIONS.map((option) => ({ ...option }))}
            />
            {leadChoice === 'custom' ? (
              <AppInput
                label="Kaç gün önce"
                value={customLeadDays}
                onChangeText={setCustomLeadDays}
                keyboardType="number-pad"
                error={
                  submitted && !leadDaysValid ? '0 ile 365 arasında tam gün sayısı girin.' : null
                }
              />
            ) : null}
          </>
        ) : null}
        <AppInput
          label="Kilometre"
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
        {submitted && !dateTimeValidation.valid ? (
          <ErrorBanner message="Geçmiş bir tarih için hatırlatıcı oluşturamazsınız." />
        ) : null}
      </FormSection>
      <AppButton title="Hatırlatıcıyı kaydet" loading={loading} onPress={submit} />
      {existing ? (
        <AppButton
          title="Hatırlatıcıyı sil"
          variant="danger"
          onPress={() =>
            confirmAction('Hatırlatıcıyı sil', 'Plan ve yerel bildirim kaldırılacak.', async () => {
              if (await deleteReminder(existing.id)) {
                leaveWithoutPrompt(() => goBackOr('/(tabs)/reminders'));
              }
            })
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl },
});
