import { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
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
import { spacing, useAppTheme } from '@/shared/theme';
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
import {
  createFuelEntryState,
  getFuelEntryValues,
  updateFuelEntry,
  validateFuelEntry,
} from '@/features/fuel/domain/fuelEntry';
import { FUEL_STATIONS, type FuelStationId } from '@/features/fuel/config/fuelStations';
import { FuelReceiptOcrSection } from '@/features/fuel/ocr/FuelReceiptOcrSection';
import { MaintenanceDetailsSection } from '@/features/maintenance/components/MaintenanceDetailsSection';
import {
  hasMaintenanceDetails,
  resolveMaintenanceTotal,
  validateMaintenanceDetails,
  type MaintenanceDetailsFormValues,
} from '@/features/maintenance/domain/maintenanceDetails';
import { isPendingAttachment, type AttachmentListItem } from '@/features/attachments/domain/types';
import {
  deleteAttachment,
  openAttachment,
  uploadParentAttachment,
} from '@/data/storage/attachments';
import { getFriendlyError } from '@/shared/utils/errors';

export default function RecordEditScreen() {
  const { colors } = useAppTheme();
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
  const [fuelEntry, setFuelEntry] = useState(() =>
    createFuelEntryState({
      total: existing?.amount,
      liters: existing?.liters,
      pricePerLiter: existing?.pricePerLiter,
    }),
  );
  const [stationBrand, setStationBrand] = useState<FuelStationId | ''>(
    existing?.stationBrand ?? '',
  );
  const [km, setKm] = useState(existing?.kilometer?.toString() ?? '');
  const [date, setDate] = useState(existing?.recordDate ?? todayDateOnly());
  const [description, setDescription] = useState(existing?.description ?? '');
  const [maintenanceDetails, setMaintenanceDetails] = useState<MaintenanceDetailsFormValues>({
    serviceType: existing?.serviceType ?? '',
    serviceName: existing?.serviceName ?? '',
    partsCost: existing?.partsCost?.toString() ?? '',
    laborCost: existing?.laborCost?.toString() ?? '',
    invoiceNumber: existing?.invoiceNumber ?? '',
    notes: existing?.description ?? '',
  });
  const [attachments, setAttachments] = useState<AttachmentListItem[]>(existing?.attachments ?? []);
  const [maintenanceItemTypes, setMaintenanceItemTypes] = useState(
    () => existing?.maintenanceItems?.map((item) => item.itemType) ?? [],
  );
  const [maintenancePackageKey, setMaintenancePackageKey] =
    useState<MaintenancePackageKey>('manual');
  const [maintenancePackageTitle, setMaintenancePackageTitle] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const mutationRequestId = useRef(createRequestId());
  const generatedRecordId = useRef(createRequestId()).current;
  const recordId = existing?.id ?? routeId ?? generatedRecordId;
  const vehicle = vehicles.find((item) => item.id === activeVehicleId);
  const maintenanceValidation = validateMaintenanceDetails(maintenanceDetails);
  const [detailsExpanded, setDetailsExpanded] = useState(() =>
    hasMaintenanceDetails(maintenanceValidation.values, attachments.length),
  );
  const initialValues = {
    type: existing?.recordType ?? routeType,
    category: existing?.category ?? categories[0],
    amount: existing?.amount.toString() ?? '',
    liters: existing?.liters?.toString() ?? '',
    pricePerLiter: existing?.pricePerLiter?.toString() ?? '',
    stationBrand: existing?.stationBrand ?? '',
    km: existing?.kilometer?.toString() ?? '',
    date: existing?.recordDate ?? todayDateOnly(),
    description: existing?.description ?? '',
    maintenanceItems: existing?.maintenanceItems?.map((item) => item.itemType).join('|') ?? '',
    maintenanceServiceType: existing?.serviceType ?? '',
    maintenanceServiceName: existing?.serviceName ?? '',
    maintenancePartsCost: existing?.partsCost?.toString() ?? '',
    maintenanceLaborCost: existing?.laborCost?.toString() ?? '',
    maintenanceInvoiceNumber: existing?.invoiceNumber ?? '',
    maintenanceAttachments: (existing?.attachments ?? []).map((item) => item.storagePath).join('|'),
  };
  const isDirty = haveFormValuesChanged(initialValues, {
    type,
    category,
    amount: type === 'fuel' ? fuelEntry.total : amount,
    liters: type === 'fuel' ? fuelEntry.liters : '',
    pricePerLiter: type === 'fuel' ? fuelEntry.pricePerLiter : '',
    stationBrand: type === 'fuel' ? stationBrand : '',
    km,
    date,
    description: type === 'maintenance' ? maintenanceDetails.notes : description,
    maintenanceItems: maintenanceItemTypes.join('|'),
    maintenanceServiceType: type === 'maintenance' ? maintenanceDetails.serviceType : '',
    maintenanceServiceName: type === 'maintenance' ? maintenanceDetails.serviceName : '',
    maintenancePartsCost: type === 'maintenance' ? maintenanceDetails.partsCost : '',
    maintenanceLaborCost: type === 'maintenance' ? maintenanceDetails.laborCost : '',
    maintenanceInvoiceNumber: type === 'maintenance' ? maintenanceDetails.invoiceNumber : '',
    maintenanceAttachments:
      type === 'maintenance'
        ? attachments
            .map((item) => (isPendingAttachment(item) ? item.uri : item.storagePath))
            .join('|')
        : '',
  });
  const leaveWithoutPrompt = useUnsavedChangesGuard(isDirty);
  const routeState = invalidRouteId
    ? 'missing'
    : resolveEntityRoute(routeId, records, bootstrapped);
  const fuelValues = getFuelEntryValues(fuelEntry);
  const fuelValidation = validateFuelEntry(fuelEntry);
  const maintenanceTotal = resolveMaintenanceTotal(amount, maintenanceValidation.values);
  const parsedAmount =
    type === 'fuel'
      ? fuelValues.total
      : type === 'maintenance'
        ? maintenanceTotal.value
        : parseDecimal(amount);
  const parsedLiters = type === 'fuel' ? fuelValues.liters : null;
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
    (type !== 'fuel' || fuelValidation.valid) &&
    (type !== 'maintenance' || maintenanceValidation.valid) &&
    mileageEvaluation.level !== 'blockingError';
  const persistRecord = async () => {
    if (parsedAmount === null || !vehicle) return;
    setLocalError(null);
    setSubmitting(true);
    const uploadedPaths: string[] = [];
    const maintenanceTitle =
      type === 'maintenance'
        ? createMaintenanceTitle(maintenanceItemTypes, maintenancePackageTitle, category)
        : category;
    try {
      const attachmentPaths: string[] = [];
      if (type === 'maintenance') {
        for (const attachment of attachments) {
          if (!isPendingAttachment(attachment)) {
            attachmentPaths.push(attachment.storagePath);
            continue;
          }
          const uploaded = await uploadParentAttachment(
            vehicle.id,
            'maintenance_record',
            recordId,
            attachment,
          );
          uploadedPaths.push(uploaded.path);
          attachmentPaths.push(uploaded.path);
        }
      }
      const success = await saveRecord(
        {
          recordType: type,
          category: maintenanceTitle,
          amount: parsedAmount,
          liters: type === 'fuel' ? parsedLiters : null,
          pricePerLiter: type === 'fuel' ? fuelValues.pricePerLiter : null,
          stationBrand: type === 'fuel' && stationBrand ? stationBrand : null,
          kilometer: eventMileage === null ? null : Math.round(eventMileage),
          recordDate: date,
          description:
            type === 'maintenance' ? maintenanceValidation.values.notes : description || null,
          maintenanceItemTypes: type === 'maintenance' ? [...maintenanceItemTypes] : undefined,
          serviceType:
            type === 'maintenance' ? maintenanceValidation.values.serviceType : undefined,
          serviceName:
            type === 'maintenance' ? maintenanceValidation.values.serviceName : undefined,
          partsCost: type === 'maintenance' ? maintenanceValidation.values.partsCost : undefined,
          laborCost: type === 'maintenance' ? maintenanceValidation.values.laborCost : undefined,
          invoiceNumber:
            type === 'maintenance' ? maintenanceValidation.values.invoiceNumber : undefined,
          attachmentPaths: type === 'maintenance' ? attachmentPaths : undefined,
          source: 'manual',
        },
        type === 'maintenance' ? recordId : existing?.id,
        mutationRequestId.current,
      );
      if (!success) {
        for (const path of uploadedPaths) {
          try {
            await deleteAttachment(path);
          } catch {
            // Reconciliation safely retries cleanup without exposing provider details.
          }
        }
        return;
      }
      uploadedPaths.length = 0;
      leaveWithoutPrompt(() => {
        Alert.alert('Kaydedildi', 'Araç kaydınız başarıyla kaydedildi.');
        goBackOr();
      });
    } catch (caught) {
      for (const path of uploadedPaths) {
        try {
          await deleteAttachment(path);
        } catch {
          // Preserve the original safe error; cleanup reconciliation remains available.
        }
      }
      setLocalError(getFriendlyError(caught));
    } finally {
      setSubmitting(false);
    }
  };
  const submit = async () => {
    setSubmitted(true);
    if (!valid || parsedAmount === null) {
      if (type === 'maintenance' && !maintenanceValidation.valid) setDetailsExpanded(true);
      return;
    }
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
      {error || localError ? <ErrorBanner message={localError ?? error ?? ''} /> : null}
      <FormSection title="Kayıt ayrıntıları">
        <SelectField
          label="Kayıt türü"
          value={type}
          onChange={(value) => {
            if (value === 'fuel' && type !== 'fuel') {
              setFuelEntry(updateFuelEntry(createFuelEntryState(), 'total', amount));
            } else if (type === 'fuel' && value !== 'fuel') {
              setAmount(fuelEntry.total);
            }
            setType(value);
            setMaintenanceItemTypes([]);
            setMaintenancePackageKey('manual');
            setMaintenancePackageTitle(null);
            if (value === 'maintenance') {
              setMaintenanceDetails((current) => ({ ...current, notes: description }));
            }
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
          label={type === 'fuel' || type === 'maintenance' ? 'Toplam tutar' : 'Tutar'}
          value={type === 'fuel' ? fuelEntry.total : amount}
          onChangeText={(value) =>
            type === 'fuel'
              ? setFuelEntry((current) => updateFuelEntry(current, 'total', value))
              : setAmount(value)
          }
          keyboardType="decimal-pad"
          placeholder="0,00"
          error={
            submitted && (!parsedAmount || parsedAmount <= 0)
              ? 'Tutar sıfırdan büyük olmalı.'
              : null
          }
        />
        {type === 'fuel' && fuelEntry.calculatedField === 'total' ? (
          <Text style={[styles.calculated, { color: colors.muted }]}>Otomatik hesaplandı</Text>
        ) : null}
        {type === 'maintenance' && maintenanceTotal.source === 'breakdown' ? (
          <Text style={[styles.calculated, { color: colors.muted }]}>Parça ve işçilik toplamı</Text>
        ) : null}
        {type === 'fuel' ? (
          <>
            <AppInput
              label="Litre"
              value={fuelEntry.liters}
              onChangeText={(value) =>
                setFuelEntry((current) => updateFuelEntry(current, 'liters', value))
              }
              keyboardType="decimal-pad"
              placeholder="Bilinmiyor"
              error={
                submitted && fuelValidation.errors.liters ? 'Litre sıfırdan büyük olmalı.' : null
              }
            />
            {fuelEntry.calculatedField === 'liters' ? (
              <Text style={[styles.calculated, { color: colors.muted }]}>Otomatik hesaplandı</Text>
            ) : null}
            <AppInput
              label="Litre fiyatı"
              value={fuelEntry.pricePerLiter}
              onChangeText={(value) =>
                setFuelEntry((current) => updateFuelEntry(current, 'pricePerLiter', value))
              }
              keyboardType="decimal-pad"
              placeholder="Bilinmiyor"
              error={
                submitted && fuelValidation.errors.pricePerLiter
                  ? 'Litre fiyatı sıfırdan büyük olmalı.'
                  : null
              }
            />
            {fuelEntry.calculatedField === 'pricePerLiter' ? (
              <Text style={[styles.calculated, { color: colors.muted }]}>Otomatik hesaplandı</Text>
            ) : null}
            <SelectField<FuelStationId | ''>
              label="Yakıt istasyonu"
              value={stationBrand}
              onChange={setStationBrand}
              options={[
                { value: '', label: 'İstasyon seçilmedi' },
                ...FUEL_STATIONS.map(({ id, label }) => ({ value: id, label })),
              ]}
            />
            <FuelReceiptOcrSection
              fuelEntry={fuelEntry}
              stationBrand={stationBrand}
              recordDate={date}
              disabled={loading || submitting}
              onApply={(patch) => {
                setFuelEntry((current) => {
                  let next = current;
                  if (patch.total !== undefined) next = updateFuelEntry(next, 'total', patch.total);
                  if (patch.liters !== undefined) next = updateFuelEntry(next, 'liters', patch.liters);
                  if (patch.pricePerLiter !== undefined) {
                    next = updateFuelEntry(next, 'pricePerLiter', patch.pricePerLiter);
                  }
                  return next;
                });
                if (patch.stationBrand !== undefined) setStationBrand(patch.stationBrand);
                if (patch.recordDate !== undefined) setDate(patch.recordDate);
              }}
            />
          </>
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
        {type !== 'maintenance' ? (
          <AppInput label="Açıklama" value={description} onChangeText={setDescription} multiline />
        ) : null}
      </FormSection>
      {type === 'maintenance' ? (
        <MaintenanceDetailsSection
          expanded={detailsExpanded}
          values={maintenanceDetails}
          errors={submitted ? maintenanceValidation.errors : {}}
          attachments={attachments}
          disabled={loading || submitting}
          onToggle={() => setDetailsExpanded((current) => !current)}
          onChange={(key, value) => {
            setMaintenanceDetails((current) => ({ ...current, [key]: value }));
            if (key === 'notes') setDescription(value);
          }}
          onAttachmentsChange={setAttachments}
          onOpenAttachment={(attachment) => openAttachment(attachment.storagePath)}
        />
      ) : null}
      <AppButton title="Kaydet" loading={loading || submitting} onPress={submit} />
      {existing ? <AppButton title="Kaydı sil" variant="danger" onPress={remove} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl },
  calculated: { fontSize: 12, lineHeight: 16, marginTop: -spacing.sm },
});
