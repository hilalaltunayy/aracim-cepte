import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { AppButton, FadeIn, Screen } from '@/shared/components/ui';
import {
  fontFamilies,
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { useDataStore } from '@/store/dataStore';

function VehicleIllustration() {
  const { colors } = useAppTheme();
  return (
    <Svg width="100%" height={260} viewBox="0 0 360 260" accessible={false}>
      <Circle cx="180" cy="125" r="108" fill={colors.brandSurfaceStrong} />
      <Path
        d="M76 146c7-22 21-37 42-45l34-14c18-7 44-6 60 2l37 19c14 7 25 19 31 38l7 20H68l8-20Z"
        fill={colors.illustrationBody}
      />
      <Path d="M132 105l29-12c14-5 32-4 44 2l30 15-103-5Z" fill={colors.illustrationGlass} />
      <Rect x="55" y="153" width="250" height="42" rx="21" fill={colors.illustrationTrim} />
      <Circle cx="111" cy="194" r="26" fill={colors.illustrationWheel} />
      <Circle cx="111" cy="194" r="12" fill={colors.illustrationHub} />
      <Circle cx="253" cy="194" r="26" fill={colors.illustrationWheel} />
      <Circle cx="253" cy="194" r="12" fill={colors.illustrationHub} />
      <Path
        d="M67 166h33M265 166h31"
        stroke={colors.illustrationAccent}
        strokeWidth="7"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function OnboardingScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const setOnboardingSeen = useDataStore((state) => state.setOnboardingSeen);
  const continueToAuth = () => {
    setOnboardingSeen();
    router.replace('/auth/login');
  };
  return (
    <LinearGradient
      colors={[colors.brandGradientStart, colors.brandGradientEnd]}
      style={styles.gradient}
    >
      <Screen style={styles.screen} backgroundColor="transparent">
        <FadeIn>
          <View style={styles.brand}>
            <Text style={styles.eyebrow}>ARACINIZIN DİJİTAL YOL ARKADAŞI</Text>
            <Text style={styles.title}>Aracım Cepte</Text>
            <Text style={styles.message}>
              Masraflarınızı, bakımlarınızı ve yaklaşan tarihleri tek, güvenli bir yerde yönetin.
            </Text>
          </View>
        </FadeIn>
        <View style={styles.hero}>
          <VehicleIllustration />
        </View>
        <View style={styles.featureRow}>
          {[
            ['Masraf takibi', 'Tüm kayıtlarınız düzenli'],
            ['Akıllı plan', 'Tarih ve kilometre hatırlatıcıları'],
            ['Güvenli bulut', 'Size özel, korumalı veriler'],
          ].map(([title, message]) => (
            <View key={title} style={styles.feature}>
              <View style={styles.dot} />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureMessage}>{message}</Text>
              </View>
            </View>
          ))}
        </View>
        <AppButton title="Başlayalım" onPress={continueToAuth} />
      </Screen>
    </LinearGradient>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    gradient: { flex: 1 },
    screen: { justifyContent: 'space-between', paddingTop: spacing.xl },
    brand: { gap: spacing.sm },
    eyebrow: {
      color: colors.onBrandMuted,
      fontFamily: fontFamilies.semibold,
      fontSize: 11,
      letterSpacing: 1.25,
    },
    title: {
      color: colors.onBrand,
      fontFamily: fontFamilies.bold,
      fontSize: 40,
      lineHeight: 48,
      letterSpacing: -1,
    },
    message: {
      color: colors.onBrand,
      fontFamily: fontFamilies.regular,
      fontSize: 16,
      lineHeight: 24,
      maxWidth: 340,
    },
    hero: {
      marginVertical: spacing.md,
      borderRadius: radii.xl,
      backgroundColor: colors.brandSurface,
      overflow: 'hidden',
    },
    featureRow: { gap: spacing.sm },
    feature: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.brandSurfaceStrong,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.onBrand },
    featureText: { gap: 2 },
    featureTitle: { color: colors.onBrand, fontFamily: fontFamilies.semibold, fontSize: 14 },
    featureMessage: { color: colors.onBrandMuted, ...typography.caption },
  });
