import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionSheet, AppButton, Card, ErrorBanner, type ActionSheetOption } from '@/shared/components/ui';
import type { VehiclePhoto } from '@/domain/entities';
import type { PendingAttachment } from '@/features/attachments/domain/types';
import type { PlanEntitlements } from '@/features/entitlements/domain/entitlements';
import {
  getVehiclePhotoCapacity,
  getVehiclePhotoLimitMessage,
  orderVehiclePhotos,
} from '@/features/vehicles/domain/vehiclePhotoGallery';
import { pickAttachmentFromGallery, takeAttachmentPhoto } from '@/features/attachments/services/attachmentPicker';
import { getFriendlyError } from '@/shared/utils/errors';
import {
  fontFamilies,
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { VehiclePhotoImage } from './VehiclePhotoImage';

type SourceOption = 'camera' | 'gallery';
type PickerMode = { kind: 'add' } | { kind: 'replace'; photoId: string };

const sourceOptions: ActionSheetOption<SourceOption>[] = [
  { value: 'camera', label: 'Fotoğraf çek', icon: 'camera-outline' },
  { value: 'gallery', label: 'Galeriden seç', icon: 'images-outline' },
];

export function VehiclePhotoGallery({
  vehicleName,
  photos,
  entitlements,
  busy = false,
  onSave,
  onSetPrimary,
  onDelete,
}: {
  vehicleName: string;
  photos: readonly VehiclePhoto[];
  entitlements: Pick<PlanEntitlements, 'maxVehiclePhotos'>;
  busy?: boolean;
  onSave: (attachment: PendingAttachment, replacesPhotoId?: string) => Promise<boolean>;
  onSetPrimary: (photoId: string) => Promise<boolean>;
  onDelete: (photoId: string) => Promise<boolean>;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const orderedPhotos = useMemo(() => orderVehiclePhotos(photos), [photos]);
  const primary = orderedPhotos.find((photo) => photo.isPrimary) ?? orderedPhotos[0] ?? null;
  const capacity = getVehiclePhotoCapacity(orderedPhotos.length, entitlements);
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const [viewerPhotoId, setViewerPhotoId] = useState<string | null>(null);
  const [actionsPhotoId, setActionsPhotoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const viewerIndex = viewerPhotoId
    ? orderedPhotos.findIndex((photo) => photo.id === viewerPhotoId)
    : -1;
  const viewerPhoto = viewerIndex >= 0 ? orderedPhotos[viewerIndex] ?? null : null;

  const selectSource = async (source: SourceOption) => {
    const mode = pickerMode;
    setPickerMode(null);
    if (!mode || busy) return;
    setError(null);
    try {
      const attachment = source === 'camera'
        ? await takeAttachmentPhoto()
        : await pickAttachmentFromGallery();
      if (!attachment) return;
      const saved = await onSave(attachment, mode.kind === 'replace' ? mode.photoId : undefined);
      if (!saved) setError('Fotoğraf kaydedilemedi. Lütfen tekrar deneyin.');
    } catch (caught) {
      setError(getFriendlyError(caught));
    }
  };

  const requestAdd = () => {
    if (capacity.canAdd) {
      setPickerMode({ kind: 'add' });
      return;
    }
    if (capacity.maximum === 1 && !capacity.isOverCapacity) {
      Alert.alert(
        'Fotoğraf sınırı',
        'Free plan 1 araç fotoğrafını destekler. Premium ile küçük araç galerisi kullanabilirsiniz.',
      );
      return;
    }
    setActionsPhotoId(primary?.id ?? null);
  };

  const requestDelete = (photo: VehiclePhoto) => {
    setActionsPhotoId(null);
    Alert.alert('Fotoğrafı kaldır', 'Bu fotoğraf araç profilinizden kaldırılacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: () => {
          void onDelete(photo.id).then((deleted) => {
            if (!deleted) setError('Fotoğraf kaldırılamadı. Lütfen tekrar deneyin.');
            else if (viewerPhotoId === photo.id) setViewerPhotoId(null);
          });
        },
      },
    ]);
  };

  const actionPhoto = orderedPhotos.find((photo) => photo.id === actionsPhotoId) ?? null;
  const actionOptions: ActionSheetOption<'primary' | 'replace' | 'delete'>[] = [];
  if (actionPhoto && !actionPhoto.isPrimary) {
    actionOptions.push({
      value: 'primary',
      label: 'Profil fotoğrafı yap',
      icon: 'person-circle-outline',
    });
  }
  if (actionPhoto) {
    actionOptions.push(
      { value: 'replace', label: 'Fotoğrafı değiştir', icon: 'image-outline' },
      { value: 'delete', label: 'Fotoğrafı kaldır', icon: 'trash-outline' },
    );
  }

  const runAction = async (action: 'primary' | 'replace' | 'delete') => {
    if (!actionPhoto) return;
    if (action === 'replace') {
      setActionsPhotoId(null);
      setPickerMode({ kind: 'replace', photoId: actionPhoto.id });
      return;
    }
    if (action === 'delete') {
      requestDelete(actionPhoto);
      return;
    }
    setActionsPhotoId(null);
    const updated = await onSetPrimary(actionPhoto.id);
    if (!updated) setError('Profil fotoğrafı güncellenemedi. Lütfen tekrar deneyin.');
  };

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.heading}>
          <View style={styles.headingText}>
            <Text style={styles.title}>Araç fotoğrafları</Text>
            <Text style={styles.meta}>
              {capacity.current}/{capacity.maximum} fotoğraf
              {capacity.isOverCapacity ? ' · Mevcut fotoğraflarınız korunur' : ''}
            </Text>
          </View>
          <Ionicons name="images-outline" size={21} color={colors.primary} accessible={false} />
        </View>
        {error ? <ErrorBanner message={error} /> : null}
        {primary ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${vehicleName} araç fotoğraflarını görüntüle`}
            style={({ pressed }) => [styles.previewRow, pressed && styles.pressed]}
            onPress={() => setViewerPhotoId(primary.id)}
          >
            <VehiclePhotoImage
              storagePath={primary.storagePath}
              accessibilityLabel={`${vehicleName} profil fotoğrafı`}
              style={styles.previewImage}
            />
            <View style={styles.previewText}>
              <Text style={styles.previewTitle}>Profil fotoğrafı</Text>
              <Text style={styles.meta}>
                {orderedPhotos.length === 1
                  ? 'Fotoğrafı görüntülemek veya yönetmek için dokunun'
                  : `${orderedPhotos.length - 1} ek fotoğraf daha`}
              </Text>
            </View>
            <Ionicons name="expand-outline" size={20} color={colors.muted} accessible={false} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Araç fotoğrafı ekle"
            style={({ pressed }) => [styles.emptyRow, pressed && styles.pressed]}
            onPress={() => setPickerMode({ kind: 'add' })}
            disabled={busy}
          >
            <View style={styles.emptyIcon} accessible={false}>
              <Ionicons name="camera-outline" size={21} color={colors.primary} />
            </View>
            <View style={styles.previewText}>
              <Text style={styles.previewTitle}>Araç fotoğrafı ekle</Text>
              <Text style={styles.meta}>Kamera veya galeriden bir fotoğraf seçin</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} accessible={false} />
          </Pressable>
        )}
        {primary ? (
          <View style={styles.actions}>
            <AppButton
              title={capacity.canAdd || capacity.maximum === 1 ? 'Fotoğraf ekle' : 'Fotoğrafları yönet'}
              variant="secondary"
              icon={capacity.canAdd || capacity.maximum === 1 ? 'add-circle-outline' : 'ellipsis-horizontal'}
              compact
              loading={busy}
              onPress={requestAdd}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profil fotoğrafı işlemleri"
              style={({ pressed }) => [styles.moreAction, pressed && styles.pressed]}
              onPress={() => setActionsPhotoId(primary.id)}
              disabled={busy}
            >
              <Ionicons name="ellipsis-horizontal" size={21} color={colors.primary} accessible={false} />
            </Pressable>
          </View>
        ) : null}
        {!capacity.canAdd && !capacity.isOverCapacity && primary ? (
          <Text style={styles.limitHint}>{getVehiclePhotoLimitMessage(capacity)}</Text>
        ) : null}
      </Card>

      <ActionSheet
        visible={pickerMode !== null}
        title={pickerMode?.kind === 'replace' ? 'Fotoğrafı değiştir' : 'Araç fotoğrafı ekle'}
        options={sourceOptions}
        onSelect={(source) => void selectSource(source)}
        onClose={() => setPickerMode(null)}
      />
      <ActionSheet
        visible={actionPhoto !== null}
        title="Fotoğraf işlemleri"
        options={actionOptions}
        onSelect={(action) => void runAction(action)}
        onClose={() => setActionsPhotoId(null)}
      />
      <Modal
        visible={viewerPhoto !== null}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setViewerPhotoId(null)}
      >
        <SafeAreaView style={styles.viewer} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.viewerHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fotoğraf görüntüleyiciyi kapat"
              style={styles.viewerControl}
              onPress={() => setViewerPhotoId(null)}
            >
              <Ionicons name="close" size={23} color={colors.onPrimary} accessible={false} />
            </Pressable>
            <Text style={styles.viewerCount}>{viewerIndex + 1} / {orderedPhotos.length}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fotoğraf işlemleri"
              style={styles.viewerControl}
              onPress={() => viewerPhoto && setActionsPhotoId(viewerPhoto.id)}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.onPrimary} accessible={false} />
            </Pressable>
          </View>
          {viewerPhoto ? (
            <VehiclePhotoImage
              storagePath={viewerPhoto.storagePath}
              accessibilityLabel={`${vehicleName} fotoğrafı ${viewerIndex + 1}`}
              style={styles.viewerImage}
            />
          ) : null}
          {orderedPhotos.length > 1 ? (
            <View style={styles.viewerPager}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Önceki fotoğraf"
                disabled={viewerIndex === 0}
                style={[styles.viewerControl, viewerIndex === 0 && styles.disabled]}
                onPress={() => setViewerPhotoId(orderedPhotos[viewerIndex - 1]?.id ?? null)}
              >
                <Ionicons name="chevron-back" size={22} color={colors.onPrimary} accessible={false} />
              </Pressable>
              <Text style={styles.viewerHint}>Fotoğraflar arasında gezin</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sonraki fotoğraf"
                disabled={viewerIndex === orderedPhotos.length - 1}
                style={[styles.viewerControl, viewerIndex === orderedPhotos.length - 1 && styles.disabled]}
                onPress={() => setViewerPhotoId(orderedPhotos[viewerIndex + 1]?.id ?? null)}
              >
                <Ionicons name="chevron-forward" size={22} color={colors.onPrimary} accessible={false} />
              </Pressable>
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    card: { gap: spacing.md },
    heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    headingText: { flex: 1, minWidth: 0 },
    title: { color: colors.navy, ...typography.cardTitle },
    meta: { color: colors.muted, ...typography.caption, marginTop: 3 },
    previewRow: { minHeight: 94, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    emptyRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    previewImage: { width: 116, height: 82, borderRadius: radii.md, backgroundColor: colors.paleAqua },
    previewText: { flex: 1, minWidth: 0 },
    previewTitle: { color: colors.textPrimary, ...typography.bodyMedium, fontFamily: fontFamilies.semibold },
    emptyIcon: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paleAqua },
    actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    moreAction: { width: 42, height: 42, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paleAqua },
    limitHint: { color: colors.muted, ...typography.caption },
    pressed: { opacity: 0.76 },
    viewer: { flex: 1, backgroundColor: colors.navy, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    viewerHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    viewerControl: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.modalOverlay },
    viewerCount: { color: colors.onPrimary, ...typography.bodyMedium },
    viewerImage: { flex: 1, width: '100%', borderRadius: radii.lg, backgroundColor: colors.screenBackground },
    viewerPager: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    viewerHint: { flex: 1, color: colors.onPrimary, textAlign: 'center', ...typography.caption },
    disabled: { opacity: 0.35 },
  });
