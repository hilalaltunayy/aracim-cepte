import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton, EmptyState, ErrorBanner, Screen, StatusBadge } from '@/shared/components/ui';
import { AutomotiveBackdrop } from '@/shared/components/AutomotiveBackdrop';
import { DocumentCard } from '@/shared/components/entityCards';
import { useDataStore } from '@/store/dataStore';
import {
  filterDocumentsForArchive,
  getDocumentArchiveCounts,
  type DocumentArchiveFilter,
} from '@/features/documents/domain/documentArchive';
import { downloadPersistedAttachment } from '@/features/attachments/services/attachmentDownload';
import { getFriendlyError } from '@/shared/utils/errors';
import { radii, spacing, typography, useThemedStyles, type AppTheme } from '@/shared/theme';
import type { VehicleDocument } from '@/domain/entities';

const FILTERS: readonly { value: DocumentArchiveFilter; label: string }[] = [
  { value: 'active', label: 'Aktif' },
  { value: 'expiring_soon', label: 'Yaklaşan' },
  { value: 'archive', label: 'Arşiv' },
];

const EMPTY_STATES: Record<DocumentArchiveFilter, { title: string; message: string }> = {
  active: {
    title: 'Henüz aktif bir belge yok.',
    message: 'Yeni belge ekleyerek önemli bilgilerinizi burada tutabilirsiniz.',
  },
  expiring_soon: {
    title: 'Yakında süresi dolacak belge bulunmuyor.',
    message: 'Yaklaşan tarihler burada kolayca görünür.',
  },
  archive: {
    title: 'Arşivde geçmiş belge bulunmuyor.',
    message: 'Süresi dolan belgeler silinmeden araç geçmişinizde tutulur.',
  },
};

export default function DocumentsListScreen() {
  const styles = useThemedStyles(createStyles);
  const documents = useDataStore((state) => state.documents);
  const [filter, setFilter] = useState<DocumentArchiveFilter>('active');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const counts = getDocumentArchiveCounts(documents);
  const visibleDocuments = filterDocumentsForArchive(documents, filter);
  const emptyState = EMPTY_STATES[filter];

  // Re-download a stored document straight from the list. A single stored file
  // saves to the device via the existing signed-URL helper; a document with
  // several files opens the editor where each file has its own download.
  const downloadDocument = async (document: VehicleDocument) => {
    setDownloadError(null);
    const stored = document.attachments ?? [];
    if (stored.length !== 1) {
      router.push({ pathname: '/documents/edit', params: { id: document.id } });
      return;
    }
    try {
      await downloadPersistedAttachment(stored[0], {
        label: document.title,
        date: document.expiryDate ?? document.startDate,
      });
    } catch (caught) {
      setDownloadError(getFriendlyError(caught));
    }
  };
  return (
    <Screen backdrop={<AutomotiveBackdrop />}>
      <AppButton title="Yeni belge" icon="add" onPress={() => router.push('/documents/edit')} />
      {downloadError ? <ErrorBanner message={downloadError} /> : null}
      {documents.length ? (
        <>
          <View accessibilityRole="tablist" style={styles.filterBar}>
            {FILTERS.map((item) => {
              const selected = item.value === filter;
              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="tab"
                  accessibilityLabel={`${item.label}, ${counts[item.value]} belge`}
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(item.value)}
                  style={({ pressed }) => [
                    styles.filter,
                    selected && styles.filterSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]}>
                    {item.label}
                  </Text>
                  <StatusBadge
                    label={String(counts[item.value])}
                    tone={selected ? 'info' : 'neutral'}
                  />
                </Pressable>
              );
            })}
          </View>
          {visibleDocuments.length ? (
            <View style={styles.group}>
              {visibleDocuments.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  onPress={() =>
                    router.push({ pathname: '/documents/edit', params: { id: document.id } })
                  }
                  onDownload={downloadDocument}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title={emptyState.title}
              message={emptyState.message}
              icon="archive-outline"
            />
          )}
        </>
      ) : (
        <EmptyState
          title="Belge eklenmedi"
          message="Ruhsat, poliçe, muayene veya fatura bilgilerinizi güvenle saklayın."
          icon="documents-outline"
        />
      )}
    </Screen>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    group: { gap: spacing.md },
    filterBar: {
      flexDirection: 'row',
      gap: spacing.xs,
      padding: spacing.xs,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    filter: {
      flex: 1,
      minHeight: 48,
      paddingHorizontal: spacing.xs,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    filterSelected: { backgroundColor: colors.paleAqua },
    filterLabel: { color: colors.textSecondary, ...typography.caption, fontWeight: '600' },
    filterLabelSelected: { color: colors.primaryAction },
    pressed: { opacity: 0.78 },
  });
