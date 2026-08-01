import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, useAppTheme, useThemedStyles, type AppTheme } from '@/shared/theme';

export function LegalNavigationRow({ title, onPress }: { title: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} belgesini aç`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.title}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} accessible={false} />
    </Pressable>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    row: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    title: { flex: 1, color: colors.textPrimary, ...typography.bodyMedium },
    pressed: { backgroundColor: colors.elevatedSurface },
  });
