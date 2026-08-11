import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Reminder, VehicleDocument, VehicleRecord } from '@/domain/entities';
import { reminderTypeLabels, documentTypeLabels } from '@/shared/constants/labels';
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
import { getReminderDisplay, getReminderKilometerProgress } from '@/shared/utils/analytics';
import { Card, StatusBadge } from './ui';
import { getRecordPresentation } from '@/features/records/recordPresentation';
import { getDocumentStatus } from '@/features/documents/domain/documentStatus';

export function RecordCard({ record, onPress }: { record: VehicleRecord; onPress?: () => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const presentation = getRecordPresentation(record);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${presentation.title} kaydını aç` : undefined}
      style={({ pressed }) => pressed && onPress && styles.cardPressed}
      onPress={onPress}
      disabled={!onPress}
    >
      <Card style={styles.rowCard}>
        <View style={styles.icon}>
          <Ionicons name={presentation.icon} size={22} color={colors.primary} accessible={false} />
        </View>
        <View style={styles.content}>
          <View style={styles.between}>
            <Text style={styles.rowTitle}>{presentation.title}</Text>
            <Text style={styles.amount}>{formatCurrency(record.amount)}</Text>
          </View>
          <Text style={styles.meta}>
            {presentation.typeLabel} · {formatDate(record.recordDate)}
            {record.recordType === 'maintenance' && record.kilometer !== null
              ? ` · ${formatNumber(record.kilometer)} km`
              : ''}
          </Text>
          {record.recordType !== 'maintenance' && record.kilometer !== null ? (
            <Text style={styles.meta}>{formatNumber(record.kilometer)} km</Text>
          ) : null}
          {presentation.summary ? <Text style={styles.meta}>{presentation.summary}</Text> : null}
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
  both_overdue: ['Tarih ve kilometre aşıldı', 'danger'],
  date_overdue: ['Süresi geçti', 'danger'],
  mileage_overdue: ['Kilometre aşıldı', 'danger'],
  mileage_due: ['Kilometre zamanı', 'warning'],
  today: ['Bugün', 'warning'],
  approaching: ['Yaklaşıyor', 'warning'],
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
  const display = getReminderDisplay(reminder, currentKm);
  const [label, tone] = reminderLabels[display.status];
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
              reminder.dueDate
                ? `${formatDate(reminder.dueDate)}${reminder.dueTime ? ` · ${reminder.dueTime}` : ''}`
                : null,
              reminder.dueKilometer !== null ? `${formatNumber(reminder.dueKilometer)} km` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {kilometerProgress
            ? display.reasons.map((reason) => (
                <Text key={reason} style={styles.meta}>
                  {reason}
                </Text>
              ))
            : null}
          {!kilometerProgress
            ? display.reasons.map((reason) => (
                <Text key={reason} style={styles.meta}>
                  {reason}
                </Text>
              ))
            : null}
        </View>
      </Card>
    </Pressable>
  );
}

const documentLabels = {
  expired: ['Süresi doldu', 'danger'],
  expiring_soon: ['Yaklaşıyor', 'warning'],
  active: ['Geçerli', 'success'],
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
  const status = getDocumentStatus(document.expiryDate);
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
