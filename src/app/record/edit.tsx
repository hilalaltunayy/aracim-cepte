import { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AppButton,
  AppInput,
  DateField,
  ErrorBanner,
  FormSection,
  LoadingScreen,
  NoVehicleState,
  Screen,
  SelectField,
  confirmAction,
} from '@/shared/components/ui';
import { RecordType } from '@/domain/entities';
import {
  expenseCategories,
  maintenanceCategories,
  recordTypeLabels,
} from '@/shared/constants/labels';
import { parseDecimal, todayDateOnly } from '@/shared/utils/format';
import { goBackOr } from '@/shared/utils/navigation';
import { useDataStore } from '@/store/dataStore';
import { spacing } from '@/shared/theme';
import {
  RECORD_MILEAGE_TOO_LOW_MESSAGE,
  isRecordMileageAllowed,
  resolveEntityRoute,
} from '@/shared/utils/repositoryRules';
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard';
import { haveFormValuesChanged } from '@/shared/utils/unsavedChanges';
import { createRequestId } from '@/shared/utils/requestId';
import { firstRouteParam, safeEntityId, safeRecordType } from '@/shared/utils/routeParams';

export default function RecordEditScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; type?: string | string[] }>();
  const routeId = safeEntityId(params.id);
  const invalidRouteId = Boolean(firstRouteParam(params.id) && !routeId);
  const routeType = safeRecordType(params.type);
  const {
    records,
    vehicles,
    activeVehicleId,
    saveRecord,
    deleteRecord,
    loading,
    error,
    bootstrapped,
  } = useDataStore();
  const existing = useMemo(
    () => records.find((record) => record.id === routeId),
    [records, routeId],
  );
  const [type, setType] = useState<RecordType>(existing?.recordType ?? routeType);
  const categories =
    type === 'maintenance'
      ? [...maintenanceCategories]
      : type === 'expense'
        ? [...expenseCategories]
        : ['Yakıt alımı'];
  const [category, setCategory] = useState(existing?.category ?? categories[0]);
  const [amount, setAmount] = useState(existing?.amount.toString() ?? '');
  const [liters, setLiters] = useState(existing?.liters?.toString() ?? '');
  const [km, setKm] = useState(existing?.kilometer?.toString() ?? '');
  const [date, setDate] = useState(existing?.recordDate ?? todayDateOnly());
  const [description, setDescription] = useState(existing?.description ?? '');
  const [submitted, setSubmitted] = useState(false);
  const mutationRequestId = useRef(createRequestId());
  const vehicle = vehicles.find((item) => item.id === activeVehicleId);
  const initialValues = {
    type: existing?.recordType ?? routeType,
    category: existing?.category ?? categories[0],
    amount: existing?.amount.toString() ?? '',
    liters: existing?.liters?.toString() ?? '',
    km: existing?.kilometer?.toString() ?? '',
    date: existing?.recordDate ?? todayDateOnly(),
    description: existing?.description ?? '',
  };
  const isDirty = haveFormValuesChanged(initialValues, {
    type,
    category,
    amount,
    liters,
    km,
    date,
    description,
  });
  const leaveWithoutPrompt = useUnsavedChangesGuard(isDirty);
  const routeState = invalidRouteId ? 'missing' : resolveEntityRoute(routeId, records, bootstrapped);
  const parsedAmount = parseDecimal(amount);
  const parsedLiters = parseDecimal(liters);
  const parsedKm = km ? parseDecimal(km) : null;
  const mileageAllowed = vehicle
    ? isRecordMileageAllowed(vehicle.currentKm, parsedKm, existing?.kilometer ?? null)
    : true;
  const valid =
    parsedAmount !== null &&
    parsedAmount > 0 &&
    Boolean(date) &&
    (type !== 'fuel' || parsedLiters === null || parsedLiters > 0) &&
    (parsedKm === null || parsedKm >= 0) &&
    mileageAllowed;
  const submit = async () => {
    setSubmitted(true);
    if (!valid || parsedAmount === null) return;
    const success = await saveRecord(
      {
        recordType: type,
        category,
        amount: parsedAmount,
        liters: type === 'fuel' ? parsedLiters : null,
        kilometer: parsedKm === null ? null : Math.round(parsedKm),
        recordDate: date,
        description: description || null,
      },
      existing?.id,
      mutationRequestId.current,
    );
    if (success) {
      leaveWithoutPrompt(() => {
        Alert.alert('Kaydedildi', 'Araç kaydınız başarıyla kaydedildi.');
        goBackOr();
      });
    }
  };
  const remove = () =>
    existing &&
    confirmAction('Kaydı sil', 'Bu kayıt kalıcı olarak silinecek.', async () => {
      if (await deleteRecord(existing.id)) leaveWithoutPrompt(() => goBackOr());
    });
  if (routeState === 'loading') return <LoadingScreen />;
  if (!vehicle) {
    return (
      <Screen style={styles.form}>
        <NoVehicleState onCreate={() => router.replace('/vehicle/edit')} />
      </Screen>
    );
  }
  if (routeState === 'missing') {
    return (
      <Screen style={styles.form}>
        <ErrorBanner message="Bu kayıt silinmiş veya artık erişilebilir değil." />
        <AppButton title="Geçmişe dön" onPress={() => goBackOr('/(tabs)/history')} />
      </Screen>
    );
  }
  return (
    <Screen style={styles.form}>
      {error ? <ErrorBanner message={error} /> : null}
      <FormSection title="Kayıt ayrıntıları">
        <SelectField
          label="Kayıt türü"
          value={type}
          onChange={(value) => {
            setType(value);
            setCategory(
              value === 'maintenance'
                ? maintenanceCategories[0]
                : value === 'expense'
                  ? expenseCategories[0]
                  : 'Yakıt alımı',
            );
          }}
          options={(Object.keys(recordTypeLabels) as RecordType[]).map((value) => ({
            value,
            label: recordTypeLabels[value],
          }))}
        />
        {type !== 'fuel' ? (
          <SelectField
            label={type === 'maintenance' ? 'Bakım kategorisi' : 'Masraf kategorisi'}
            value={category}
            onChange={setCategory}
            options={categories.map((value) => ({ value, label: value }))}
          />
        ) : null}
        <AppInput
          label="Tutar"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0,00"
          error={
            submitted && (!parsedAmount || parsedAmount <= 0)
              ? 'Tutar sıfırdan büyük olmalı.'
              : null
          }
        />
        {type === 'fuel' ? (
          <AppInput
            label="Litre"
            value={liters}
            onChangeText={setLiters}
            keyboardType="decimal-pad"
            placeholder="0,00"
            error={
              submitted && parsedLiters !== null && parsedLiters <= 0
                ? 'Litre sıfırdan büyük olmalı.'
                : null
            }
          />
        ) : null}
        <AppInput
          label="Kilometre"
          value={km}
          onChangeText={setKm}
          keyboardType="number-pad"
          error={
            submitted && parsedKm !== null && parsedKm < 0
              ? 'Kilometre negatif olamaz.'
              : submitted && !mileageAllowed
                ? RECORD_MILEAGE_TOO_LOW_MESSAGE
                : null
          }
        />
        <DateField label="Tarih" value={date} onChange={(value) => value && setDate(value)} />
        <AppInput label="Açıklama" value={description} onChangeText={setDescription} multiline />
      </FormSection>
      <AppButton title="Kaydet" loading={loading} onPress={submit} />
      {existing ? <AppButton title="Kaydı sil" variant="danger" onPress={remove} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.xl } });
