import { createElement, PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamilies, radii, shadows, spacing, typography } from '@/shared/theme';
import { isPasswordVisibleAfter } from '@/features/auth/passwordVisibility';
import { getBottomTabLayout } from '@/shared/utils/bottomTabLayout';
import { formatDate, parseDateOnly, todayDateOnly, toDateOnly } from '@/shared/utils/format';
import { withoutOptionalSuffix } from '@/shared/utils/formLabels';

export function Screen({
  children,
  scroll = true,
  style,
  backgroundColor = colors.background,
}: PropsWithChildren<{
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
}>) {
  const { bottom } = useSafeAreaInsets();
  const { screenContentPaddingBottom } = getBottomTabLayout(bottom);
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.screenContent,
        { paddingBottom: screenContentPaddingBottom },
        style,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.screenContent,
        styles.flex,
        { paddingBottom: screenContentPaddingBottom },
        style,
      ]}
    >
      {children}
    </View>
  );
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function FadeIn({ children }: PropsWithChildren) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(10));
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);
  return (
    <Animated.View style={{ width: '100%', opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export function AppHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function FormSection({
  title,
  description,
  children,
}: PropsWithChildren<{ title?: string; description?: string }>) {
  return (
    <Card style={styles.formSection}>
      {title || description ? (
        <View style={styles.formSectionHeading}>
          {title ? <Text style={styles.formSectionTitle}>{title}</Text> : null}
          {description ? <Text style={styles.formSectionDescription}>{description}</Text> : null}
        </View>
      ) : null}
      {children}
    </Card>
  );
}

export function AppButton({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  icon,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 30 }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start()
      }
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.buttonWrap,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      <Animated.View
        style={[
          styles.button,
          buttonVariants[variant],
          (disabled || loading) && styles.disabled,
          { transform: [{ scale }] },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'secondary' ? colors.primary : colors.white} />
        ) : (
          <>
            {icon ? (
              <Ionicons
                name={icon}
                size={20}
                color={
                  variant === 'secondary' || variant === 'ghost' ? colors.primary : colors.white
                }
              />
            ) : null}
            <Text
              style={[
                styles.buttonText,
                (variant === 'secondary' || variant === 'ghost') && styles.buttonTextPrimary,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function AppInput({
  label,
  error,
  multiline,
  ...props
}: TextInputProps & { label: string; error?: string | null }) {
  const [focused, setFocused] = useState(false);
  const visibleLabel = withoutOptionalSuffix(label);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{visibleLabel}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? visibleLabel}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        multiline={multiline}
        style={[
          styles.input,
          focused && styles.inputFocused,
          multiline && styles.multiline,
          error && styles.inputError,
          props.style,
        ]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function PasswordInput({
  label,
  error,
  style,
  onBlur,
  ...props
}: TextInputProps & { label: string; error?: string | null }) {
  const [visible, setVisible] = useState(false);
  const hide = () => setVisible(isPasswordVisibleAfter('cancel'));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setVisible(isPasswordVisibleAfter('background'));
    });
    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.passwordField}>
      <AppInput
        {...props}
        label={label}
        error={error}
        style={[styles.passwordInput, style]}
        secureTextEntry={!visible}
        onBlur={(event) => {
          setVisible(isPasswordVisibleAfter('blur'));
          onBlur?.(event);
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Şifreyi görmek için basılı tutun"
        accessibilityHint="Şifre yalnız basılı tuttuğunuz sürece görünür"
        hitSlop={8}
        onPressIn={() => setVisible(isPasswordVisibleAfter('press-in'))}
        onPressOut={() => setVisible(isPasswordVisibleAfter('press-out'))}
        onResponderTerminate={hide}
        style={({ pressed }) => [styles.passwordEye, pressed && styles.pressed]}
      >
        <Ionicons
          name={visible ? 'eye-off-outline' : 'eye-outline'}
          size={21}
          color={colors.muted}
        />
      </Pressable>
    </View>
  );
}

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const visibleLabel = withoutOptionalSuffix(label);
  const selected = options.find((option) => option.value === value);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{visibleLabel}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${visibleLabel}: ${selected?.label ?? 'Seçin'}`}
        style={({ pressed }) => [styles.select, pressed && styles.selectPressed]}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.selectText}>{selected?.label ?? 'Seçin'}</Text>
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{visibleLabel}</Text>
            <ScrollView style={styles.optionList}>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  style={[styles.option, option.value === value && styles.optionSelected]}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                  {option.value === value ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function DateField({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  optional?: boolean;
}) {
  const [show, setShow] = useState(false);
  const visibleLabel = withoutOptionalSuffix(label);
  const selected = value ? parseDateOnly(value) : null;
  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'dismissed') setShow(false);
    if (event.type === 'set' && date) onChange(toDateOnly(date));
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{visibleLabel}</Text>
        <View style={styles.dateRow}>
          <View style={[styles.webDateField, styles.flex]}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            {createElement('input', {
              type: 'date',
              value: value ?? '',
              'aria-label': visibleLabel,
              onInput: (event: { target: { value: string } }) =>
                onChange(event.target.value || null),
              onChange: (event: { target: { value: string } }) =>
                onChange(event.target.value || null),
              style: webDateInputStyle,
            })}
          </View>
          {optional && value ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${visibleLabel} alanını temizle`}
              style={({ pressed }) => [styles.clearButton, pressed && styles.selectPressed]}
              onPress={() => onChange(null)}
            >
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.dateHelper}>
          {value ? `Seçili tarih: ${formatDate(value)}` : 'Takvimden bir tarih seçin.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{visibleLabel}</Text>
      <View style={styles.dateRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${visibleLabel}: ${value ? formatDate(value) : 'Tarih seçin'}`}
          style={({ pressed }) => [styles.select, styles.flex, pressed && styles.selectPressed]}
          onPress={() => setShow(true)}
        >
          <Text style={styles.selectText}>{value ? formatDate(value) : 'Tarih seçin'}</Text>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </Pressable>
        {optional && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${visibleLabel} alanını temizle`}
            style={({ pressed }) => [styles.clearButton, pressed && styles.selectPressed]}
            onPress={() => onChange(null)}
          >
            <Ionicons name="close" size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {show ? (
        <View style={styles.nativePicker}>
          <DateTimePicker
            value={selected ?? parseDateOnly(todayDateOnly()) ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            locale="tr-TR"
            onChange={handleChange}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.pickerDone, pressed && styles.selectPressed]}
              onPress={() => setShow(false)}
            >
              <Text style={styles.pickerDoneText}>Bitti</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
          onPress={onAction}
        >
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  message,
  icon = 'leaf-outline',
}: {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Card style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </Card>
  );
}

export function LoadingScreen() {
  return (
    <SafeAreaView style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Aracınız hazırlanıyor…</Text>
    </SafeAreaView>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorBanner}>
      <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
      <Text style={styles.errorBannerText}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry}>
          <Text style={styles.retry}>Tekrar dene</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function StatusBadge({
  label,
  tone = 'info',
}: {
  label: string;
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
}) {
  return (
    <View style={[styles.badge, badgeTones[tone]]}>
      <Text style={[styles.badgeText, badgeTextTones[tone]]}>{label}</Text>
    </View>
  );
}

export function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: onConfirm },
  ]);
}

const buttonVariants = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.paleAqua, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: 'transparent' },
});
const badgeTones = StyleSheet.create({
  info: { backgroundColor: '#E7F1FB' },
  success: { backgroundColor: '#E2F5EF' },
  warning: { backgroundColor: '#FFF2DF' },
  danger: { backgroundColor: '#FDE8E8' },
  neutral: { backgroundColor: '#EFF3F4' },
});
const badgeTextTones = StyleSheet.create({
  info: { color: colors.info },
  success: { color: colors.success },
  warning: { color: '#A86412' },
  danger: { color: colors.danger },
  neutral: { color: colors.muted },
});

const webDateInputStyle = {
  minHeight: 48,
  flex: 1,
  width: '100%',
  color: colors.navy,
  fontFamily: fontFamilies.regular,
  fontSize: 15,
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  screenContent: {
    width: '100%',
    maxWidth: 720,
    boxSizing: 'border-box',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: spacing.lg,
    gap: 20,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { flex: 1, gap: spacing.xs },
  title: { color: colors.navy, ...typography.screenTitle },
  subtitle: { color: colors.muted, ...typography.body },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    ...shadows.card,
  },
  formSection: { gap: 18 },
  formSectionHeading: { gap: spacing.xs },
  formSectionTitle: { color: colors.navy, ...typography.cardTitle },
  formSectionDescription: { color: colors.muted, ...typography.caption },
  buttonWrap: { minHeight: 52, width: '100%' },
  button: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.55 },
  buttonText: { color: colors.white, ...typography.button },
  buttonTextPrimary: { color: colors.primary },
  field: { gap: 7 },
  fieldLabel: { color: colors.navy, ...typography.label },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    color: colors.navy,
    fontFamily: fontFamilies.regular,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  multiline: { minHeight: 110, paddingTop: spacing.md, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, ...typography.caption },
  passwordField: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  passwordEye: { position: 'absolute', right: 16, top: 40 },
  select: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  selectPressed: { backgroundColor: colors.paleAqua, borderColor: colors.borderStrong },
  selectText: { color: colors.navy, ...typography.bodyMedium, flexShrink: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  modalCard: {
    maxHeight: '75%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: { color: colors.navy, ...typography.sectionTitle },
  optionList: { maxHeight: 420 },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  optionSelected: { backgroundColor: colors.paleAqua },
  optionText: { color: colors.navy, ...typography.body },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  webDateField: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dateHelper: { color: colors.muted, ...typography.caption },
  nativePicker: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerDone: { alignSelf: 'flex-end', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  pickerDoneText: { color: colors.primary, ...typography.label },
  clearButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.paleAqua,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionTitle: { color: colors.navy, ...typography.sectionTitle },
  sectionAction: { color: colors.primary, ...typography.label },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.paleAqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: colors.navy, ...typography.cardTitle, textAlign: 'center' },
  emptyMessage: { color: colors.muted, ...typography.body, textAlign: 'center' },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: { color: colors.muted, ...typography.bodyMedium },
  errorBanner: {
    backgroundColor: '#FFF2F2',
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorBannerText: { color: colors.navy, flex: 1, ...typography.caption },
  retry: { color: colors.danger, ...typography.label },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { ...typography.status },
});
