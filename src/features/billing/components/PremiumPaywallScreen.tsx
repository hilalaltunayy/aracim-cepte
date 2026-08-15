import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppHeader, Card, Screen, StatusBadge } from '@/shared/components/ui';
import {
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { PLAN_ENTITLEMENTS, type PlanId } from '@/features/entitlements/domain/entitlements';
import type { BillingOffering, BillingSubscriptionState } from '../domain/billing';

const PREMIUM_BENEFITS = [
  `En fazla ${PLAN_ENTITLEMENTS.premium.maxVehicles} araç`,
  'Gelişmiş araç raporları',
  `Ayda ${PLAN_ENTITLEMENTS.premium.ocrMonthlyQuota} OCR taraması`,
  `Ayda ${PLAN_ENTITLEMENTS.premium.aiMonthlyQuota} Araç Asistanı yanıtı`,
  `Kayıt başına ${PLAN_ENTITLEMENTS.premium.maxAttachmentsPerEntity} ek dosya`,
  `${PLAN_ENTITLEMENTS.premium.maxStorageBytesPerUser / 1024 / 1024} MB güvenli depolama`,
  `Araç başına ${PLAN_ENTITLEMENTS.premium.maxVehiclePhotos} fotoğraf`,
  'Özel hatırlatıcı bildirim saati',
] as const;

const packageLabel = (type: 'monthly' | 'annual' | 'other', title: string) =>
  type === 'monthly' ? 'Aylık' : type === 'annual' ? 'Yıllık' : title;

export function PremiumPaywallScreen({
  authoritativePlanId,
  billingEnabled,
  subscription,
  offering,
  selectedPackageId,
  loading,
  message,
  onSelectPackage,
  onPurchase,
  onRestore,
  onReload,
}: {
  authoritativePlanId: PlanId;
  billingEnabled: boolean;
  subscription: BillingSubscriptionState;
  offering: BillingOffering | null;
  selectedPackageId: string | null;
  loading: boolean;
  message: string | null;
  onSelectPackage: (packageId: string) => void;
  onPurchase: () => void;
  onRestore: () => void;
  onReload: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const premiumActive = authoritativePlanId === 'premium';
  const selectedPackage = offering?.packages.find((item) => item.id === selectedPackageId) ?? null;

  return (
    <Screen>
      <AppHeader
        title="Aracım Cepte Premium"
        subtitle="Araçlarınızı daha geniş limitlerle, aynı güvenli deneyimde yönetin."
      />

      <Card style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Ionicons name="sparkles-outline" size={24} color={colors.primaryAction} />
        </View>
        <View style={styles.summaryText}>
          <Text style={styles.summaryTitle}>
            {premiumActive ? 'Premium hesabınız aktif' : 'Daha fazla araç, daha güçlü araç takibi'}
          </Text>
          <Text style={styles.summaryBody}>
            {premiumActive
              ? 'Premium özellikleriniz merkezi hesap yetkiniz üzerinden kullanılabilir.'
              : 'Yalnızca ihtiyaç duyduğunuz kapasiteyi artırın; mevcut verileriniz ve tasarımınız değişmez.'}
          </Text>
        </View>
        {premiumActive ? <StatusBadge label="Aktif" tone="success" /> : null}
      </Card>

      <Card style={styles.benefitsCard}>
        <Text style={styles.sectionTitle}>Premium ile gelenler</Text>
        <View style={styles.benefitList}>
          {PREMIUM_BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primaryAction} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      </Card>

      {!premiumActive ? (
        <Card style={styles.purchaseCard}>
          <Text style={styles.sectionTitle}>Planınızı seçin</Text>
          {!billingEnabled ? (
            <View style={styles.notice} accessibilityRole="alert">
              <Ionicons name="information-circle-outline" size={21} color={colors.primaryAction} />
              <Text style={styles.noticeText}>
                Premium satın alma şu anda kullanıma açık değil. Ücretsiz özellikler kesintisiz
                kullanılabilir.
              </Text>
            </View>
          ) : offering?.packages.length ? (
            <View accessibilityRole="radiogroup" style={styles.packageList}>
              {offering.packages.map((item) => {
                const selected = item.id === selectedPackageId;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="radio"
                    accessibilityLabel={`${packageLabel(item.packageType, item.title)}, ${item.priceString}`}
                    accessibilityState={{ checked: selected }}
                    onPress={() => onSelectPackage(item.id)}
                    style={({ pressed }) => [
                      styles.packageRow,
                      selected && styles.packageSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.packageText}>
                      <Text style={styles.packageTitle}>
                        {packageLabel(item.packageType, item.title)}
                      </Text>
                      <Text style={styles.packageSubtitle}>{item.title}</Text>
                    </View>
                    <Text style={styles.packagePrice}>{item.priceString}</Text>
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={selected ? colors.primaryAction : colors.muted}
                    />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.notice} accessibilityRole="alert">
              <Ionicons name="cloud-offline-outline" size={21} color={colors.primaryAction} />
              <Text style={styles.noticeText}>
                Mağaza paketleri yüklenemedi. Fiyatlar mağazadan geldiğinde burada gösterilecek.
              </Text>
            </View>
          )}

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {billingEnabled && !offering ? (
            <AppButton title="Paketleri yeniden yükle" variant="secondary" onPress={onReload} />
          ) : null}
          <AppButton
            title={selectedPackage ? `${selectedPackage.priceString} ile devam et` : 'Devam et'}
            onPress={onPurchase}
            loading={loading}
            disabled={!billingEnabled || !selectedPackage}
          />
          <AppButton
            title="Satın alımları geri yükle"
            variant="ghost"
            onPress={onRestore}
            disabled={!billingEnabled}
          />
          <Text style={styles.disclaimer}>
            Satın alma yalnız mağaza ve RevenueCat doğrulamasından sonra Premium erişim sağlar.
          </Text>
        </Card>
      ) : subscription.willRenew === false ? (
        <Card style={styles.noticeCard}>
          <Text style={styles.sectionTitle}>Abonelik dönemi</Text>
          <Text style={styles.noticeText}>
            Yenileme kapalı olsa bile mevcut dönem sonuna kadar Premium erişiminiz korunur. Hiçbir
            araç veya kayıt silinmez.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    summaryCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    summaryIcon: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryText: { flex: 1, minWidth: 0, gap: spacing.xs },
    summaryTitle: { color: colors.textPrimary, ...typography.cardTitle },
    summaryBody: { color: colors.textSecondary, ...typography.body },
    benefitsCard: { gap: spacing.lg },
    purchaseCard: { gap: spacing.lg },
    noticeCard: { gap: spacing.sm },
    sectionTitle: { color: colors.textPrimary, ...typography.sectionTitle },
    benefitList: { gap: spacing.md },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    benefitText: { color: colors.textPrimary, ...typography.body, flex: 1 },
    packageList: { gap: spacing.sm },
    packageRow: {
      minHeight: 66,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    packageSelected: { borderColor: colors.primaryAction, backgroundColor: colors.paleAqua },
    packageText: { flex: 1, minWidth: 0 },
    packageTitle: { color: colors.textPrimary, ...typography.cardTitle },
    packageSubtitle: { color: colors.textSecondary, ...typography.caption },
    packagePrice: { color: colors.textPrimary, ...typography.bodyMedium, flexShrink: 0 },
    notice: {
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.infoSurface,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    noticeText: { color: colors.textSecondary, ...typography.body, flex: 1 },
    message: { color: colors.textSecondary, ...typography.caption },
    disclaimer: { color: colors.textSecondary, ...typography.caption, textAlign: 'center' },
    pressed: { opacity: 0.78 },
  });
