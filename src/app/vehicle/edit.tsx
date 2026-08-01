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
} from '@/shared/components/ui';
import { BodyType, FuelType } from '@/domain/entities';
import { bodyTypeLabels, fuelTypeLabels } from '@/shared/constants/labels';
import { parseDecimal } from '@/shared/utils/format';
import { spacing } from '@/shared/theme';
import { useDataStore } from '@/store/dataStore';
import { resolveEntityRoute } from '@/shared/utils/repositoryRules';

export default function VehicleEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { vehicles, saveVehicle, loading, error, bootstrapped } = useDataStore();
  const existing = useMemo(() => vehicles.find((vehicle) => vehicle.id === id), [vehicles, id]);
  const [brand, setBrand] = useState(existing?.brand ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [year, setYear] = useState(existing?.year?.toString() ?? '');
  const [plate, setPlate] = useState(existing?.plate ?? '');
  const [km, setKm] = useState(existing?.currentKm.toString() ?? '');
  const [fuelType, setFuelType] = useState<FuelType>(existing?.fuelType ?? 'gasoline');
  const [bodyType, setBodyType] = useState<BodyType>(existing?.bodyType ?? 'sedan_hatchback');
  const [color, setColor] = useState(existing?.color ?? '');
  const [submitted, setSubmitted] = useState(false);
  const routeState = resolveEntityRoute(id, vehicles, bootstrapped);
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
    validYear;
  const submit = async () => {
    setSubmitted(true);
    if (!valid || parsedKm === null) return;
    const success = await saveVehicle(
      {
        brand,
        model,
        year: parsedYear === null ? null : Math.round(parsedYear),
        plate: plate || null,
        currentKm: Math.round(parsedKm),
        fuelType,
        bodyType,
        color: color || null,
      },
      existing?.id,
    );
    if (success) router.replace('/(tabs)');
  };
  if (routeState === 'loading') return <LoadingScreen />;
  if (routeState === 'missing') {
    return (
      <Screen style={styles.form}>
        <ErrorBanner message="Bu araç silinmiş veya artık erişilebilir değil." />
        <AppButton title="Araç ekranına dön" onPress={() => router.replace('/(tabs)/vehicle')} />
      </Screen>
    );
  }
  return (
    <Screen style={styles.form}>
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
          label="Model yılı (isteğe bağlı)"
          value={year}
          onChangeText={setYear}
          keyboardType="number-pad"
          error={submitted && !validYear ? 'Geçerli bir model yılı girin.' : null}
        />
        <AppInput
          label="Plaka (isteğe bağlı)"
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
          options={(Object.keys(bodyTypeLabels) as BodyType[]).map((value) => ({
            value,
            label: bodyTypeLabels[value],
          }))}
        />
        <AppInput
          label="Araç rengi (isteğe bağlı)"
          value={color}
          onChangeText={setColor}
          autoCapitalize="words"
        />
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
