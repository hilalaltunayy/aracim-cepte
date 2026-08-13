import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Vehicle } from '@/domain/entities';
import { getVehicleColorDefinition } from '@/features/vehicles/config/vehicleColors';
import { getVehicleDisplayName } from '@/features/vehicles/domain/multiVehicle';
import { getVehicleTaxonomySummary } from '@/features/vehicles/domain/vehicleProfile';
import { fontFamilies, radii, spacing, typography, useAppTheme, useThemedStyles, type AppTheme } from '@/shared/theme';
import { getSelectionAccessibilityState } from '@/shared/utils/accessibility';
import { getSelectionModalLayout } from '@/shared/utils/selectionModalLayout';
import { VehiclePhotoImage } from './VehiclePhotoImage';

export function VehicleSwitcherSheet({
  visible,
  vehicles,
  activeVehicleId,
  capacityLabel,
  onSelect,
  onAddVehicle,
  onClose,
}: {
  visible: boolean;
  vehicles: readonly Vehicle[];
  activeVehicleId: string | null;
  capacityLabel: string;
  onSelect: (vehicleId: string) => void;
  onAddVehicle: () => void;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const layout = getSelectionModalLayout(height, insets);

  return (
    <Modal
      testID="vehicle-switcher-modal"
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { paddingTop: layout.paddingTop, paddingBottom: layout.paddingBottom }]}
        onPress={onClose}
      >
        <Pressable
          accessibilityViewIsModal
          accessibilityLabel="AraÃ§ seÃ§ici"
          style={[styles.sheet, { maxHeight: layout.maxHeight }]}
          onPress={() => undefined}
        >
          <View style={styles.handle} accessible={false} />
          <View style={styles.heading}>
            <View>
              <Text style={styles.title}>AraÃ§larÄ±nÄ±z</Text>
              <Text style={styles.subtitle}>{capacityLabel}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="AraÃ§ seÃ§iciyi kapat"
              style={styles.close}
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={colors.muted} accessible={false} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.list}
            contentContainerStyle={{ gap: spacing.sm, paddingBottom: layout.listPaddingBottom }}
            showsVerticalScrollIndicator={false}
          >
            {vehicles.map((vehicle) => {
              const selected = vehicle.id === activeVehicleId;
              const color = getVehicleColorDefinition(vehicle.colorId)?.hexFallback ?? colors.paleAqua;
              const metadata = [vehicle.year, vehicle.plate].filter(Boolean).join(' Â· ');
              return (
                <Pressable
                  key={vehicle.id}
                  accessibilityRole="radio"
                  accessibilityLabel={`${getVehicleDisplayName(vehicle)}${metadata ? `, ${metadata}` : ''}`}
                  accessibilityState={getSelectionAccessibilityState(selected)}
                  style={({ pressed }) => [
                    styles.vehicleRow,
                    selected && styles.vehicleRowSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => onSelect(vehicle.id)}
                >
                  <View style={styles.colorMark} accessible={false}>
                    {vehicle.primaryPhoto ? (
                      <VehiclePhotoImage
                        storagePath={vehicle.primaryPhoto.storagePath}
                        accessibilityLabel={`${getVehicleDisplayName(vehicle)} profil fotoğrafı`}
                        style={styles.photoThumbnail}
                      />
                    ) : (
                      <Ionicons name="car-sport-outline" size={20} color={colors.primary} accessible={false} />
                    )}
                    <View style={[styles.colorDot, { backgroundColor: color }]} />
                  </View>
                  <View style={styles.vehicleText}>
                    <Text numberOfLines={1} style={styles.vehicleName}>{getVehicleDisplayName(vehicle)}</Text>
                    <Text numberOfLines={1} style={styles.meta}>{metadata || getVehicleTaxonomySummary(vehicle)}</Text>
                  </View>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={23} color={colors.primary} accessible={false} />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={colors.muted} accessible={false} />
                  )}
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Yeni araÃ§ ekle"
              style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}
              onPress={onAddVehicle}
            >
              <View style={styles.addIcon}><Ionicons name="add" size={20} color={colors.primary} accessible={false} /></View>
              <Text style={styles.addText}>AraÃ§ ekle</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} accessible={false} />
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = ({ colors, shadows }: AppTheme) =>
  StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.modalOverlay, paddingHorizontal: spacing.md },
    sheet: { width: '100%', borderRadius: radii.xl, backgroundColor: colors.elevatedSurface, padding: spacing.md, ...shadows.floating },
    handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
    heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    title: { color: colors.navy, ...typography.cardTitle },
    subtitle: { color: colors.muted, ...typography.caption, marginTop: 2 },
    close: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBackground },
    list: { flexGrow: 0 },
    vehicleRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, backgroundColor: colors.cardBackground },
    vehicleRowSelected: { borderColor: colors.primary, backgroundColor: colors.paleAqua },
    colorMark: { width: 42, height: 42, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paleAqua },
    photoThumbnail: { width: 42, height: 42, borderRadius: radii.md, backgroundColor: colors.paleAqua },
    colorDot: { position: 'absolute', right: 4, bottom: 4, width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: colors.cardBackground },
    vehicleText: { flex: 1, minWidth: 0 },
    vehicleName: { color: colors.navy, ...typography.cardTitle },
    meta: { color: colors.muted, ...typography.caption, marginTop: 3 },
    addRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radii.lg, paddingHorizontal: spacing.md, backgroundColor: colors.inputBackground },
    addIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardBackground },
    addText: { flex: 1, color: colors.primary, fontFamily: fontFamilies.semibold, fontSize: 15 },
    pressed: { opacity: 0.76 },
  });
