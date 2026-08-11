import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton, EmptyState, Screen, SectionHeader } from '@/shared/components/ui';
import { DocumentCard } from '@/shared/components/entityCards';
import { useDataStore } from '@/store/dataStore';
import { getDocumentStatus } from '@/features/documents/domain/documentStatus';
import { spacing } from '@/shared/theme';

export default function DocumentsListScreen() {
  const documents = useDataStore((state) => state.documents);
  const groups = [
    {
      title: 'Yaklaşan süreler',
      items: documents.filter((item) => getDocumentStatus(item.expiryDate) === 'expiring_soon'),
    },
    {
      title: 'Geçerli belgeler',
      items: documents.filter((item) => getDocumentStatus(item.expiryDate) === 'active'),
    },
    {
      title: 'Süresi dolanlar',
      items: documents.filter((item) => getDocumentStatus(item.expiryDate) === 'expired'),
    },
    {
      title: 'Bitiş tarihi olmayanlar',
      items: documents.filter((item) => getDocumentStatus(item.expiryDate) === 'no_expiry'),
    },
  ];
  return (
    <Screen>
      <AppButton title="Yeni belge" icon="add" onPress={() => router.push('/documents/edit')} />
      {documents.length ? (
        groups.map((group) =>
          group.items.length ? (
            <View key={group.title} style={styles.group}>
              <SectionHeader title={group.title} />
              {group.items.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  onPress={() =>
                    router.push({ pathname: '/documents/edit', params: { id: document.id } })
                  }
                />
              ))}
            </View>
          ) : null,
        )
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

const styles = StyleSheet.create({ group: { gap: spacing.md } });
