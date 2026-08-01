import { StyleSheet, Text } from 'react-native';
import { AppHeader, Card, Screen } from '@/shared/components/ui';
import { spacing, typography, useThemedStyles, type AppTheme } from '@/shared/theme';
import type { LegalDocument } from './legalContent';
import { getUserFacingLegalDocument } from './legalContent';

export function LegalDocumentScreen({ document }: { document: LegalDocument }) {
  const styles = useThemedStyles(createStyles);
  const visibleDocument = getUserFacingLegalDocument(document);
  return (
    <Screen style={styles.screen}>
      <AppHeader title={visibleDocument.title} subtitle="Bilgilendirme ve veri yönetimi belgesi" />
      {visibleDocument.sections.map((section) => (
        <Card key={section.title} style={styles.section}>
          <Text style={styles.title}>{section.title}</Text>
          {section.paragraphs.map((paragraph, paragraphIndex) => (
            <Text key={`${section.title}-${paragraphIndex}`} style={styles.body}>
              {paragraph}
            </Text>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    screen: { gap: spacing.lg },
    section: { gap: spacing.sm },
    title: { color: colors.navy, ...typography.sectionTitle },
    body: { color: colors.muted, ...typography.body, lineHeight: 22 },
  });
