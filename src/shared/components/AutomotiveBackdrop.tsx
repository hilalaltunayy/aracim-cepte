import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { useAppTheme } from '@/shared/theme';

/**
 * Fixed, very-low-contrast automotive line-art wallpaper: a dense repeating tile
 * of small icons (wheel, wrench, fuel drop, bell, mini car), not a few oversized
 * shapes. Rendered behind (and outside) the scroll area so it never parallaxes.
 * Decorative only — no emoji, not focusable.
 */
export function AutomotiveBackdrop({ opacity = 0.05 }: { opacity?: number }) {
  const { colors } = useAppTheme();
  const line = { stroke: colors.border, strokeWidth: 1.4, fill: 'none' as const };
  const tile = 116;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { opacity }]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="automotive-tile"
            width={tile}
            height={tile}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-8)"
          >
            {/* wheel */}
            <G x={14} y={16}>
              <Circle cx={0} cy={0} r={9} {...line} />
              <Circle cx={0} cy={0} r={3.4} {...line} />
              <Path d="M0 -9 L0 -3.4 M0 9 L0 3.4 M-9 0 L-3.4 0 M9 0 L3.4 0" {...line} />
            </G>
            {/* fuel drop */}
            <G x={74} y={20}>
              <Path d="M0 -10 C 6 -2 7 5 0 9 C -7 5 -6 -2 0 -10 Z" {...line} />
            </G>
            {/* wrench */}
            <G x={30} y={72}>
              <Path d="M-9 9 L3 -3 A5 5 0 1 1 7 1 L-5 13 Z" {...line} />
            </G>
            {/* bell */}
            <G x={92} y={66}>
              <Path d="M-7 6 C -7 -5 7 -5 7 6 Z" {...line} />
              <Path d="M-2.5 6 A2.5 2.5 0 0 0 2.5 6" {...line} />
            </G>
            {/* mini car */}
            <G x={58} y={100}>
              <Path d="M-16 4 L-11 -4 L9 -4 L15 3 L16 3 L16 7 L-16 7 Z" {...line} />
              <Circle cx={-9} cy={7} r={2.6} {...line} />
              <Circle cx={9} cy={7} r={2.6} {...line} />
            </G>
          </Pattern>
        </Defs>
        <Rect x={-tile} y={-tile} width="130%" height="130%" fill="url(#automotive-tile)" />
      </Svg>
    </View>
  );
}
