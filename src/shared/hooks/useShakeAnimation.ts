import { useCallback, useState } from 'react';
import { Animated } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

/**
 * Short horizontal shake for "action blocked" feedback (invalid save, rejected
 * login). Returns a transform style to spread onto an Animated.View and a
 * `shake()` trigger. Under reduce-motion the trigger is a no-op.
 */
export function useShakeAnimation() {
  const [value] = useState(() => new Animated.Value(0));
  const reducedMotion = useReducedMotion();

  const shake = useCallback(() => {
    if (reducedMotion) return;
    value.setValue(0);
    Animated.sequence(
      [8, -8, 6, -6, 0].map((toValue) =>
        Animated.timing(value, { toValue, duration: 45, useNativeDriver: true }),
      ),
    ).start();
  }, [reducedMotion, value]);

  return { shake, style: { transform: [{ translateX: value }] } };
}
