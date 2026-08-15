import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import type { FuelStationId, FuelType } from '@/domain/entities';
import type { FuelEntryState } from '@/features/fuel/domain/fuelEntry';
import { AppButton, ErrorBanner, SelectField } from '@/shared/components/ui';
import { spacing, useAppTheme } from '@/shared/theme';
import { EPDK_PROVINCES, toReferenceFuelType } from '../config/fuelPriceMappings';
import type { FuelPriceReferenceAvailability } from '../domain/fuelPrice';
import { applyFuelPriceSuggestion, getFuelPriceSuggestion } from '../domain/fuelPriceReference';
import {
  disabledFuelPriceReferenceLookup,
  fuelPriceReferenceAvailability,
  type FuelPriceReferenceLookup,
} from '../services/FuelPriceReferenceLookup';
import { FuelPriceReferenceCard } from './FuelPriceReferenceCard';

type ProvinceId = (typeof EPDK_PROVINCES)[number]['id'] | '';

/**
 * Explicit-only Smart Fuel seam. With the default legal gate disabled it returns no UI and no
 * network request. Once an approved lookup is supplied, the user selects a province and asks for
 * one reference; the result remains a suggestion until they tap "Referans fiyatı kullan".
 */
export function FuelPriceReferenceSection({
  vehicleFuelType,
  stationBrand,
  fuelEntry,
  onFuelEntryChange,
  disabled,
  availability = fuelPriceReferenceAvailability,
  lookup = disabledFuelPriceReferenceLookup,
}: {
  vehicleFuelType: FuelType;
  stationBrand: FuelStationId | '';
  fuelEntry: FuelEntryState;
  onFuelEntryChange: (next: FuelEntryState) => void;
  disabled?: boolean;
  availability?: FuelPriceReferenceAvailability;
  lookup?: FuelPriceReferenceLookup;
}) {
  const { colors } = useAppTheme();
  const referenceFuelType = toReferenceFuelType(vehicleFuelType);
  const [provinceId, setProvinceId] = useState<ProvinceId>('');
  const [reference, setReference] =
    useState<Awaited<ReturnType<FuelPriceReferenceLookup['lookup']>>>(null);
  const [noResult, setNoResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const province = useMemo(
    () => EPDK_PROVINCES.find((item) => item.id === provinceId) ?? null,
    [provinceId],
  );

  if (!availability.enabled || !referenceFuelType) return null;
  const suggestion = getFuelPriceSuggestion(fuelEntry, reference);
  const loadReference = async () => {
    if (!province || loading || disabled) return;
    setLoading(true);
    setError(null);
    try {
      const next = await lookup.lookup({
        province,
        fuelType: referenceFuelType,
        brand: stationBrand || null,
      });
      setReference(next);
      setNoResult(next === null);
    } catch {
      setReference(null);
      setNoResult(false);
      setError('EPDK referansı şu anda alınamadı. Yakıt kaydınıza elle devam edebilirsiniz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
        Resmi referans veriye göre tahmini litre fiyatı
      </Text>
      <SelectField<ProvinceId>
        label="İl"
        value={provinceId}
        onChange={(next) => {
          setProvinceId(next);
          setReference(null);
          setNoResult(false);
          setError(null);
        }}
        options={[
          { value: '', label: 'İl seçin' },
          ...EPDK_PROVINCES.map((item) => ({ value: item.id, label: item.name })),
        ]}
      />
      <AppButton
        title="EPDK referansını getir"
        variant="secondary"
        compact
        loading={loading}
        disabled={!province || disabled}
        onPress={() => void loadReference()}
      />
      {error ? <ErrorBanner message={error} /> : null}
      {noResult ? (
        <Text style={{ color: colors.textSecondary }}>
          Bu il ve yakıt türü için EPDK referansı bulunamadı. Yakıt kaydınıza elle devam
          edebilirsiniz.
        </Text>
      ) : null}
      <FuelPriceReferenceCard
        suggestion={suggestion}
        disabled={disabled || loading}
        onApply={() => onFuelEntryChange(applyFuelPriceSuggestion(fuelEntry, suggestion))}
      />
    </>
  );
}
