import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, Card } from './ui';
import { PickedAttachment, pickDocument, pickImage } from '@/data/storage/attachments';
import { colors, spacing, typography } from '@/shared/theme';
import { getFriendlyError } from '@/shared/utils/errors';

export function AttachmentField({
  picked,
  existingPath,
  onPick,
  onRemove,
}: {
  picked: PickedAttachment | null;
  existingPath: string | null;
  onPick: (file: PickedAttachment) => void;
  onRemove: () => void;
}) {
  const fileName = picked?.name ?? existingPath?.split('/').at(-1) ?? null;
  const choose = async (source: 'image' | 'document') => {
    try {
      const file = source === 'image' ? await pickImage() : await pickDocument();
      if (file) onPick(file);
    } catch (error) {
      Alert.alert('Dosya seçilemedi', getFriendlyError(error));
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Ek dosya (isteğe bağlı)</Text>
      {fileName ? (
        <Card style={styles.file}>
          <Ionicons name="document-attach-outline" size={24} color={colors.primary} />
          <Text numberOfLines={2} style={styles.fileName}>
            {fileName}
          </Text>
          <AppButton title="Kaldır" variant="ghost" onPress={onRemove} />
        </Card>
      ) : null}
      <View style={styles.actions}>
        <View style={styles.action}>
          <AppButton
            title="Fotoğraf seç"
            variant="secondary"
            icon="image-outline"
            onPress={() => void choose('image')}
          />
        </View>
        <View style={styles.action}>
          <AppButton
            title="Belge seç"
            variant="secondary"
            icon="document-outline"
            onPress={() => void choose('document')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { color: colors.navy, ...typography.label },
  file: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  fileName: { flex: 1, color: colors.navy, fontSize: 12 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
