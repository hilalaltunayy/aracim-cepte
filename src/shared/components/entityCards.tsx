import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Reminder, VehicleDocument, VehicleRecord } from '@/domain/entities';
import {
  recordTypeLabels,
  reminderTypeLabels,
  documentTypeLabels,
} from '@/shared/constants/labels';
import {
  fontFamilies,
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { formatCurrency, formatDate, formatNumber } from '@/shared/utils/format';
import {
  getDocumentExpiryStatus,
  getReminderKilometerProgress,
  getReminderStatus,
} from '@/shared/utils/analytics';
import { Card, StatusBadge } from './ui';

const recordIcons = {
  fuel: 'water-outline',
  maintenance: 'construct-outline',
  expense: 'receipt-outline',
} as const;

export function RecordCard({ record, onPress }: { record: VehicleRecord; onPress?: () => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${record.category} kaydını aç` : undefined}
      style={({ pressed }) => pressed && onPress && styles.cardPressed}
      onPress={onPress}
      disabled={!onPress}
    >
      <Card style={styles.rowCard}>
        <View style={styles.icon}>
          <Ionicons
            name={recordIcons[record.recordType]}
            size={22}
            color={colors.primary}
            accessible={false}
          />
        </View>
        <View style={styles.content}>
          <View style={styles.between}>
            <Text style={styles.rowTitle}>{record.category}</Text>
            <Text style={styles.amount}>{formatCurrency(record.amount)}</Text>
          </View>
          <Text style={styles.meta}>
            {recordTypeLabels[record.recordType]} · {formatDate(record.recordDate)}
          </Text>
          {record.kilometer !== null ? (
            <Text style={styles.meta}>{formatNumber(record.kilometer)} km</Text>
          ) : null}
          {record.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {record.description}
            </Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const reminderLabels = {
  completed: ['Tamamlandı', 'success'],
  overdue: ['Süresi Geçti', 'danger'],
  due: ['Zamanı Geldi', 'warning'],
  upcoming: ['Yaklaşıyor', 'warning'],
  planned: ['Planlandı', 'info'],
} as const;

export function ReminderCard({
  reminder,
  currentKm,
  onPress,
  onToggle,
}: {
  reminder: Reminder;
  currentKm: number;
  onPress?: () => void;
  onToggle?: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const status = getReminderStatus(reminder, currentKm);
  const [label, tone] = reminderLabels[status];
  const kilometerProgress =
    reminder.dueKilometer === null
      ? null
      : getReminderKilometerProgress(reminder.dueKilometer, currentKm);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${reminder.title} hatırlatıcısını aç` : undefined}
      style={({ pressed }) => pressed && onPress && styles.cardPressed}
      onPress={onPress}
      disabled={!onPress}
    >
      <Card style={styles.rowCard}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`${reminder.title} tamamlandı`}
          accessibilityState={{ checked: reminder.completed, disabled: !onToggle }}
          style={({ pressed }) => [styles.check, pressed && styles.cardPressed]}
          onPress={onToggle}
          disabled={!onToggle}
        >
          <Ionicons
            name={reminder.completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={26}
            color={reminder.completed ? colors.success : colors.primary}
            accessible={false}
          />
        </Pressable>
        <View style={styles.content}>
          <View style={styles.between}>
            <Text style={styles.rowTitle}>{reminder.title}</Text>
            <StatusBadge label={label} tone={tone} />
          </View>
          <Text style={styles.meta}>{reminderTypeLabels[reminder.reminderType]}</Text>
          <Text style={styles.meta}>
            {[
              reminder.dueDate ? formatDate(reminder.dueDate) : null,
              reminder.dueKilometer !== null ? `${formatNumber(reminder.dueKilometer)} km` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {kilometerProgress ? (
            <Text style={styles.meta}>
              {kilometerProgress.overdueBy > 0
                ? `${formatNumber(kilometerProgress.overdueBy)} km geçti`
                : `${formatNumber(kilometerProgress.remaining)} km kaldı`}
            </Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const documentLabels = {
  expired: ['Süresi doldu', 'danger'],
  approaching: ['Yaklaşıyor', 'warning'],
  valid: ['Geçerli', 'success'],
  no_expiry: ['Süresiz', 'neutral'],
} as const;

export function DocumentCard({
  document,
  onPress,
}: {
  document: VehicleDocument;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const status = getDocumentExpiryStatus(document.expiryDate);
  const [label, tone] = documentLabels[status];
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${document.title} belgesini aç` : undefined}
      style={({ pressed }) => pressed && onPress && styles.cardPressed}
      onPress={onPress}
      disabled={!onPress}
    >
      <Card style={styles.rowCard}>
        <View style={styles.icon}>
          <Ionicons
            name="document-text-outline"
            size={22}
            color={colors.primary}
            accessible={false}
          />
        </View>
        <View style={styles.content}>
          <View style={styles.between}>
            <Text style={styles.rowTitle}>{document.title}</Text>
            <StatusBadge label={label} tone={tone} />
          </View>
          <Text style={styles.meta}>{documentTypeLabels[document.documentType]}</Text>
          {document.expiryDate ? (
            <Text style={styles.meta}>Bitiş: {formatDate(document.expiryDate)}</Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    rowCard: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
    cardPressed: { opacity: 0.72, transform: [{ scale: 0.992 }] },
    icon: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    check: { paddingTop: 7 },
    content: { flex: 1, gap: spacing.xs },
    between: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    rowTitle: {
      color: colors.navy,
      ...typography.bodyMedium,
      fontFamily: fontFamilies.semibold,
      flex: 1,
    },
    amount: { color: colors.navy, fontFamily: fontFamilies.semibold, fontSize: 14 },
    meta: { color: colors.muted, fontSize: 12, lineHeight: 17 },
    description: { color: colors.navy, fontSize: 13, lineHeight: 18, marginTop: 2 },
  });
