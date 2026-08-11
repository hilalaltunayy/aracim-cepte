import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheet, AppButton, Card, ErrorBanner } from '@/shared/components/ui';
import {
  getAttachmentValidationMessage,
  validateAttachmentCandidate,
} from '../domain/attachmentRules';
import {
  isPendingAttachment,
  type AttachmentListItem,
  type AttachmentSource,
  type PendingAttachment,
  type PersistedAttachment,
} from '../domain/types';
import {
  pickAttachmentDocument,
  pickAttachmentFromGallery,
  takeAttachmentPhoto,
} from '../services/attachmentPicker';
import {
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { getFriendlyError } from '@/shared/utils/errors';
import { ATTACHMENT_CONFIG } from '../config/attachmentConfig';

const sourceOptions = [
  { value: 'camera', label: 'Fotoğraf çek', icon: 'camera-outline' },
  { value: 'gallery', label: 'Galeriden seç', icon: 'images-outline' },
  { value: 'document', label: 'Dosya seç', icon: 'document-outline' },
] satisfies { value: AttachmentSource; label: string; icon: keyof typeof Ionicons.glyphMap }[];

function formatBytes(value: number | null): string {
  if (value === null) return 'Boyut bilgisi yok';
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function sourceLabel(source: AttachmentListItem['source']): string {
  if (source === 'camera') return 'Kamera';
  if (source === 'gallery') return 'Galeri';
  return 'Dosya';
}

export function UnifiedAttachmentField({
  items,
  onChange,
  onOpen,
  disabled = false,
  label = 'Ek dosyalar',
  helper = 'Fotoğraf ve belgeler aynı dosya sınırını paylaşır.',
}: {
  items: AttachmentListItem[];
  onChange: (items: AttachmentListItem[]) => void;
  onOpen?: (item: PersistedAttachment) => Promise<void> | void;
  disabled?: boolean;
  label?: string;
  helper?: string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState<AttachmentSource | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const select = async (source: AttachmentSource) => {
    if (busy || disabled) return;
    setError(null);
    setBusy(source);
    try {
      let candidate: PendingAttachment | null;
      if (source === 'camera') candidate = await takeAttachmentPhoto();
      else if (source === 'gallery') candidate = await pickAttachmentFromGallery();
      else candidate = await pickAttachmentDocument();
      if (!candidate) return;
      const validation = validateAttachmentCandidate(candidate, items);
      if (!validation.valid) {
        setError(getAttachmentValidationMessage(validation.code));
        return;
      }
      onChange([...items, candidate]);
    } catch (caught) {
      setError(getFriendlyError(caught));
    } finally {
      setBusy(null);
    }
  };

  const open = async (item: AttachmentListItem) => {
    if (!onOpen || isPendingAttachment(item) || openingId) return;
    setError(null);
    setOpeningId(item.id);
    try {
      await onOpen(item);
    } catch {
      setError('Dosya açılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.helper}>{helper}</Text>
        </View>
        <Text style={styles.count}>
          {items.length}/{ATTACHMENT_CONFIG.maxAttachmentsPerEntity}
        </Text>
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      {items.map((item) => {
        const pending = isPendingAttachment(item);
        const isImage = item.mimeType.startsWith('image/');
        return (
          <Card key={item.id} style={styles.file}>
            {pending && isImage ? (
              <Image source={{ uri: item.uri }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={styles.fileIcon} accessible={false}>
                <Ionicons
                  name={isImage ? 'image-outline' : 'document-text-outline'}
                  size={23}
                  color={colors.primary}
                />
              </View>
            )}
            <View style={styles.fileText}>
              <Text numberOfLines={1} style={styles.fileName}>
                {item.originalName}
              </Text>
              <Text style={styles.fileMeta}>
                {sourceLabel(item.source)} · {formatBytes(item.sizeBytes)}
              </Text>
            </View>
            {!pending && onOpen ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.originalName} dosyasını aç`}
                accessibilityState={{ busy: openingId === item.id }}
                hitSlop={8}
                disabled={openingId !== null}
                onPress={() => void open(item)}
              >
                {openingId === item.id ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Ionicons name="open-outline" size={22} color={colors.primary} />
                )}
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.originalName} dosyasını kaldır`}
              hitSlop={8}
              disabled={disabled}
              onPress={() => onChange(items.filter((candidate) => candidate.id !== item.id))}
            >
              <Ionicons name="trash-outline" size={21} color={colors.error} />
            </Pressable>
          </Card>
        );
      })}
      <AppButton
        title={busy ? 'Dosya hazırlanıyor' : 'Dosya ekle'}
        icon="add-circle-outline"
        variant="secondary"
        loading={busy !== null}
        disabled={disabled || busy !== null}
        onPress={() => setMenuOpen(true)}
      />
      <ActionSheet
        visible={menuOpen}
        title="Dosya ekle"
        options={sourceOptions}
        onSelect={(source) => void select(source)}
        onClose={() => setMenuOpen(false)}
      />
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: { gap: spacing.sm },
    headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    headingText: { flex: 1, gap: 2 },
    label: { color: colors.textPrimary, ...typography.label },
    helper: { color: colors.textSecondary, ...typography.caption },
    count: { color: colors.textSecondary, ...typography.caption },
    file: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.sm,
    },
    thumbnail: { width: 46, height: 46, borderRadius: radii.sm },
    fileIcon: {
      width: 46,
      height: 46,
      borderRadius: radii.sm,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fileText: { flex: 1, minWidth: 0 },
    fileName: { color: colors.textPrimary, ...typography.bodyMedium },
    fileMeta: { color: colors.textSecondary, ...typography.caption },
  });
