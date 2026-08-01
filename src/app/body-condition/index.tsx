import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AppButton,
  AppInput,
  Card,
  ErrorBanner,
  Screen,
  SelectField,
  StatusBadge,
} from '@/shared/components/ui';
import { BodyCondition } from '@/domain/entities';
import { bodyConditionLabels } from '@/shared/constants/labels';
import { bodySchemas } from '@/features/bodyCondition/schemas';
import { BodyDiagram } from '@/features/bodyCondition/BodyDiagram';
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

export default function BodyConditionScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const conditionColors = colors.bodyCondition;
  const { vehicles, activeVehicleId, bodyConditions, saveBodyCondition, loading, error } =
    useDataStore();
  const vehicle = vehicles.find((item) => item.id === activeVehicleId);
  const schema = vehicle ? bodySchemas[vehicle.bodyType] : null;
  const [selectedPartOverride, setSelectedPartOverride] = useState('');
  const selectedPart =
    schema?.parts.find((part) => part.key === selectedPartOverride)?.key ??
    schema?.parts[0]?.key ??
    '';
  const existing = useMemo(
    () => bodyConditions.find((condition) => condition.partKey === selectedPart),
    [bodyConditions, selectedPart],
  );
  const [conditionOverride, setConditionOverride] = useState<BodyCondition | null>(null);
  const [noteOverride, setNoteOverride] = useState<string | null>(null);
  const condition = conditionOverride ?? existing?.condition ?? 'unknown';
  const note = noteOverride ?? existing?.note ?? '';
  const isDirty =
    condition !== (existing?.condition ?? 'unknown') || note !== (existing?.note ?? '');
  useUnsavedChangesGuard(isDirty);

  if (!vehicle || !schema) return null;
  const selectPart = (partKey: string) => {
    setSelectedPartOverride(partKey);
    setConditionOverride(null);
    setNoteOverride(null);
  };
  const selectedLabel = schema.parts.find((part) => part.key === selectedPart)?.label ?? 'Parça';
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
              <View style={[styles.partDot, { backgroundColor: conditionColors[condition] }]} />
              <Text style={styles.partTitle}>{selectedLabel}</Text>
            </View>
            <Text style={styles.hint}>Parçanın güncel durumunu seçin.</Text>
          </View>
          <StatusBadge label={bodyConditionLabels[condition]} tone="neutral" />
        </View>
        <SelectField
          label="Parça durumu"
          value={condition}
          onChange={setConditionOverride}
          options={(Object.keys(bodyConditionLabels) as BodyCondition[]).map((value) => ({
            value,
            label: bodyConditionLabels[value],
          }))}
        />
        <AppInput label="Not" value={note} onChangeText={setNoteOverride} multiline />
        <AppButton
          title="Parça durumunu kaydet"
          loading={loading}
          onPress={() =>
            void saveBodyCondition(selectedPart, condition, note || null).then((saved) => {
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
          {(Object.keys(bodyConditionLabels) as BodyCondition[]).map((value) => (
            <View key={value} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: conditionColors[value] }]} />
              <Text style={styles.legendText}>{bodyConditionLabels[value]}</Text>
            </View>
          ))}
        </View>
        <View style={styles.summary}>
          {schema.parts.map((part) => {
            const item = bodyConditions.find((entry) => entry.partKey === part.key);
            const currentCondition = item?.condition ?? 'unknown';
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
                <Text style={styles.summaryStatus}>{bodyConditionLabels[currentCondition]}</Text>
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
    summaryStatus: { color: colors.muted, ...typography.status },
  });
