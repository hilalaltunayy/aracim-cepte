import { useMemo, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  AppButton,
  AppInput,
  ErrorBanner,
  FormSection,
  LoadingScreen,
  Screen,
  confirmAction,
} from '@/shared/components/ui';
import { useDataStore } from '@/store/dataStore';
import { spacing } from '@/shared/theme';
import { goBackOr } from '@/shared/utils/navigation';
import { resolveEntityRoute } from '@/shared/utils/repositoryRules';
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard';
import { haveFormValuesChanged } from '@/shared/utils/unsavedChanges';

export default function NoteEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { notes, saveNote, deleteNote, loading, error, bootstrapped } = useDataStore();
  const existing = useMemo(() => notes.find((note) => note.id === id), [notes, id]);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [content, setContent] = useState(existing?.content ?? '');
  const [submitted, setSubmitted] = useState(false);
  const isDirty = haveFormValuesChanged(
    { title: existing?.title ?? '', content: existing?.content ?? '' },
    { title, content },
  );
  const leaveWithoutPrompt = useUnsavedChangesGuard(isDirty);
  const routeState = resolveEntityRoute(id, notes, bootstrapped);
  const submit = async () => {
    setSubmitted(true);
    if (!title.trim() || !content.trim()) return;
    if (await saveNote({ title, content }, existing?.id)) {
      leaveWithoutPrompt(() => {
        Alert.alert('Kaydedildi', 'Araç notunuz kaydedildi.');
        goBackOr('/notes');
      });
    }
  };
  if (routeState === 'loading') return <LoadingScreen />;
  if (routeState === 'missing') {
    return (
      <Screen style={styles.form}>
        <ErrorBanner message="Bu not silinmiş veya artık erişilebilir değil." />
        <AppButton title="Notlara dön" onPress={() => goBackOr('/notes')} />
      </Screen>
    );
  }
  return (
    <Screen style={styles.form}>
      {error ? <ErrorBanner message={error} /> : null}
      <FormSection
        title="Not ayrıntıları"
        description="Bakım gözlemlerini veya araçla ilgili önemli bilgileri kaydedin."
      >
        <AppInput
          label="Başlık"
          value={title}
          onChangeText={setTitle}
          error={submitted && !title.trim() ? 'Başlık gereklidir.' : null}
        />
        <AppInput
          label="Not"
          value={content}
          onChangeText={setContent}
          multiline
          error={submitted && !content.trim() ? 'Not içeriği gereklidir.' : null}
        />
      </FormSection>
      <AppButton title="Notu kaydet" loading={loading} onPress={submit} />
      {existing ? (
        <AppButton
          title="Notu sil"
          variant="danger"
          onPress={() =>
            confirmAction('Notu sil', 'Bu not kalıcı olarak silinecek.', async () => {
              if (await deleteNote(existing.id)) leaveWithoutPrompt(() => goBackOr('/notes'));
            })
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.xl } });
