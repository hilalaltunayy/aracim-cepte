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
  useWindowDimensions,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fontFamilies,
  getButtonLoadingIndicatorColor,
  layout,
  radii,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from '@/shared/theme';
import { isPasswordVisibleAfter } from '@/features/auth/passwordVisibility';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { getBottomTabLayout } from '@/shared/utils/bottomTabLayout';
import {
  formatDate,
  parseDateOnly,
  parseTimeOnly,
  todayDateOnly,
  toDateOnly,
  toTimeOnly,
} from '@/shared/utils/format';
import { withoutOptionalSuffix } from '@/shared/utils/formLabels';
import {
  getButtonAccessibility,
  getSelectionAccessibilityState,
} from '@/shared/utils/accessibility';
import { getSelectionModalLayout } from '@/shared/utils/selectionModalLayout';

const useStyles = () => useThemedStyles(createStyles);

export function Screen({
  children,
  scroll = true,
  style,
  backgroundColor,
  scrollEnabled = true,
  backdrop,
}: PropsWithChildren<{
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  scrollEnabled?: boolean;
  /**
   * Fixed decorative layer rendered behind (and outside) the scroll area so it
   * never parallaxes. Callers pass `<AutomotiveBackdrop />`.
   */
  backdrop?: ReactNode;
}>) {
  const { colors } = useAppTheme();
  const styles = useStyles();
  const resolvedBackground = backgroundColor ?? colors.screenBackground;
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
      scrollEnabled={scrollEnabled}
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
    <SafeAreaView
      style={[styles.safe, { backgroundColor: resolvedBackground }]}
      edges={['top', 'left', 'right']}
    >
      {backdrop ?? null}
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
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
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
  const styles = useStyles();
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
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function FormSection({
  title,
  description,
  children,
}: PropsWithChildren<{ title?: string; description?: string }>) {
  const styles = useStyles();
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
  compact,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
}) {
  const { colors } = useAppTheme();
  const styles = useStyles();
  const [scale] = useState(() => new Animated.Value(1));
  const accessibility = getButtonAccessibility(title, disabled, loading);
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={() =>
        Animated.timing(scale, { toValue: 0.98, duration: 90, useNativeDriver: true }).start()
      }
      onPressOut={() =>
        Animated.timing(scale, { toValue: 1, duration: 130, useNativeDriver: true }).start()
      }
      accessibilityRole="button"
      accessibilityLabel={accessibility.label}
      accessibilityState={accessibility.state}
      style={({ pressed }) => [
        styles.buttonWrap,
        compact && styles.buttonWrapCompact,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      <Animated.View
        style={[
          styles.button,
          compact && styles.buttonCompact,
          styles[`button_${variant}`],
          (disabled || loading) && styles.disabled,
          { transform: [{ scale }] },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={getButtonLoadingIndicatorColor(colors)} />
        ) : (
          <>
            {icon ? (
              <Ionicons
                name={icon}
                size={20}
                color={
                  disabled
                    ? colors.disabledText
                    : variant === 'secondary' || variant === 'ghost'
                      ? colors.primaryAction
                      : colors.onPrimary
                }
                accessible={false}
              />
            ) : null}
            <Text
              style={[
                styles.buttonText,
                (variant === 'secondary' || variant === 'ghost') && styles.buttonTextPrimary,
                disabled && styles.buttonTextDisabled,
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
  const { colors } = useAppTheme();
  const styles = useStyles();
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
  const { colors } = useAppTheme();
  const styles = useStyles();
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [eyeAnim] = useState(() => new Animated.Value(1));
  const hide = () => setVisible(isPasswordVisibleAfter('cancel'));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setVisible(isPasswordVisibleAfter('background'));
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    eyeAnim.setValue(0.6);
    Animated.spring(eyeAnim, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
  }, [eyeAnim, reducedMotion, visible]);

  return (
    <View style={styles.passwordField}>
      <FloatingField
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
        <Animated.View
          style={{
            transform: [
              { scale: eyeAnim },
              {
                rotate: eyeAnim.interpolate({ inputRange: [0.6, 1], outputRange: ['-18deg', '0deg'] }),
              },
            ],
          }}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={21}
            color={colors.muted}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

/**
 * Independent rounded input with an animated floating label (no external form
 * card, no stacked label + placeholder). Accessibility label always resolves to
 * the field name. Shares the base input styling with {@link AppInput}.
 */
export function FloatingField({
  label,
  error,
  value,
  multiline,
  ...props
}: TextInputProps & { label: string; error?: string | null }) {
  const { colors } = useAppTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const visibleLabel = withoutOptionalSuffix(label);
  const floated = focused || Boolean(value && String(value).length > 0);
  const [progress] = useState(() => new Animated.Value(floated ? 1 : 0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: floated ? 1 : 0,
      duration: 140,
      useNativeDriver: false,
    }).start();
  }, [floated, progress]);

  return (
    <View style={styles.field}>
      <View style={[styles.floatingWrap, multiline && styles.multiline]}>
        <Animated.Text
          pointerEvents="none"
          style={[
            styles.floatingLabel,
            {
              top: progress.interpolate({ inputRange: [0, 1], outputRange: [17, 7] }),
              fontSize: progress.interpolate({ inputRange: [0, 1], outputRange: [15, 11] }),
              color: error
                ? colors.error
                : floated
                  ? colors.primaryAction
                  : colors.muted,
            },
          ]}
        >
          {visibleLabel}
        </Animated.Text>
        <TextInput
          placeholderTextColor={colors.muted}
          {...props}
          value={value}
          multiline={multiline}
          accessibilityLabel={props.accessibilityLabel ?? visibleLabel}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={[
            styles.input,
            styles.floatingInput,
            focused && styles.inputFocused,
            multiline && styles.multiline,
            error && styles.inputError,
            props.style,
          ]}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  swatchColor?: string;
}

export interface ActionSheetOption<T extends string> {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Shared safe-area modal surface for compact, feature-specific picker content. */
export function BottomSheet({
  visible,
  title,
  children,
  onClose,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
}>) {
  const { colors } = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const modalLayout = getSelectionModalLayout(windowHeight, insets);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[
          styles.modalBackdrop,
          { paddingTop: modalLayout.paddingTop, paddingBottom: modalLayout.paddingBottom },
        ]}
        onPress={onClose}
      >
        <Pressable
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={[styles.modalCard, { maxHeight: modalLayout.maxHeight }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.modalHandle} accessible={false} />
          <View style={styles.bottomSheetHeading}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              hitSlop={8}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: modalLayout.listPaddingBottom }}>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ActionSheet<T extends string>({
  visible,
  title,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: ActionSheetOption<T>[];
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const modalLayout = getSelectionModalLayout(windowHeight, insets);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[
          styles.modalBackdrop,
          { paddingTop: modalLayout.paddingTop, paddingBottom: modalLayout.paddingBottom },
        ]}
        onPress={onClose}
      >
        <View
          testID="action-sheet-card"
          accessibilityViewIsModal
          style={[styles.modalCard, { maxHeight: modalLayout.maxHeight }]}
        >
          <View style={styles.modalHandle} accessible={false} />
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView
            testID="action-sheet-options"
            style={styles.optionList}
            contentContainerStyle={{ paddingBottom: modalLayout.listPaddingBottom }}
          >
            {options.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                style={({ pressed }) => [styles.option, pressed && styles.optionSelected]}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <View style={styles.selectValue}>
                  {option.icon ? (
                    <Ionicons
                      name={option.icon}
                      size={22}
                      color={colors.primary}
                      accessible={false}
                    />
                  ) : null}
                  <Text style={styles.optionText}>{option.label}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.muted}
                  accessible={false}
                />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
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
  const { colors } = useAppTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const modalLayout = getSelectionModalLayout(windowHeight, insets);
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
        <View style={styles.selectValue}>
          {selected?.swatchColor ? (
            <View
              accessible={false}
              style={[styles.colorSwatch, { backgroundColor: selected.swatchColor }]}
            />
          ) : null}
          <Text style={styles.selectText}>{selected?.label ?? 'Seçin'}</Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[
            styles.modalBackdrop,
            { paddingTop: modalLayout.paddingTop, paddingBottom: modalLayout.paddingBottom },
          ]}
          onPress={() => setOpen(false)}
        >
          <View
            testID="selection-modal-card"
            accessibilityViewIsModal
            style={[styles.modalCard, { maxHeight: modalLayout.maxHeight }]}
          >
            <View style={styles.modalHandle} accessible={false} />
            <Text style={styles.modalTitle}>{visibleLabel}</Text>
            <ScrollView
              testID="selection-modal-options"
              style={styles.optionList}
              contentContainerStyle={{ paddingBottom: modalLayout.listPaddingBottom }}
            >
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={getSelectionAccessibilityState(option.value === value)}
                  style={[styles.option, option.value === value && styles.optionSelected]}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <View style={styles.selectValue}>
                    {option.swatchColor ? (
                      <View
                        accessible={false}
                        style={[styles.colorSwatch, { backgroundColor: option.swatchColor }]}
                      />
                    ) : null}
                    <Text style={styles.optionText}>{option.label}</Text>
                  </View>
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
  const { colors } = useAppTheme();
  const styles = useStyles();
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
              style: createWebDateInputStyle(colors.textPrimary),
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

export function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { colors } = useAppTheme();
  const styles = useStyles();
  const [show, setShow] = useState(false);
  const selected = parseTimeOnly(value) ?? parseTimeOnly('09:00') ?? new Date();
  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'dismissed') setShow(false);
    if (event.type === 'set' && date) onChange(toTimeOnly(date));
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={[styles.webDateField, styles.flex]}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          {createElement('input', {
            type: 'time',
            value,
            'aria-label': label,
            onInput: (event: { target: { value: string } }) => onChange(event.target.value),
            onChange: (event: { target: { value: string } }) => onChange(event.target.value),
            style: createWebDateInputStyle(colors.textPrimary),
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        style={({ pressed }) => [styles.select, pressed && styles.selectPressed]}
        onPress={() => setShow(true)}
      >
        <Text style={styles.selectText}>{value}</Text>
        <Ionicons name="time-outline" size={20} color={colors.primary} />
      </Pressable>
      {show ? (
        <View style={styles.nativePicker}>
          <DateTimePicker
            value={selected}
            mode="time"
            display="default"
            is24Hour
            locale="tr-TR"
            onChange={handleChange}
          />
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
  const styles = useStyles();
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
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
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useStyles();
  return (
    <Card style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} accessible={false} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <AppButton title={actionLabel} variant="secondary" compact onPress={onAction} />
      ) : null}
    </Card>
  );
}

export function NoVehicleState({ onCreate }: { onCreate: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.noVehicle}>
      <EmptyState
        title="Henüz araç yok"
        message="Araç bilgilerinizi eklediğinizde kayıtlarınız ve planlarınız burada görünecek."
        icon="car-outline"
      />
      <AppButton title="Araç ekle" icon="add" onPress={onCreate} />
    </View>
  );
}

export function LoadingScreen() {
  const styles = useStyles();
  return (
    <SafeAreaView
      accessibilityRole="progressbar"
      accessibilityLabel="Yükleniyor"
      style={styles.loading}
    >
      <View style={styles.loadingHeader} />
      <View style={styles.loadingHero} />
      <View style={styles.loadingLineShort} />
      <View style={styles.loadingRow}>
        <View style={styles.loadingTile} />
        <View style={styles.loadingTile} />
      </View>
      <Text style={styles.loadingText}>İçerik hazırlanıyor…</Text>
    </SafeAreaView>
  );
}

export type FeedbackTone = 'error' | 'warning' | 'success' | 'info';

const FEEDBACK_ICON: Record<FeedbackTone, keyof typeof Ionicons.glyphMap> = {
  error: 'alert-circle',
  warning: 'warning',
  success: 'checkmark-circle',
  info: 'information-circle',
};

/**
 * Unified modern feedback surface: soft-tinted rounded banner with a small tone
 * icon and a gentle fade/slide entrance (skipped under reduce-motion). Replaces
 * the old flat full-width colour blocks. Business logic stays with callers.
 */
export function FeedbackBanner({
  tone = 'info',
  message,
  title,
  onRetry,
  action,
}: {
  tone?: FeedbackTone;
  message: string;
  title?: string;
  onRetry?: () => void;
  action?: { label: string; onPress: () => void };
}) {
  const { colors } = useAppTheme();
  const styles = useStyles();
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));
  const assertive = tone === 'error' || tone === 'warning';
  const resolved = action ?? (onRetry ? { label: 'Tekrar dene', onPress: onRetry } : null);

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [progress, reducedMotion]);

  const toneColor = colors[tone];
  const toneSurface = colors[`${tone}Surface`];

  return (
    <Animated.View
      accessibilityRole={assertive ? 'alert' : undefined}
      accessibilityLiveRegion={assertive ? 'assertive' : 'polite'}
      style={[
        styles.feedbackBanner,
        { backgroundColor: toneSurface, borderColor: toneColor },
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
          ],
        },
      ]}
    >
      <Ionicons name={FEEDBACK_ICON[tone]} size={20} color={toneColor} accessible={false} />
      <View style={styles.feedbackBannerBody}>
        {title ? (
          <Text style={[styles.feedbackBannerTitle, { color: toneColor }]}>{title}</Text>
        ) : null}
        <Text style={styles.feedbackBannerText}>{message}</Text>
      </View>
      {resolved ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={resolved.label}
          hitSlop={8}
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          onPress={resolved.onPress}
        >
          <Text style={[styles.retry, { color: toneColor }]}>{resolved.label}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

/** Backwards-compatible error banner; delegates to {@link FeedbackBanner}. */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <FeedbackBanner tone="error" message={message} onRetry={onRetry} />;
}

export function StatusBadge({
  label,
  tone = 'info',
}: {
  label: string;
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
}) {
  const styles = useStyles();
  return (
    <View style={[styles.badge, styles[`badge_${tone}`]]}>
      <Text style={[styles.badgeText, styles[`badgeText_${tone}`]]}>{label}</Text>
    </View>
  );
}

export function confirmAction(title: string, message: string, onConfirm: () => void) {
  confirmChoice(title, message, 'Sil', onConfirm, true);
}

export function confirmChoice(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  destructive = false,
  cancelLabel = 'Vazgeç',
) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

const createWebDateInputStyle = (textColor: string) => ({
  minHeight: 48,
  flex: 1,
  width: '100%',
  color: textColor,
  fontFamily: fontFamilies.regular,
  fontSize: 15,
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
});

const createStyles = ({ colors, shadows }: AppTheme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: colors.screenBackground },
    screenContent: {
      width: '100%',
      maxWidth: 720,
      boxSizing: 'border-box',
      alignSelf: 'center',
      paddingHorizontal: layout.screenGutter,
      paddingTop: spacing.lg,
      gap: layout.sectionGap,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerText: { flex: 1, gap: spacing.xs },
    title: { color: colors.textPrimary, ...typography.screenTitle },
    subtitle: { color: colors.textSecondary, ...typography.body },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: layout.cardPadding,
      ...shadows.card,
    },
    formSection: { gap: 18 },
    formSectionHeading: { gap: spacing.xs },
    formSectionTitle: { color: colors.textPrimary, ...typography.cardTitle },
    formSectionDescription: { color: colors.textSecondary, ...typography.caption },
    buttonWrap: { minHeight: 52, width: '100%' },
    buttonWrapCompact: { width: 'auto', minHeight: layout.minimumTouchTarget },
    button: {
      minHeight: 52,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    buttonCompact: { minHeight: layout.minimumTouchTarget, paddingHorizontal: spacing.md },
    pressed: { opacity: 0.78 },
    disabled: { backgroundColor: colors.disabledSurface },
    button_primary: { backgroundColor: colors.primaryAction },
    button_secondary: {
      backgroundColor: colors.paleAqua,
      borderWidth: 1,
      borderColor: colors.border,
    },
    button_danger: { backgroundColor: colors.error },
    button_ghost: { backgroundColor: 'transparent' },
    buttonText: { color: colors.onPrimary, ...typography.button },
    buttonTextPrimary: { color: colors.primaryAction },
    buttonTextDisabled: { color: colors.disabledText },
    field: { gap: 7 },
    fieldLabel: { color: colors.textPrimary, ...typography.label },
    floatingWrap: { position: 'relative', justifyContent: 'center' },
    floatingLabel: {
      position: 'absolute',
      left: spacing.lg,
      fontFamily: fontFamilies.medium,
      backgroundColor: 'transparent',
      zIndex: 1,
    },
    floatingInput: { paddingTop: 18, paddingBottom: 4 },
    input: {
      minHeight: 54,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: radii.md,
      paddingHorizontal: spacing.lg,
      color: colors.textPrimary,
      fontFamily: fontFamilies.regular,
      fontSize: 15,
    },
    inputFocused: {
      borderColor: colors.primaryAction,
      shadowColor: colors.primaryAction,
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    multiline: { minHeight: 110, paddingTop: spacing.md, textAlignVertical: 'top' },
    inputError: { borderColor: colors.error },
    errorText: { color: colors.error, ...typography.caption },
    passwordField: { position: 'relative' },
    passwordInput: { paddingRight: 52 },
    passwordEye: { position: 'absolute', right: 16, top: 40 },
    select: {
      minHeight: 54,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: radii.md,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    selectPressed: { backgroundColor: colors.paleAqua, borderColor: colors.borderStrong },
    selectValue: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    colorSwatch: {
      width: 20,
      height: 20,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    selectText: { color: colors.textPrimary, ...typography.bodyMedium, flexShrink: 1 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.lg,
    },
    modalCard: {
      backgroundColor: colors.elevatedSurface,
      borderRadius: radii.xl,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.card,
    },
    modalHandle: {
      alignSelf: 'center',
      width: 38,
      height: 4,
      borderRadius: radii.pill,
      backgroundColor: colors.borderStrong,
      marginBottom: spacing.xs,
    },
    modalTitle: { color: colors.textPrimary, ...typography.sectionTitle },
    bottomSheetHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    optionList: { flexShrink: 1 },
    option: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
    },
    optionSelected: { backgroundColor: colors.paleAqua },
    optionText: { color: colors.textPrimary, ...typography.body },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    webDateField: {
      minHeight: 54,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: radii.md,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    dateHelper: { color: colors.textSecondary, ...typography.caption },
    nativePicker: {
      borderRadius: radii.lg,
      overflow: 'hidden',
      backgroundColor: colors.elevatedSurface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerDone: {
      alignSelf: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    pickerDoneText: { color: colors.primaryAction, ...typography.label },
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
    sectionTitle: { color: colors.textPrimary, ...typography.sectionTitle },
    sectionAction: { color: colors.primaryAction, ...typography.label },
    empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: colors.paleAqua,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: { color: colors.textPrimary, ...typography.cardTitle, textAlign: 'center' },
    emptyMessage: { color: colors.textSecondary, ...typography.body, textAlign: 'center' },
    noVehicle: { gap: spacing.lg },
    loading: {
      flex: 1,
      backgroundColor: colors.screenBackground,
      paddingHorizontal: layout.screenGutter,
      paddingTop: spacing.xxl,
      gap: spacing.lg,
    },
    loadingHeader: {
      width: '42%',
      height: 26,
      borderRadius: radii.sm,
      backgroundColor: colors.neutralSurface,
    },
    loadingHero: {
      width: '100%',
      height: 180,
      borderRadius: radii.xl,
      backgroundColor: colors.neutralSurface,
    },
    loadingLineShort: {
      width: '58%',
      height: 18,
      borderRadius: radii.sm,
      backgroundColor: colors.neutralSurface,
    },
    loadingRow: { flexDirection: 'row', gap: spacing.sm },
    loadingTile: {
      flex: 1,
      height: 92,
      borderRadius: radii.lg,
      backgroundColor: colors.neutralSurface,
    },
    loadingText: { color: colors.textSecondary, ...typography.caption },
    errorBanner: {
      backgroundColor: colors.errorSurface,
      borderRadius: radii.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    errorBannerText: { color: colors.textPrimary, flex: 1, ...typography.caption },
    feedbackBanner: {
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    feedbackBannerBody: { flex: 1, gap: 2 },
    feedbackBannerTitle: { ...typography.label },
    feedbackBannerText: { color: colors.textPrimary, ...typography.caption },
    retryButton: { minHeight: 36, justifyContent: 'center' },
    retry: { color: colors.error, ...typography.label },
    badge: {
      alignSelf: 'flex-start',
      borderRadius: radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    badgeText: { ...typography.status },
    badge_info: { backgroundColor: colors.infoSurface },
    badge_success: { backgroundColor: colors.successSurface },
    badge_warning: { backgroundColor: colors.warningSurface },
    badge_danger: { backgroundColor: colors.errorSurface },
    badge_neutral: { backgroundColor: colors.neutralSurface },
    badgeText_info: { color: colors.info },
    badgeText_success: { color: colors.success },
    badgeText_warning: { color: colors.warning },
    badgeText_danger: { color: colors.error },
    badgeText_neutral: { color: colors.textSecondary },
  });
