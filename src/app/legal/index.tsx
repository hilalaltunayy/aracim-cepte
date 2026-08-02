import { router, type Href } from 'expo-router';
import { AppHeader, Card, Screen } from '@/shared/components/ui';
import { StyleSheet, View } from 'react-native';
import { spacing, useThemedStyles, type AppTheme } from '@/shared/theme';
import { LegalNavigationRow } from '@/features/legal/LegalNavigationRow';
import { LEGAL_ROUTES } from '@/features/legal/legalRoutes';
import { openLegalLink } from '@/features/legal/legalLinkOpener';

export default function LegalIndexScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <Screen>
      <AppHeader
        title="Yasal ve gizlilik"
        subtitle="Gizlilik, KVKK ve veri yönetimi belgeleri"
      />
      <Card style={styles.card}>
        <View>
          {LEGAL_ROUTES.map((link) => (
            <LegalNavigationRow
              key={link.href}
              title={link.title}
              onPress={() => void openLegalLink(link, () => router.push(link.href as Href))}
            />
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const createStyles = (_theme: AppTheme) => StyleSheet.create({ card: { padding: 0, gap: spacing.xs } });
