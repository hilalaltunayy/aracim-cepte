import { useEffect, useState } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useAppTheme } from '@/shared/theme';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * Tiny automotive "headlight eyes" character for the password visibility control.
 * Hidden -> lids down / pupils look away; visible -> lids up, pupils centred.
 * Purely decorative: the surrounding Pressable keeps the accessible label.
 */
export function PasswordMascot({ visible, size = 24 }: { visible: boolean; size?: number }) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const [open] = useState(() => new Animated.Value(visible ? 1 : 0));

  useEffect(() => {
    if (reducedMotion) {
      open.setValue(visible ? 1 : 0);
      return;
    }
    Animated.spring(open, {
      toValue: visible ? 1 : 0,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [open, reducedMotion, visible]);

  const lidY = open.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const pupilX = open.interpolate({ inputRange: [0, 1], outputRange: [-1.6, 0] });

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Rect x={2} y={6} width={20} height={12} rx={4} fill="none" stroke={colors.muted} strokeWidth={1.6} />
      <Path d="M6 18 L6 20 M18 18 L18 20" stroke={colors.muted} strokeWidth={1.6} strokeLinecap="round" />
      {[8, 16].map((cx) => (
        <G key={cx}>
          <Circle cx={cx} cy={12} r={2.9} fill={visible ? colors.primary : colors.disabledSurface} />
          <AnimatedG x={pupilX}>
            <Circle cx={cx} cy={12} r={1.3} fill={colors.navy} opacity={visible ? 1 : 0.35} />
          </AnimatedG>
          <AnimatedG y={lidY}>
            <Path
              d={`M${cx - 3.4} 12 A3.4 3.4 0 0 1 ${cx + 3.4} 12 L${cx + 3.4} 8 L${cx - 3.4} 8 Z`}
              fill={colors.inputBackground}
            />
            <Path
              d={`M${cx - 3.2} 12 A3.2 3.2 0 0 1 ${cx + 3.2} 12`}
              fill="none"
              stroke={colors.muted}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
          </AnimatedG>
        </G>
      ))}
    </Svg>
  );
}
