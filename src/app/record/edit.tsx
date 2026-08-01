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
import { resolveEntityRoute } from '@/shared/utils/repositoryRules';

export default function RecordEditScreen() {
  const params = useLocalSearchParams<{ id?: string; type?: RecordType }>();
  const { records, saveRecord, deleteRecord, loading, error, bootstrapped } = useDataStore();
  const existing = useMemo(
    () => records.find((record) => record.id === params.id),
    [records, params.id],
  );
  const [type, setType] = useState<RecordType>(existing?.recordType ?? params.type ?? 'fuel');
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
  const routeState = resolveEntityRoute(params.id, records, bootstrapped);
  const parsedAmount = parseDecimal(amount);
  const parsedLiters = parseDecimal(liters);
  const parsedKm = km ? parseDecimal(km) : null;
  const valid =
    parsedAmount !== null &&
    parsedAmount > 0 &&
    Boolean(date) &&
    (type !== 'fuel' || (parsedLiters !== null && parsedLiters > 0)) &&
    (parsedKm === null || parsedKm >= 0);
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
    );
    if (success) {
      Alert.alert('Kaydedildi', 'Araç kaydınız başarıyla kaydedildi.');
      goBackOr();
    }
  };
  const remove = () =>
    existing &&
    confirmAction('Kaydı sil', 'Bu kayıt kalıcı olarak silinecek.', async () => {
      if (await deleteRecord(existing.id)) goBackOr();
    });
  if (routeState === 'loading') return <LoadingScreen />;
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
              submitted && (!parsedLiters || parsedLiters <= 0)
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
            submitted && parsedKm !== null && parsedKm < 0 ? 'Kilometre negatif olamaz.' : null
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
