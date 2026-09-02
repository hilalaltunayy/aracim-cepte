import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MaintenanceTemplate } from '@/domain/entities';
import {
  defaultMaintenancePackages,
  getMaintenanceItemLabel,
  isCustomMaintenanceItemId,
  maintenanceCatalog,
} from '@/features/maintenance/config/maintenanceCatalog';
import {
  addCustomMaintenanceItem,
  clonePackageItemIds,
  toggleMaintenanceItem,
} from '@/features/maintenance/domain/maintenancePackages';
import { AppButton, AppInput, SelectField, confirmAction } from '@/shared/components/ui';
import { fontFamilies, radii, spacing, useThemedStyles, type AppTheme } from '@/shared/theme';

export type MaintenancePackageKey = `default:${string}` | `user:${string}` | 'manual';

export function MaintenanceOperationsField({
  selectedItemIds,
  selectedPackageKey,
  templates,
  loading,
  onSelectionChange,
  onPackageChange,
  onCreateTemplate,
  onDeleteTemplate,
}: {
  selectedItemIds: string[];
  selectedPackageKey: MaintenancePackageKey;
  templates: MaintenanceTemplate[];
  loading: boolean;
  onSelectionChange: (itemIds: string[]) => void;
  onPackageChange: (key: MaintenancePackageKey, title: string | null, itemIds: string[]) => void;
  onCreateTemplate: (title: string, itemIds: string[]) => Promise<boolean>;
  onDeleteTemplate: (id: string) => Promise<boolean>;
}) {
  const styles = useThemedStyles(createStyles);
  const [creating, setCreating] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateItems, setTemplateItems] = useState<string[]>([]);
  const [customOperation, setCustomOperation] = useState('');
  const options = useMemo(
    () => [
      { value: 'manual' as const, label: 'İşlemleri kendim seçeyim' },
      ...defaultMaintenancePackages.map((item) => ({
        value: `default:${item.id}` as MaintenancePackageKey,
        label: item.title,
      })),
      ...templates.map((item) => ({
        value: `user:${item.id}` as MaintenancePackageKey,
        label: item.title,
      })),
    ],
    [templates],
  );

  const applyPackage = (key: MaintenancePackageKey) => {
    if (key === 'manual') {
      onPackageChange(key, null, []);
      return;
    }
    if (key.startsWith('default:')) {
      const item = defaultMaintenancePackages.find((value) => `default:${value.id}` === key);
      if (item) onPackageChange(key, item.title, clonePackageItemIds(item.itemIds));
      return;
    }
    const template = templates.find((value) => `user:${value.id}` === key);
    if (template)
      onPackageChange(key, template.title, clonePackageItemIds(template.itemDefinitions));
  };

  const selectedUserTemplate = selectedPackageKey.startsWith('user:')
    ? templates.find((item) => `user:${item.id}` === selectedPackageKey)
    : null;

  const beginCreate = () => {
    setTemplateTitle('');
    setTemplateItems(
      selectedItemIds.length
        ? clonePackageItemIds(selectedItemIds)
        : clonePackageItemIds(defaultMaintenancePackages[0].itemIds),
    );
    setCreating(true);
  };

  const saveTemplate = async () => {
    if (!templateTitle.trim() || templateItems.length === 0) return;
    if (await onCreateTemplate(templateTitle, clonePackageItemIds(templateItems))) {
      setCreating(false);
      setTemplateTitle('');
      setTemplateItems([]);
    }
  };
  const addCustom = () => {
    setTemplateItems((items) => addCustomMaintenanceItem(items, customOperation));
    setCustomOperation('');
  };

  return (
    <View style={styles.container}>
      <SelectField
        label="Bakım paketi"
        value={selectedPackageKey}
        options={options}
        onChange={applyPackage}
      />
      <View style={styles.actions}>
        <AppButton title="Yeni paket oluştur" variant="ghost" compact onPress={beginCreate} />
        {selectedUserTemplate ? (
          <AppButton
            title="Paketi sil"
            variant="danger"
            compact
            onPress={() =>
              confirmAction(
                'Bakım paketini sil',
                'Paket silinecek. Daha önce bu paketle kaydedilen bakımlar etkilenmez.',
                () => void onDeleteTemplate(selectedUserTemplate.id),
              )
            }
          />
        ) : null}
      </View>

      <Text style={styles.heading}>İşlemler</Text>
      <OperationList
        selected={selectedItemIds}
        onChange={onSelectionChange}
        testIDPrefix="maintenance-item"
      />

      {creating ? (
        <View style={styles.creator}>
          <Text style={styles.creatorTitle}>Bakım paketi oluştur</Text>
          <AppInput
            label="Paket adı"
            value={templateTitle}
            onChangeText={setTemplateTitle}
            maxLength={80}
          />
          <OperationList
            selected={templateItems}
            onChange={setTemplateItems}
            testIDPrefix="template-item"
          />
          <View style={styles.customRow}>
            <View style={styles.customInput}>
              <AppInput
                label="Özel işlem"
                value={customOperation}
                placeholder="Örn. Klima gazı kontrolü"
                maxLength={70}
                onChangeText={setCustomOperation}
              />
            </View>
            <AppButton
              title="Özel işlemi ekle"
              compact
              variant="secondary"
              disabled={!customOperation.trim()}
              onPress={addCustom}
            />
          </View>
          <View style={styles.actions}>
            <AppButton
              title="Vazgeç"
              variant="secondary"
              compact
              onPress={() => setCreating(false)}
            />
            <AppButton
              title="Paketi kaydet"
              compact
              loading={loading}
              disabled={!templateTitle.trim() || templateItems.length === 0}
              onPress={() => void saveTemplate()}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function OperationList({
  selected,
  onChange,
  testIDPrefix,
}: {
  selected: string[];
  onChange: (itemIds: string[]) => void;
  testIDPrefix: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.list} accessibilityRole="list">
      {maintenanceCatalog.map((item) => {
        const checked = selected.includes(item.id);
        return (
          <Pressable
            key={item.id}
            testID={`${testIDPrefix}-${item.id}`}
            accessibilityRole="checkbox"
            accessibilityLabel={item.label}
            accessibilityState={{ checked }}
            style={({ pressed }) => [
              styles.item,
              checked && styles.itemSelected,
              pressed && styles.pressed,
            ]}
            onPress={() => onChange(toggleMaintenanceItem(selected, item.id))}
          >
            <Ionicons
              name={checked ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              style={styles.icon}
              accessible={false}
            />
            <Text style={styles.label}>{item.label}</Text>
          </Pressable>
        );
      })}
      {selected.filter(isCustomMaintenanceItemId).map((itemId) => (
        <Pressable
          key={itemId}
          testID={`${testIDPrefix}-${itemId}`}
          accessibilityRole="checkbox"
          accessibilityLabel={`${getMaintenanceItemLabel(itemId)} özel işlemi`}
          accessibilityState={{ checked: true }}
          style={({ pressed }) => [styles.item, styles.itemSelected, pressed && styles.pressed]}
          onPress={() => onChange(toggleMaintenanceItem(selected, itemId))}
        >
          <Ionicons name="checkmark-circle" size={22} style={styles.icon} accessible={false} />
          <Text style={styles.label}>{getMaintenanceItemLabel(itemId)}</Text>
          <Ionicons name="close-circle-outline" size={20} style={styles.icon} accessible={false} />
        </Pressable>
      ))}
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    container: { gap: spacing.md },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    heading: { color: colors.navy, fontFamily: fontFamilies.semibold, fontSize: 15 },
    list: { gap: spacing.sm },
    item: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
    },
    itemSelected: { borderColor: colors.primaryAction, backgroundColor: colors.paleAqua },
    pressed: { opacity: 0.74 },
    icon: { color: colors.primaryAction },
    label: { flex: 1, color: colors.navy, fontFamily: fontFamilies.medium, fontSize: 14 },
    creator: {
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.elevatedSurface,
    },
    creatorTitle: { color: colors.navy, fontFamily: fontFamilies.semibold, fontSize: 16 },
    customRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
    customInput: { flex: 1, minWidth: 0 },
  });
