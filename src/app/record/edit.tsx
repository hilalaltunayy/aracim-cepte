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
  confirmChoice,
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
import { evaluateMileageTimeline } from '@/shared/utils/mileageTimeline';
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard';
import { haveFormValuesChanged } from '@/shared/utils/unsavedChanges';
import { createRequestId } from '@/shared/utils/requestId';
import { firstRouteParam, safeEntityId, safeRecordType } from '@/shared/utils/routeParams';
import {
  MaintenanceOperationsField,
  type MaintenancePackageKey,
} from '@/features/maintenance/components/MaintenanceOperationsField';
import { createMaintenanceTitle } from '@/features/maintenance/domain/maintenancePackages';

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
    maintenanceTemplates,
    saveMaintenanceTemplate,
    deleteMaintenanceTemplate,
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
  const [maintenanceItemTypes, setMaintenanceItemTypes] = useState(
    () => existing?.maintenanceItems?.map((item) => item.itemType) ?? [],
  );
  const [maintenancePackageKey, setMaintenancePackageKey] =
    useState<MaintenancePackageKey>('manual');
  const [maintenancePackageTitle, setMaintenancePackageTitle] = useState<string | null>(null);
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
    maintenanceItems: existing?.maintenanceItems?.map((item) => item.itemType).join('|') ?? '',
  };
  const isDirty = haveFormValuesChanged(initialValues, {
    type,
    category,
    amount,
    liters,
    km,
    date,
    description,
    maintenanceItems: maintenanceItemTypes.join('|'),
  });
  const leaveWithoutPrompt = useUnsavedChangesGuard(isDirty);
  const routeState = invalidRouteId ? 'missing' : resolveEntityRoute(routeId, records, bootstrapped);
  const parsedAmount = parseDecimal(amount);
  const parsedLiters = parseDecimal(liters);
  const hasEnteredMileage = km.trim().length > 0;
  const parsedKm = hasEnteredMileage ? parseDecimal(km) : null;
  const eventMileage = hasEnteredMileage ? (parsedKm ?? Number.NaN) : null;
  const mileageEvaluation = evaluateMileageTimeline({
    currentMileage: vehicle?.currentKm ?? 0,
    targetRecordId: existing?.id,
    targetRecordDate: date,
    targetMileage: eventMileage,
    records,
  });
  const valid =
    parsedAmount !== null &&
    parsedAmount > 0 &&
    Boolean(date) &&
    (type !== 'fuel' || parsedLiters === null || parsedLiters > 0) &&
    mileageEvaluation.level !== 'blockingError';
  const persistRecord = async () => {
    if (parsedAmount === null) return;
    const maintenanceTitle =
      type === 'maintenance'
        ? createMaintenanceTitle(maintenanceItemTypes, maintenancePackageTitle, category)
        : category;
    const success = await saveRecord(
      {
        recordType: type,
        category: maintenanceTitle,
        amount: parsedAmount,
        liters: type === 'fuel' ? parsedLiters : null,
        kilometer: eventMileage === null ? null : Math.round(eventMileage),
        recordDate: date,
        description: description || null,
        maintenanceItemTypes: type === 'maintenance' ? [...maintenanceItemTypes] : undefined,
        source: 'manual',
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
  const submit = async () => {
    setSubmitted(true);
    if (!valid || parsedAmount === null) return;
    if (mileageEvaluation.level === 'warning') {
      confirmChoice(
        'Kilometre sıralaması',
        'Bu kilometre, diğer kayıtlarınızın tarih ve kilometre sıralamasıyla uyuşmuyor.',
        'Yine de kaydet',
        () => void persistRecord(),
        false,
        'Düzenle',
      );
      return;
    }
    await persistRecord();
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
            setMaintenanceItemTypes([]);
            setMaintenancePackageKey('manual');
            setMaintenancePackageTitle(null);
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
        {type === 'maintenance' ? (
          <MaintenanceOperationsField
            selectedItemIds={maintenanceItemTypes}
            selectedPackageKey={maintenancePackageKey}
            templates={maintenanceTemplates ?? []}
            loading={loading}
            onSelectionChange={(itemIds) => {
              setMaintenanceItemTypes(itemIds);
              if (maintenancePackageKey === 'manual') {
                setCategory(createMaintenanceTitle(itemIds, null, category));
              }
            }}
            onPackageChange={(key, title, itemIds) => {
              setMaintenancePackageKey(key);
              setMaintenancePackageTitle(title);
              setMaintenanceItemTypes([...itemIds]);
              if (title || itemIds.length) {
                setCategory(createMaintenanceTitle(itemIds, title, category));
              }
            }}
            onCreateTemplate={(title, itemIds) =>
              saveMaintenanceTemplate({ title, itemDefinitions: [...itemIds] })
            }
            onDeleteTemplate={async (id) => {
              const success = await deleteMaintenanceTemplate(id);
              if (success) {
                setMaintenancePackageKey('manual');
                setMaintenancePackageTitle(null);
              }
              return success;
            }}
          />
        ) : type === 'expense' ? (
          <SelectField
            label="Masraf kategorisi"
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
          placeholder="Kilometreyi bilmiyorum"
          error={
            submitted && mileageEvaluation.blockingCode === 'negative_mileage'
              ? 'Kilometre negatif olamaz.'
              : submitted && mileageEvaluation.blockingCode === 'invalid_mileage'
                ? 'Geçerli bir kilometre girin.'
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
