import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { BodyPartCondition, BodyType } from '@/domain/entities';
import { bodySchemas } from './schemas';
import {
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';

export function BodyDiagram({
  bodyType,
  conditions,
  selectedPart,
  onSelect,
}: {
  bodyType: BodyType;
  conditions: BodyPartCondition[];
  selectedPart: string;
  onSelect: (partKey: string) => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const conditionColors = colors.bodyCondition;
  const schema = bodySchemas[bodyType];
  const selectedLabel = schema.parts.find((part) => part.key === selectedPart)?.label ?? 'Parça';

  return (
    <View style={styles.canvas}>
      <View style={styles.canvasHeader}>
        <View style={styles.canvasHeading}>
          <Text style={styles.eyebrow}>ÜSTTEN GÖRÜNÜM</Text>
          <Text style={styles.canvasTitle}>{selectedLabel}</Text>
        </View>
        <View style={styles.tapHint}>
          <Text style={styles.tapHintText}>Parçaya dokunun</Text>
        </View>
      </View>
      <View style={styles.diagram}>
        <Svg width="100%" height="100%" viewBox="0 0 260 430">
          <G opacity={0.98}>
            <Rect
              x="30"
              y="104"
              width="20"
              height="62"
              rx="8"
              fill={colors.diagramWheel}
              opacity={0.8}
            />
            <Rect
              x="210"
              y="104"
              width="20"
              height="62"
              rx="8"
              fill={colors.diagramWheel}
              opacity={0.8}
            />
            <Rect
              x="30"
              y="270"
              width="20"
              height="66"
              rx="8"
              fill={colors.diagramWheel}
              opacity={0.8}
            />
            <Rect
              x="210"
              y="270"
              width="20"
              height="66"
              rx="8"
              fill={colors.diagramWheel}
              opacity={0.8}
            />
            <Circle cx="39" cy="181" r="10" fill={colors.diagramWheel} opacity={0.78} />
            <Circle cx="221" cy="181" r="10" fill={colors.diagramWheel} opacity={0.78} />
            <Path
              d={schema.silhouettePath}
              fill={colors.diagramSilhouette}
              stroke={colors.textPrimary}
              strokeWidth={3}
              strokeLinejoin="round"
            />
            {schema.parts.map((part) => {
              const status =
                conditions.find((condition) => condition.partKey === part.key)?.condition ??
                'unknown';
              const selected = part.key === selectedPart;
              return (
                <Path
                  key={part.key}
                  d={part.path}
                  fill={conditionColors[status]}
                  fillOpacity={selected ? 1 : 0.86}
                  stroke={selected ? colors.textPrimary : colors.cardBackground}
                  strokeWidth={selected ? 4 : 2}
                  strokeLinejoin="round"
                />
              );
            })}
            <Path
              d={schema.windshieldPath}
              fill={colors.diagramWindshield}
              stroke={colors.cardBackground}
              strokeWidth={2}
            />
            <Path
              d={schema.rearWindowPath}
              fill={colors.diagramRearWindow}
              stroke={colors.cardBackground}
              strokeWidth={2}
            />
            <Path
              d="M130 42 L130 392"
              stroke={colors.diagramCenterLine}
              strokeWidth={1.5}
              strokeDasharray="4 8"
            />
          </G>
        </Svg>
        <View style={StyleSheet.absoluteFill}>
          {schema.parts.map((part) => (
            <Pressable
              key={part.key}
              accessibilityRole="button"
              accessibilityLabel={`${part.label} parçasını seç`}
              accessibilityState={{ selected: part.key === selectedPart }}
              hitSlop={2}
              onPress={() => onSelect(part.key)}
              style={{
                position: 'absolute',
                left: `${(part.hitArea.x / 260) * 100}%`,
                top: `${(part.hitArea.y / 430) * 100}%`,
                width: `${(part.hitArea.width / 260) * 100}%`,
                height: `${(part.hitArea.height / 430) * 100}%`,
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    canvas: {
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      overflow: 'hidden',
    },
    canvasHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    canvasHeading: { flex: 1, minWidth: 0 },
    eyebrow: {
      color: colors.primary,
      ...typography.eyebrow,
    },
    canvasTitle: { color: colors.navy, ...typography.sectionTitle, marginTop: spacing.xxs },
    tapHint: {
      alignItems: 'center',
      borderRadius: radii.pill,
      backgroundColor: colors.paleAqua,
      flexShrink: 1,
      maxWidth: '46%',
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
    },
    tapHintText: { color: colors.primaryDark, ...typography.status, textAlign: 'center' },
    diagram: {
      width: '100%',
      height: 430,
      marginTop: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: colors.diagramBackground,
      overflow: 'hidden',
    },
  });
