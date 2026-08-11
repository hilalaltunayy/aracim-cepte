import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { spacing, typography, useAppTheme, useThemedStyles, type AppTheme } from '@/shared/theme';

type ViewportState = 'loading' | 'unsupported' | 'error';

const copy: Record<ViewportState, string> = {
  loading: '3D araç görünümü hazırlanıyor…',
  unsupported: '3D görünüm bu gövde tipi için henüz hazır değil.',
  error: '3D görünüm şu anda kullanılamıyor.',
};

export function Vehicle3DViewportState({ state }: { state: ViewportState }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View
      testID={`vehicle-3d-${state}`}
      accessibilityRole={state === 'error' ? 'alert' : 'text'}
      style={styles.container}
    >
      {state === 'loading' ? <ActivityIndicator color={colors.primaryAction} /> : null}
      <Text style={styles.message}>{copy[state]}</Text>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      minHeight: 150,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      backgroundColor: colors.diagramBackground,
    },
    message: { color: colors.textSecondary, textAlign: 'center', ...typography.body },
  });
