import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton, Card, EmptyState, Screen } from '@/shared/components/ui';
import { useDataStore } from '@/store/dataStore';
import { spacing, typography, useThemedStyles, type AppTheme } from '@/shared/theme';
import { formatDate } from '@/shared/utils/format';
import { getNoteAccessibilityLabel } from '@/shared/utils/accessibility';

export default function NotesListScreen() {
  const styles = useThemedStyles(createStyles);
  const notes = useDataStore((state) => state.notes);
  return (
    <Screen>
      <AppButton title="Yeni not" icon="add" onPress={() => router.push('/notes/edit')} />
      {notes.length ? (
        <View style={styles.list}>
          {notes.map((note) => (
            <Pressable
              key={note.id}
              accessibilityRole="button"
              accessibilityLabel={getNoteAccessibilityLabel(note.title)}
              onPress={() => router.push({ pathname: '/notes/edit', params: { id: note.id } })}
            >
              <Card style={styles.card}>
                <Text style={styles.title}>{note.title}</Text>
                <Text style={styles.content} numberOfLines={3}>
                  {note.content}
                </Text>
                <Text style={styles.date}>Güncellendi: {formatDate(note.updatedAt)}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState
          title="Henüz not yok"
          message="Servis, parça veya kullanım bilgilerini aracınıza özel saklayın."
          icon="create-outline"
        />
      )}
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    list: { gap: spacing.md },
    card: { gap: spacing.sm },
    title: { color: colors.navy, ...typography.cardTitle },
    content: { color: colors.navy, lineHeight: 21 },
    date: { color: colors.muted, fontSize: 11 },
  });
