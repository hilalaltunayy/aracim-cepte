import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BodyCondition } from '@/domain/entities';
import { bodyConditionCatalog } from '@/features/bodyCondition/config/bodyConditions';
import {
  formatBodyConditionSet,
  getDisabledBodyConditionIds,
  toggleBodyCondition,
} from '@/features/bodyCondition/domain/bodyConditionRules';
import {
  fontFamilies,
  radii,
  spacing,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';

export function BodyConditionSelector({
  selected,
  onChange,
}: {
  selected: BodyCondition[];
  onChange: (conditions: BodyCondition[]) => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const disabled = getDisabledBodyConditionIds(selected);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Parça durumları</Text>
      <Text style={styles.help}>
        Bir boya/değişim durumu seçin. Hasarlı bilgisi ayrıca işaretlenebilir.
      </Text>
      <View style={styles.options} accessibilityRole="list">
        {bodyConditionCatalog.map((item) => {
          const checked = selected.includes(item.id);
          const isDisabled = disabled.includes(item.id);
          return (
            <Pressable
              key={item.id}
              testID={`body-condition-${item.id}`}
              accessibilityRole="checkbox"
              accessibilityLabel={item.label}
              accessibilityState={{ checked, disabled: isDisabled }}
              disabled={isDisabled}
              onPress={() => onChange(toggleBodyCondition(selected, item.id))}
              style={({ pressed }) => [
                styles.option,
                checked && styles.optionSelected,
                pressed && styles.pressed,
                isDisabled && styles.disabled,
              ]}
            >
              <View
                accessible={false}
                style={[styles.swatch, { backgroundColor: colors.bodyCondition[item.id] }]}
              />
              <Text style={styles.optionLabel}>{item.label}</Text>
              <Ionicons
                accessible={false}
                name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                size={21}
                color={checked ? colors.primaryAction : colors.muted}
              />
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.selectionSummary}>{formatBodyConditionSet(selected)}</Text>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: { gap: spacing.sm },
    label: { color: colors.navy, fontFamily: fontFamilies.semibold, fontSize: 14 },
    help: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    option: {
      minHeight: 42,
      maxWidth: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
    },
    optionSelected: { borderColor: colors.primaryAction, backgroundColor: colors.paleAqua },
    swatch: { width: 11, height: 11, borderRadius: radii.pill },
    optionLabel: { color: colors.navy, fontFamily: fontFamilies.medium, fontSize: 13 },
    selectionSummary: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
    pressed: { opacity: 0.72 },
    disabled: { opacity: 0.45 },
  });
