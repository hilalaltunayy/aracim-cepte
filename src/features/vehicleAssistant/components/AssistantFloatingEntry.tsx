import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getBottomTabLayout,
  getFloatingControlRightOffset,
} from '@/shared/utils/bottomTabLayout';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { spacing, useAppTheme, useThemedStyles, type AppTheme } from '@/shared/theme';

const SIZE = 56;

/**
 * Ambient Vehicle Assistant entry that floats just above the Home tab bar.
 *
 * NOT a Premium control — it renders for every plan and navigates straight to
 * the existing `/vehicle-assistant` route; whatever quota or paywall the
 * assistant enforces happens after navigation, untouched by this component.
 *
 * Positioned from the real tab-bar geometry (`getBottomTabLayout`) plus the
 * bottom safe-area inset, never a fixed pixel guess, so the whole circle clears
 * the tab bar on every device and Android navigation mode. The horizontal
 * offset is derived from the same tab grid (`getFloatingControlRightOffset`),
 * so the circle centres on the last-two-tabs boundary — never over the Settings
 * tab — and its edge gap scales from phone to tablet.
 */
export function AssistantFloatingEntry() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  // Tab bar top edge from the screen bottom = its own offset + its height.
  // A small float gap lifts the button clearly clear of the bar.
  const { bottomOffset, height } = getBottomTabLayout(bottom);
  const anchorBottom = bottomOffset + height + spacing.md;
  const anchorRight = getFloatingControlRightOffset(width, SIZE, spacing.xl);

  const [floatY] = useState(() => new Animated.Value(0));
  const [floatX] = useState(() => new Animated.Value(0));
  const [glint] = useState(() => new Animated.Value(0));
  const [press] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reducedMotion) return;

    // Two out-of-phase loops so the drift reads as buoyant, not a fixed diagonal.
    const buoy = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
    const yLoop = buoy(floatY, 3200);
    const xLoop = buoy(floatX, 4300);
    const glintLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(glint, {
          toValue: 1,
          duration: 680,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glint, {
          toValue: 0,
          duration: 860,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(1100),
      ]),
    );

    yLoop.start();
    xLoop.start();
    glintLoop.start();
    return () => {
      yLoop.stop();
      xLoop.stop();
      glintLoop.stop();
      floatY.stopAnimation();
      floatX.stopAnimation();
      glint.stopAnimation();
    };
  }, [reducedMotion, floatX, floatY, glint]);

  const translateY = floatY.interpolate({ inputRange: [0, 1], outputRange: [2, -2] });
  const translateX = floatX.interpolate({ inputRange: [0, 1], outputRange: [-1, 1] });
  const rotate = floatX.interpolate({ inputRange: [0, 1], outputRange: ['-0.8deg', '0.8deg'] });
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] });
  const iconScale = glint.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] });
  const iconOpacity = glint.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const sparkOpacity = glint.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.85, 0] });
  const sparkScale = glint.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] });

  const setPressed = (down: boolean) =>
    Animated.timing(press, {
      toValue: down ? 1 : 0,
      duration: down ? 90 : 150,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.anchor,
        {
          bottom: anchorBottom,
          right: anchorRight,
          transform: [{ translateX }, { translateY }, { rotate }],
        },
      ]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          testID="dashboard-assistant-entry"
          accessibilityRole="button"
          accessibilityLabel="Araç Asistanını aç"
          accessibilityHint="Seçili aracınız hakkında soru sorabileceğiniz ekranı açar."
          hitSlop={10}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          onPress={() => router.push('/vehicle-assistant' as never)}
          style={styles.button}
        >
          <LinearGradient
            colors={[colors.assistantGlass.fillStart, colors.assistantGlass.fillEnd]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sheen} pointerEvents="none" />
          <Animated.View style={{ opacity: iconOpacity, transform: [{ scale: iconScale }] }}>
            <Ionicons name="sparkles" size={22} color={colors.assistantGlass.icon} accessible={false} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.spark, { opacity: sparkOpacity, transform: [{ scale: sparkScale }] }]}
          >
            <Ionicons
              name="sparkles-outline"
              size={11}
              color={colors.assistantGlass.icon}
              accessible={false}
            />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    anchor: {
      position: 'absolute',
      // `right` is set inline from the live window width — see the component.
      // Lift above the Home scroll content and backdrop. The tab bar sits lower
      // now, so there is nothing left to fight over; the button's own elevation
      // (below) carries the Android z-order and the shadow.
      zIndex: 30,
    },
    button: {
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.assistantGlass.border,
      backgroundColor: colors.assistantGlass.fillEnd,
      shadowColor: colors.primary,
      shadowOpacity: 0.22,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      ...Platform.select({ android: { elevation: 8 }, default: {} }),
    },
    sheen: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: SIZE * 0.46,
      backgroundColor: colors.assistantGlass.border,
      opacity: 0.35,
    },
    spark: {
      position: 'absolute',
      top: 9,
      right: 10,
    },
  });
