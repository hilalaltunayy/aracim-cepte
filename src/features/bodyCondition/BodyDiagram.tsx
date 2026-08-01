import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { BodyCondition, BodyPartCondition, BodyType } from '@/domain/entities';
import { bodySchemas } from './schemas';
import { colors, radii, spacing, typography } from '@/shared/theme';

export const conditionColors: Record<BodyCondition, string> = {
  original: '#72B99C',
  painted: '#3E8FD0',
  locally_painted: '#9A74BF',
  replaced: '#DE8738',
  damaged: '#CB5259',
  unknown: '#B7C5CA',
};

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
  const schema = bodySchemas[bodyType];
  const selectedLabel = schema.parts.find((part) => part.key === selectedPart)?.label ?? 'Parça';

  return (
    <View style={styles.canvas}>
      <View style={styles.canvasHeader}>
        <View>
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
            <Rect x="30" y="104" width="20" height="62" rx="8" fill={colors.navy} opacity={0.8} />
            <Rect x="210" y="104" width="20" height="62" rx="8" fill={colors.navy} opacity={0.8} />
            <Rect x="30" y="270" width="20" height="66" rx="8" fill={colors.navy} opacity={0.8} />
            <Rect x="210" y="270" width="20" height="66" rx="8" fill={colors.navy} opacity={0.8} />
            <Circle cx="39" cy="181" r="10" fill={colors.navy} opacity={0.78} />
            <Circle cx="221" cy="181" r="10" fill={colors.navy} opacity={0.78} />
            <Path
              d={schema.silhouettePath}
              fill="#E6EFF2"
              stroke={colors.navy}
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
                  stroke={selected ? colors.navy : colors.white}
                  strokeWidth={selected ? 4 : 2}
                  strokeLinejoin="round"
                />
              );
            })}
            <Path d={schema.windshieldPath} fill="#D9EEF3" stroke={colors.white} strokeWidth={2} />
            <Path d={schema.rearWindowPath} fill="#CBE7EE" stroke={colors.white} strokeWidth={2} />
            <Path
              d="M130 42 L130 392"
              stroke="rgba(255,255,255,0.42)"
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

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    backgroundColor: colors.surface,
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
  eyebrow: {
    color: colors.primary,
    ...typography.eyebrow,
  },
  canvasTitle: { color: colors.navy, ...typography.sectionTitle, marginTop: spacing.xxs },
  tapHint: {
    borderRadius: radii.pill,
    backgroundColor: colors.paleAqua,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  tapHintText: { color: colors.primaryDark, ...typography.status },
  diagram: {
    width: '100%',
    height: 430,
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
});
