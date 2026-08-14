import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/shared/components/ui';
import { formatDate, parseDateOnly, parseTimeOnly, toTimeOnly } from '@/shared/utils/format';
import {
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { DEFAULT_REMINDER_TIME } from './reminderDateTimeValidation';
import {
  canSaveReminderDateAtTime,
  dateForReminderCalendar,
  getReminderYearRange,
  REMINDER_MONTH_NAMES,
} from './reminderSchedulePreferences';

const WEEKDAY_NAMES = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'];

type ViewMonth = { year: number; monthIndex: number };

function monthFor(value: string | null, now: Date): ViewMonth {
  const parsed = value ? parseDateOnly(value) : null;
  return parsed
    ? { year: parsed.getFullYear(), monthIndex: parsed.getMonth() }
    : { year: now.getFullYear(), monthIndex: now.getMonth() };
}

function shiftMonth(view: ViewMonth, change: number): ViewMonth {
  const date = new Date(view.year, view.monthIndex + change, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

export function ReminderScheduleFields({
  date,
  time,
  onDateChange,
  onTimeChange,
  canCustomizeTime,
}: {
  date: string | null;
  time: string;
  onDateChange: (value: string | null) => void;
  onTimeChange: (value: string) => void;
  canCustomizeTime: boolean;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(() => monthFor(date, now));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const years = getReminderYearRange(now);
  const days = useMemo(() => {
    const firstWeekday = (new Date(viewMonth.year, viewMonth.monthIndex, 1).getDay() + 6) % 7;
    const count = new Date(viewMonth.year, viewMonth.monthIndex + 1, 0).getDate();
    return Array.from({ length: firstWeekday + count }, (_, index) =>
      index < firstWeekday ? null : index - firstWeekday + 1,
    );
  }, [viewMonth]);
  const selectedTime = parseTimeOnly(time) ?? parseTimeOnly(DEFAULT_REMINDER_TIME) ?? new Date();
  const selectDate = (day: number) => {
    const value = dateForReminderCalendar(viewMonth.year, viewMonth.monthIndex, day);
    if (!canSaveReminderDateAtTime(value, time)) return;
    onDateChange(value);
  };
  const selectMonthYear = (monthIndex: number, year: number) => {
    setViewMonth({ year, monthIndex });
    setPickerOpen(false);
  };
  const changeTime = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android' || event.type === 'dismissed') setTimePickerOpen(false);
    if (event.type === 'set' && selectedDate) onTimeChange(toTimeOnly(selectedDate));
  };
  const previous = shiftMonth(viewMonth, -1);
  const next = shiftMonth(viewMonth, 1);
  const canMovePrevious =
    previous.year >= now.getFullYear() &&
    (previous.year > now.getFullYear() || previous.monthIndex >= now.getMonth());
  const canMoveNext = next.year <= 2040;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Hatırlatma tarihi</Text>
        {date ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hatırlatma tarihini temizle"
            onPress={() => onDateChange(null)}
            hitSlop={8}
          >
            <Text style={styles.clear}>Temizle</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${REMINDER_MONTH_NAMES[viewMonth.monthIndex]} ${viewMonth.year}; ay ve yıl seç`}
            style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
            onPress={() => setPickerOpen(true)}
          >
            <Text style={styles.monthButtonText}>
              {REMINDER_MONTH_NAMES[viewMonth.monthIndex]} {viewMonth.year}
            </Text>
            <Ionicons
              name="chevron-down"
              size={18}
              color={colors.primaryAction}
              accessible={false}
            />
          </Pressable>
          <View style={styles.navigation}>
            <Pressable
              disabled={!canMovePrevious}
              accessibilityRole="button"
              accessibilityLabel="Önceki ay"
              style={({ pressed }) => [
                styles.navButton,
                (!canMovePrevious || pressed) && styles.navPressed,
              ]}
              onPress={() => canMovePrevious && setViewMonth(previous)}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={canMovePrevious ? colors.textPrimary : colors.disabledText}
              />
            </Pressable>
            <Pressable
              disabled={!canMoveNext}
              accessibilityRole="button"
              accessibilityLabel="Sonraki ay"
              style={({ pressed }) => [
                styles.navButton,
                (!canMoveNext || pressed) && styles.navPressed,
              ]}
              onPress={() => canMoveNext && setViewMonth(next)}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={canMoveNext ? colors.textPrimary : colors.disabledText}
              />
            </Pressable>
          </View>
        </View>
        <View style={styles.weekRow}>
          {WEEKDAY_NAMES.map((label) => (
            <Text key={label} style={styles.weekday}>
              {label}
            </Text>
          ))}
        </View>
        <View style={styles.days}>
          {days.map((day, index) => {
            if (!day) return <View key={`blank-${index}`} style={styles.day} />;
            const value = dateForReminderCalendar(viewMonth.year, viewMonth.monthIndex, day);
            const isSelected = value === date;
            const disabled = !canSaveReminderDateAtTime(value, time);
            return (
              <Pressable
                key={value}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`${day} ${REMINDER_MONTH_NAMES[viewMonth.monthIndex]} ${viewMonth.year}`}
                accessibilityState={{ selected: isSelected, disabled }}
                style={({ pressed }) => [
                  styles.day,
                  isSelected && styles.daySelected,
                  (disabled || pressed) && styles.dayPressed,
                ]}
                onPress={() => selectDate(day)}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    disabled && styles.dayTextDisabled,
                  ]}
                >
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={styles.helper}>
        {date ? `Seçilen tarih: ${formatDate(date)}` : 'Takvimden bir tarih seçin.'}
      </Text>
      {date ? (
        <View style={styles.timeBlock}>
          <Text style={styles.label}>Bildirim saati</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              canCustomizeTime
                ? `Bildirim saati: ${time}`
                : `Bildirim saati: ${time}. Ücretsiz planda sabittir.`
            }
            accessibilityState={{ disabled: !canCustomizeTime }}
            style={({ pressed }) => [
              styles.timeField,
              !canCustomizeTime && styles.timeReadOnly,
              pressed && canCustomizeTime && styles.pressed,
            ]}
            onPress={() => canCustomizeTime && setTimePickerOpen(true)}
          >
            <View>
              <Text style={styles.timeValue}>{time}</Text>
              <Text style={styles.timeHelper}>
                {canCustomizeTime
                  ? 'Saati değiştirmek için dokunun.'
                  : 'Ücretsiz planda bildirimler 09:00’da gönderilir.'}
              </Text>
            </View>
            <Ionicons
              name={canCustomizeTime ? 'time-outline' : 'lock-closed-outline'}
              size={20}
              color={canCustomizeTime ? colors.primaryAction : colors.textSecondary}
              accessible={false}
            />
          </Pressable>
          {canCustomizeTime && timePickerOpen ? (
            <View style={styles.nativePicker}>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="default"
                is24Hour
                locale="tr-TR"
                onChange={changeTime}
              />
            </View>
          ) : null}
        </View>
      ) : null}
      <BottomSheet visible={pickerOpen} title="Ay ve yıl seç" onClose={() => setPickerOpen(false)}>
        <View style={styles.pickerColumns}>
          <View style={styles.pickerColumn}>
            <Text style={styles.pickerLabel}>Ay</Text>
            {REMINDER_MONTH_NAMES.map((month, index) => (
              <Pressable
                key={month}
                accessibilityRole="radio"
                accessibilityState={{ selected: index === viewMonth.monthIndex }}
                style={[
                  styles.pickerRow,
                  index === viewMonth.monthIndex && styles.pickerRowSelected,
                ]}
                onPress={() => selectMonthYear(index, viewMonth.year)}
              >
                <Text style={styles.pickerText}>{month}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.pickerColumn}>
            <Text style={styles.pickerLabel}>Yıl</Text>
            {years.map((year) => (
              <Pressable
                key={year}
                accessibilityRole="radio"
                accessibilityState={{ selected: year === viewMonth.year }}
                style={[styles.pickerRow, year === viewMonth.year && styles.pickerRowSelected]}
                onPress={() => selectMonthYear(viewMonth.monthIndex, year)}
              >
                <Text style={styles.pickerText}>{year}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { gap: spacing.sm },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { color: theme.colors.textPrimary, ...typography.label },
    clear: { color: theme.colors.primaryAction, ...typography.label },
    calendarCard: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: radii.lg,
      padding: spacing.md,
      gap: spacing.md,
    },
    calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    monthButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.sm,
    },
    monthButtonText: { color: theme.colors.textPrimary, ...typography.bodyMedium },
    navigation: { flexDirection: 'row', gap: spacing.xs },
    navButton: {
      width: 34,
      height: 34,
      borderRadius: radii.sm,
      backgroundColor: theme.colors.neutralSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navPressed: { opacity: 0.55 },
    pressed: { backgroundColor: theme.colors.paleAqua },
    weekRow: { flexDirection: 'row' },
    weekday: {
      flex: 1,
      textAlign: 'center',
      color: theme.colors.textSecondary,
      ...typography.caption,
    },
    days: { flexDirection: 'row', flexWrap: 'wrap' },
    day: {
      width: '14.2857%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.pill,
    },
    daySelected: { backgroundColor: theme.colors.primaryAction },
    dayPressed: { opacity: 0.58 },
    dayText: { color: theme.colors.textPrimary, ...typography.bodyMedium },
    dayTextSelected: { color: theme.colors.onPrimary },
    dayTextDisabled: { color: theme.colors.disabledText },
    helper: { color: theme.colors.textSecondary, ...typography.caption },
    timeBlock: { gap: spacing.sm, marginTop: spacing.sm },
    timeField: {
      minHeight: 66,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: radii.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    timeReadOnly: { backgroundColor: theme.colors.elevatedSurface },
    timeValue: { color: theme.colors.textPrimary, ...typography.bodyMedium },
    timeHelper: { color: theme.colors.textSecondary, ...typography.caption },
    nativePicker: {
      borderRadius: radii.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.elevatedSurface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pickerColumns: { flexDirection: 'row', gap: spacing.md, maxHeight: 380 },
    pickerColumn: { flex: 1, gap: spacing.xs },
    pickerLabel: { color: theme.colors.textSecondary, ...typography.label },
    pickerRow: {
      minHeight: 40,
      borderRadius: radii.sm,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
    },
    pickerRowSelected: { backgroundColor: theme.colors.paleAqua },
    pickerText: { color: theme.colors.textPrimary, ...typography.bodyMedium },
  });
