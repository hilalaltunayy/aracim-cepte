import { type PropsWithChildren, useEffect, useState } from 'react';
import { Animated, type ViewStyle } from 'react-native';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

/**
 * Lightweight staggered entrance: fade + short upward slide. Under reduce-motion
 * it renders instantly. Use `order` to cascade several siblings.
 */
export function Reveal({
  children,
  order = 0,
  stepMs = 90,
  style,
}: PropsWithChildren<{ order?: number; stepMs?: number; style?: ViewStyle }>) {
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      delay: order * stepMs,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [order, progress, reducedMotion, stepMs]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
