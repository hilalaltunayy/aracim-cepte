import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { AppButton, FadeIn, Screen } from '@/shared/components/ui';
import { colors, fontFamilies, radii, spacing, typography } from '@/shared/theme';
import { useDataStore } from '@/store/dataStore';

function VehicleIllustration() {
  return (
    <Svg width="100%" height={260} viewBox="0 0 360 260" accessibilityLabel="Modern araç çizimi">
      <Circle cx="180" cy="125" r="108" fill="rgba(255,255,255,0.14)" />
      <Path
        d="M76 146c7-22 21-37 42-45l34-14c18-7 44-6 60 2l37 19c14 7 25 19 31 38l7 20H68l8-20Z"
        fill="#FFFFFF"
      />
      <Path d="M132 105l29-12c14-5 32-4 44 2l30 15-103-5Z" fill="#BDECF4" />
      <Rect x="55" y="153" width="250" height="42" rx="21" fill="#F8FDFF" />
      <Circle cx="111" cy="194" r="26" fill="#173042" />
      <Circle cx="111" cy="194" r="12" fill="#85D8E4" />
      <Circle cx="253" cy="194" r="26" fill="#173042" />
      <Circle cx="253" cy="194" r="12" fill="#85D8E4" />
      <Path d="M67 166h33M265 166h31" stroke="#35CFC4" strokeWidth="7" strokeLinecap="round" />
    </Svg>
  );
}

export default function OnboardingScreen() {
  const setOnboardingSeen = useDataStore((state) => state.setOnboardingSeen);
  const continueToAuth = () => {
    setOnboardingSeen();
    router.replace('/auth/login');
  };
  return (
    <LinearGradient colors={[colors.primary, colors.aqua]} style={styles.gradient}>
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

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  screen: { justifyContent: 'space-between', paddingTop: spacing.xl },
  brand: { gap: spacing.sm },
  eyebrow: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    letterSpacing: 1.25,
  },
  title: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -1,
  },
  message: {
    color: colors.white,
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 340,
  },
  hero: {
    marginVertical: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  featureRow: { gap: spacing.sm },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.white },
  featureText: { gap: 2 },
  featureTitle: { color: colors.white, fontFamily: fontFamilies.semibold, fontSize: 14 },
  featureMessage: { color: 'rgba(255,255,255,0.82)', ...typography.caption },
});
