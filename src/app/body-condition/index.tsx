import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AppButton,
  AppInput,
  Card,
  ErrorBanner,
  LoadingScreen,
  NoVehicleState,
  Screen,
  StatusBadge,
} from '@/shared/components/ui';
import { BodyCondition } from '@/domain/entities';
import { bodySchemas } from '@/features/bodyCondition/schemas';
import { BodyDiagram } from '@/features/bodyCondition/BodyDiagram';
import { BodyConditionSelector } from '@/features/bodyCondition/components/BodyConditionSelector';
import { bodyConditionCatalog } from '@/features/bodyCondition/config/bodyConditions';
import {
  areBodyConditionSetsEqual,
  formatBodyConditionSet,
  getRepresentativeBodyCondition,
} from '@/features/bodyCondition/domain/bodyConditionRules';
import { useDataStore } from '@/store/dataStore';
import {
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard';
import { router } from 'expo-router';
import { resolveVehicleScreenState } from '@/shared/utils/vehicleState';
import { getBodySchemaType } from '@/features/vehicles/config/bodyTypes';

export default function BodyConditionScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const conditionColors = colors.bodyCondition;
  const {
    vehicles,
    activeVehicleId,
    bodyConditions,
    saveBodyCondition,
    loading,
    error,
    bootstrapped,
  } = useDataStore();
  const vehicle = vehicles.find((item) => item.id === activeVehicleId);
  const schema = vehicle ? bodySchemas[getBodySchemaType(vehicle.bodyType)] : null;
  const [selectedPartOverride, setSelectedPartOverride] = useState('');
  const selectedPart =
    schema?.parts.find((part) => part.key === selectedPartOverride)?.key ??
    schema?.parts[0]?.key ??
    '';
  const existing = useMemo(
    () => bodyConditions.find((condition) => condition.partKey === selectedPart),
    [bodyConditions, selectedPart],
  );
  const [conditionOverride, setConditionOverride] = useState<BodyCondition[] | null>(null);
  const [noteOverride, setNoteOverride] = useState<string | null>(null);
  const conditions = conditionOverride ?? existing?.conditions ?? [];
  const note = noteOverride ?? existing?.note ?? '';
  const isDirty =
    !areBodyConditionSetsEqual(conditions, existing?.conditions ?? []) ||
    note !== (existing?.note ?? '');
  useUnsavedChangesGuard(isDirty);

  const vehicleState = resolveVehicleScreenState({ bootstrapped, vehicleFound: Boolean(vehicle) });
  if (vehicleState === 'loading') return <LoadingScreen />;
  if (!vehicle || !schema) {
    return (
      <Screen>
        <NoVehicleState onCreate={() => router.navigate('/vehicle/edit')} />
      </Screen>
    );
  }
  const selectPart = (partKey: string) => {
    setSelectedPartOverride(partKey);
    setConditionOverride(null);
    setNoteOverride(null);
  };
  const selectedLabel = schema.parts.find((part) => part.key === selectedPart)?.label ?? 'Parça';
  const representativeCondition = getRepresentativeBodyCondition(conditions) ?? 'unknown';
  return (
    <Screen>
      {error ? <ErrorBanner message={error} /> : null}
      <BodyDiagram
        bodyType={vehicle.bodyType}
        conditions={bodyConditions}
        selectedPart={selectedPart}
        onSelect={selectPart}
      />
      <Card style={styles.editor}>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <View style={styles.partHeading}>
              <View
                style={[
                  styles.partDot,
                  { backgroundColor: conditionColors[representativeCondition] },
                ]}
              />
              <Text style={styles.partTitle}>{selectedLabel}</Text>
            </View>
            <Text style={styles.hint}>Parçanın geçerli tüm durumlarını seçin.</Text>
          </View>
          <StatusBadge
            label={
              conditions.length > 1
                ? `${conditions.length} durum`
                : formatBodyConditionSet(conditions)
            }
            tone="neutral"
          />
        </View>
        <BodyConditionSelector selected={conditions} onChange={setConditionOverride} />
        <AppInput label="Not" value={note} onChangeText={setNoteOverride} multiline />
        <AppButton
          title="Parça durumunu kaydet"
          loading={loading}
          onPress={() =>
            void saveBodyCondition(selectedPart, conditions, note || null).then((saved) => {
              if (!saved) return;
              setConditionOverride(null);
              setNoteOverride(null);
            })
          }
        />
      </Card>
      <Card style={styles.overviewCard}>
        <Text style={styles.legendTitle}>Durum renkleri</Text>
        <View style={styles.legend}>
          {bodyConditionCatalog.map((condition) => (
            <View key={condition.id} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: conditionColors[condition.id] }]} />
              <Text style={styles.legendText}>{condition.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.summary}>
          {schema.parts.map((part) => {
            const item = bodyConditions.find((entry) => entry.partKey === part.key);
            const currentConditions = item?.conditions ?? [];
            const currentCondition = getRepresentativeBodyCondition(currentConditions) ?? 'unknown';
            return (
              <View key={part.key} style={styles.summaryRow}>
                <View style={styles.summaryName}>
                  <View
                    style={[
                      styles.summaryDot,
                      { backgroundColor: conditionColors[currentCondition] },
                    ]}
                  />
                  <Text style={styles.summaryPart}>{part.label}</Text>
                </View>
                <Text style={styles.summaryStatus}>
                  {formatBodyConditionSet(currentConditions)}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    editor: { gap: spacing.lg, borderColor: colors.borderStrong },
    headingRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    headingCopy: { flex: 1, minWidth: 0 },
    partHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    partDot: { width: 12, height: 12, borderRadius: 4 },
    partTitle: { color: colors.navy, ...typography.sectionTitle },
    hint: { color: colors.muted, ...typography.caption, marginTop: 5 },
    overviewCard: { gap: spacing.lg },
    legendTitle: { color: colors.navy, ...typography.cardTitle },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '45%' },
    swatch: { width: 15, height: 15, borderRadius: 5 },
    legendText: { color: colors.navy, ...typography.caption },
    summary: { gap: spacing.sm },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 10,
    },
    summaryName: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
    summaryDot: { width: 8, height: 8, borderRadius: radii.pill },
    summaryPart: { color: colors.navy, ...typography.bodyMedium },
    summaryStatus: {
      color: colors.muted,
      ...typography.status,
      flexShrink: 1,
      maxWidth: '56%',
      textAlign: 'right',
    },
  });
