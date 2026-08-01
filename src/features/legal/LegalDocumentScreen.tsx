import { StyleSheet, Text } from 'react-native';
import { AppHeader, Card, Screen, StatusBadge } from '@/shared/components/ui';
import { colors, spacing, typography } from '@/shared/theme';
import type { LegalDocument } from './legalContent';

export function LegalDocumentScreen({ document }: { document: LegalDocument }) {
  return (
    <Screen style={styles.screen}>
      <AppHeader
        title={document.title}
        subtitle="Taslak metin — production hukuki metni değildir"
      />
      <StatusBadge label={document.status} tone="warning" />
      {document.sections.map((section) => (
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

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  section: { gap: spacing.sm },
  title: { color: colors.navy, ...typography.sectionTitle },
  body: { color: colors.muted, ...typography.body, lineHeight: 22 },
});
