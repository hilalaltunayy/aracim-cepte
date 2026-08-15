import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Card, AppButton } from '@/shared/components/ui';
import { formatCompactDate, formatNumber } from '@/shared/utils/format';
import {
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import type { FuelPriceSuggestion } from '../domain/fuelPriceReference';

const freshnessLabels = {
  current: 'Güncel referans',
  recent: 'Yakın tarihli referans',
  stale: 'Eski referans',
  unknown: 'Tarihi belirsiz referans',
} as const;

export function FuelPriceReferenceCard({
  suggestion,
  disabled,
  onApply,
}: {
  suggestion: FuelPriceSuggestion | null;
  disabled?: boolean;
  onApply: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  if (!suggestion) return null;
  const { reference } = suggestion;
  return (
    <Card style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.icon} accessible={false}>
          <Ionicons name="information-circle-outline" size={19} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.title}>EPDK referans fiyatı</Text>
          <Text style={styles.meta}>
            {freshnessLabels[reference.freshness]} · {formatCompactDate(reference.effectiveDate)}
          </Text>
        </View>
      </View>
      <Text style={styles.price}>{formatNumber(reference.referencePricePerLitre, 2)} TL/L</Text>
      {suggestion.estimatedLiters !== null ? (
        <Text style={styles.estimate}>
          Bu tutara göre tahmini {formatNumber(suggestion.estimatedLiters, 1)} L
        </Text>
      ) : null}
      <Text style={styles.note}>
        Bu fiyat resmi referans veridir; istasyon pompa fiyatı farklı olabilir.
      </Text>
      {suggestion.canApply ? (
        <AppButton
          title="Referans fiyatı kullan"
          variant="secondary"
          compact
          disabled={disabled}
          onPress={onApply}
        />
      ) : (
        <Text style={styles.protected}>Girdiğiniz litre fiyatı korunur.</Text>
      )}
    </Card>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    card: { gap: spacing.sm, backgroundColor: colors.elevatedSurface },
    heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    flex: { flex: 1, minWidth: 0 },
    icon: {
      width: 34,
      height: 34,
      borderRadius: radii.md,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { color: colors.textPrimary, ...typography.bodyMedium },
    meta: { color: colors.textSecondary, ...typography.caption },
    price: { color: colors.textPrimary, ...typography.cardTitle },
    estimate: { color: colors.textPrimary, ...typography.body },
    note: { color: colors.textSecondary, ...typography.caption, lineHeight: 17 },
    protected: { color: colors.textSecondary, ...typography.caption },
  });
