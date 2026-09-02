import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useAppTheme } from '@/shared/theme';

/**
 * Fixed, very-low-contrast automotive line-art wallpaper shared by Home, record
 * forms, reminders and settings. Rendered behind (and outside) the scroll area
 * so it never parallaxes. Decorative only — no emoji, not focusable.
 */
export function AutomotiveBackdrop({ opacity = 0.06 }: { opacity?: number }) {
  const { colors } = useAppTheme();
  const line = { stroke: colors.border, strokeWidth: 2, fill: 'none' as const };

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { opacity }]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* odometer / gauge */}
        <G x={64} y={110}>
          <Circle cx={0} cy={0} r={34} {...line} />
          <Circle cx={0} cy={0} r={22} {...line} />
          <Path d="M0 0 L16 -10" {...line} />
        </G>
        {/* steering wheel */}
        <G x={330} y={210}>
          <Circle cx={0} cy={0} r={40} {...line} />
          <Circle cx={0} cy={0} r={12} {...line} />
          <Path d="M0 -40 L0 -12 M-40 0 L-12 0 M40 0 L12 0 M0 40 L0 12" {...line} />
        </G>
        {/* fuel drop */}
        <G x={56} y={430}>
          <Path d="M0 -30 C 18 -6 20 12 0 26 C -20 12 -18 -6 0 -30 Z" {...line} />
        </G>
        {/* wrench */}
        <G x={320} y={500}>
          <Path d="M-26 26 L6 -6 A15 15 0 1 1 20 8 L-12 40 Z" {...line} />
        </G>
        {/* bell */}
        <G x={110} y={660}>
          <Path d="M-18 14 C -18 -12 18 -12 18 14 Z" {...line} />
          <Path d="M-6 14 A6 6 0 0 0 6 14" {...line} />
        </G>
        {/* document */}
        <G x={300} y={690}>
          <Rect x={-24} y={-30} width={48} height={60} rx={6} {...line} />
          <Path d="M-12 -12 L12 -12 M-12 2 L12 2 M-12 16 L4 16" {...line} />
        </G>
        {/* simple car outline */}
        <G x={200} y={330}>
          <Path d="M-78 20 L-56 -16 L36 -16 L64 12 L78 14 L78 26 L-78 26 Z" {...line} />
          <Circle cx={-44} cy={26} r={12} {...line} />
          <Circle cx={44} cy={26} r={12} {...line} />
        </G>
      </Svg>
    </View>
  );
}
