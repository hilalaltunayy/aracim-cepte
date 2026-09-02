import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fontFamilies, useAppTheme } from '@/shared/theme';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

/**
 * Soft one-shot welcome shown after a fresh login / cold authenticated launch:
 * "Merhaba <ad>" reveals, slides up, then a contextual second line, then the
 * overlay lifts to reveal Home. Not shown on tab revisits.
 */
export function HomeIntroOverlay({
  name,
  contextLine,
  onDone,
}: {
  name: string;
  contextLine: string;
  onDone: () => void;
}) {
  const { colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const [line1] = useState(() => new Animated.Value(0));
  const [line2] = useState(() => new Animated.Value(0));
  const [lift] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reducedMotion) {
      onDone();
      return;
    }
    const timing = (value: Animated.Value, toValue: number, duration: number, delay = 0) =>
      Animated.timing(value, {
        toValue,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });

    const animation = Animated.sequence([
      timing(line1, 1, 420),
      Animated.delay(620),
      Animated.parallel([timing(line1, 2, 380), timing(line2, 1, 420, 120)]),
      Animated.delay(760),
      timing(lift, 1, 360),
    ]);
    animation.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => animation.stop();
  }, [line1, line2, lift, onDone, reducedMotion]);

  if (reducedMotion) return null;

  const line1Translate = line1.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [16, 0, -22],
  });
  const line1Opacity = line1.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] });
  const line2Translate = line2.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        {
          opacity: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [
            { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -26] }) },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={[colors.brandGradientStart, colors.brandGradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.center}>
        <Animated.Text
          style={[
            styles.line1,
            { color: colors.onBrand, opacity: line1Opacity, transform: [{ translateY: line1Translate }] },
          ]}
        >
          {name ? `Merhaba ${name}` : 'Merhaba'}
        </Animated.Text>
        <Animated.Text
          style={[
            styles.line2,
            {
              color: colors.onBrandMuted,
              opacity: line2,
              transform: [{ translateY: line2Translate }],
            },
          ]}
        >
          {contextLine}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { zIndex: 20, alignItems: 'center', justifyContent: 'center' },
  center: { paddingHorizontal: 32, alignItems: 'center', gap: 10 },
  line1: { fontFamily: fontFamilies.bold, fontSize: 28, textAlign: 'center' },
  line2: { fontFamily: fontFamilies.medium, fontSize: 17, textAlign: 'center' },
});
