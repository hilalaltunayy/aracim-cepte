import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AppButton,
  AppInput,
  ErrorBanner,
  FormSection,
  LoadingScreen,
  Screen,
  SelectField,
  confirmChoice,
} from '@/shared/components/ui';
import { AutomotiveBackdrop } from '@/shared/components/AutomotiveBackdrop';
import { BodyType, FuelType, VehicleColorId } from '@/domain/entities';
import { fuelTypeLabels } from '@/shared/constants/labels';
import { parseDecimal } from '@/shared/utils/format';
import { spacing } from '@/shared/theme';
import { useDataStore } from '@/store/dataStore';
import {
  VEHICLE_MILEAGE_CORRECTION_MESSAGE,
  requiresVehicleMileageCorrection,
  resolveEntityRoute,
} from '@/shared/utils/repositoryRules';
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard';
import { haveFormValuesChanged } from '@/shared/utils/unsavedChanges';
import { getVehicleBodyTypeOptions } from '@/features/vehicles/config/bodyTypes';
import {
  resolveLegacyVehicleColor,
  VEHICLE_COLORS,
} from '@/features/vehicles/config/vehicleColors';
import {
  getVehicleColorPersistence,
  getVehicleTaxonomyFormState,
} from '@/features/vehicles/domain/vehicleProfile';
import { getVehicleCapacity, getVehicleLimitMessage } from '@/features/vehicles/domain/multiVehicle';

export default function VehicleEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { vehicles, saveVehicle, loading, error, bootstrapped, entitlements } = useDataStore();
  const existing = useMemo(() => vehicles.find((vehicle) => vehicle.id === id), [vehicles, id]);
  const [brand, setBrand] = useState(existing?.brand ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [year, setYear] = useState(existing?.year?.toString() ?? '');
  const [plate, setPlate] = useState(existing?.plate ?? '');
  const [km, setKm] = useState(existing?.currentKm.toString() ?? '');
  const [fuelType, setFuelType] = useState<FuelType>(existing?.fuelType ?? 'gasoline');
  const initialTaxonomy = getVehicleTaxonomyFormState(existing);
  const [bodyType, setBodyType] = useState<BodyType | ''>(initialTaxonomy.bodyType);
  const [colorId, setColorId] = useState<VehicleColorId | ''>(initialTaxonomy.colorId);
  const [submitted, setSubmitted] = useState(false);
  const initialValues = {
    brand: existing?.brand ?? '',
    model: existing?.model ?? '',
    year: existing?.year?.toString() ?? '',
    plate: existing?.plate ?? '',
    km: existing?.currentKm.toString() ?? '',
    fuelType: existing?.fuelType ?? 'gasoline',
    ...initialTaxonomy,
  };
  const isDirty = haveFormValuesChanged(initialValues, {
    brand,
    model,
    year,
    plate,
    km,
    fuelType,
    bodyType,
    colorId,
  });
  const leaveWithoutPrompt = useUnsavedChangesGuard(isDirty);
  const routeState = resolveEntityRoute(id, vehicles, bootstrapped);
  const capacity = getVehicleCapacity(vehicles.length, entitlements);
  const parsedKm = parseDecimal(km);
  const parsedYear = year ? parseDecimal(year) : null;
  const validYear =
    parsedYear === null ||
    (Number.isInteger(parsedYear) &&
      parsedYear >= 1886 &&
      parsedYear <= new Date().getFullYear() + 1);
  const valid =
    brand.trim().length > 0 &&
    model.trim().length > 0 &&
    parsedKm !== null &&
    parsedKm >= 0 &&
    validYear &&
    bodyType !== '' &&
    (colorId !== '' || Boolean(existing?.color));
  const save = async (allowMileageDecrease: boolean) => {
    if (parsedKm === null) return;
    const success = await saveVehicle(
      {
        brand,
        model,
        year: parsedYear === null ? null : Math.round(parsedYear),
        plate: plate || null,
        currentKm: Math.round(parsedKm),
        fuelType,
        bodyType: bodyType as BodyType,
        ...getVehicleColorPersistence(colorId, existing?.color),
      },
      existing?.id,
      { allowMileageDecrease },
    );
    if (success) leaveWithoutPrompt(() => router.replace('/(tabs)'));
  };
  const submit = async () => {
    setSubmitted(true);
    if (!valid || parsedKm === null) return;
    if (existing && requiresVehicleMileageCorrection(existing.currentKm, parsedKm)) {
      confirmChoice('Kilometre düzeltmesi', VEHICLE_MILEAGE_CORRECTION_MESSAGE, 'Onayla', () => {
        void save(true);
      });
      return;
    }
    await save(false);
  };
  if (routeState === 'loading') return <LoadingScreen />;
  if (routeState === 'missing') {
    return (
      <Screen style={styles.form} backdrop={<AutomotiveBackdrop />}>
        <ErrorBanner message="Bu araç silinmiş veya artık erişilebilir değil." />
        <AppButton title="Araç ekranına dön" onPress={() => router.replace('/(tabs)/vehicle')} />
      </Screen>
    );
  }
  if (routeState === 'create' && !capacity.canAdd) {
    return (
      <Screen style={styles.form} backdrop={<AutomotiveBackdrop />}>
        <ErrorBanner message={getVehicleLimitMessage(capacity)} />
        <AppButton title="Araç ekranına dön" onPress={() => router.replace('/(tabs)/vehicle')} />
      </Screen>
    );
  }
  return (
    <Screen style={styles.form} backdrop={<AutomotiveBackdrop />}>
      {error ? <ErrorBanner message={error} /> : null}
      <FormSection
        title="Temel bilgiler"
        description="Aracınızı listelerde kolayca ayırt etmenizi sağlayan bilgiler."
      >
        <AppInput
          label="Marka"
          value={brand}
          onChangeText={setBrand}
          autoCapitalize="words"
          error={submitted && !brand.trim() ? 'Marka gereklidir.' : null}
        />
        <AppInput
          label="Model"
          value={model}
          onChangeText={setModel}
          autoCapitalize="words"
          error={submitted && !model.trim() ? 'Model gereklidir.' : null}
        />
        <AppInput
          label="Model yılı"
          value={year}
          onChangeText={setYear}
          keyboardType="number-pad"
          error={submitted && !validYear ? 'Geçerli bir model yılı girin.' : null}
        />
        <AppInput
          label="Plaka"
          value={plate}
          onChangeText={(value) => setPlate(value.toLocaleUpperCase('tr-TR'))}
          autoCapitalize="characters"
          placeholder="34 ABC 123"
        />
      </FormSection>
      <FormSection
        title="Teknik bilgiler"
        description="Hatırlatıcılar ve maliyet hesapları bu bilgilerden yararlanır."
      >
        <AppInput
          label="Güncel kilometre"
          value={km}
          onChangeText={setKm}
          keyboardType="number-pad"
          error={
            submitted && (parsedKm === null || parsedKm < 0) ? 'Geçerli bir kilometre girin.' : null
          }
        />
        <SelectField
          label="Yakıt türü"
          value={fuelType}
          onChange={setFuelType}
          options={(Object.keys(fuelTypeLabels) as FuelType[]).map((value) => ({
            value,
            label: fuelTypeLabels[value],
          }))}
        />
        <SelectField
          label="Gövde tipi"
          value={bodyType}
          onChange={setBodyType}
          options={getVehicleBodyTypeOptions(existing?.bodyType)}
        />
        <SelectField
          label="Araç rengi"
          value={colorId}
          onChange={setColorId}
          options={VEHICLE_COLORS.map(({ id: value, label, hexFallback: swatchColor }) => ({
            value,
            label,
            swatchColor,
          }))}
        />
        {existing?.color && !resolveLegacyVehicleColor(existing.color) && !colorId ? (
          <ErrorBanner
            message={`Kayıtlı renk “${existing.color}” katalogda bulunmuyor. Değiştirmek istemiyorsanız mevcut değer korunur.`}
          />
        ) : null}
        {submitted && !bodyType ? <ErrorBanner message="Gövde tipi seçin." /> : null}
        {submitted && !colorId && !existing?.color ? (
          <ErrorBanner message="Araç rengi seçin." />
        ) : null}
      </FormSection>
      <AppButton
        title={existing ? 'Değişiklikleri kaydet' : 'Aracımı kaydet'}
        loading={loading}
        onPress={submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.xl } });
