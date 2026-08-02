import { Component, Fragment, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from './ui';
import { spacing, typography, useThemedStyles, type AppTheme } from '@/shared/theme';

function SafeErrorScreen({ onRetry }: { onRetry: () => void }) {
  const styles = useThemedStyles(createStyles);
  const goHome = () => {
    onRetry();
    router.dismissAll();
    router.replace('/');
  };
  return (
    <View style={styles.screen} accessibilityRole="alert">
      <Text style={styles.title}>Bir sorun oluştu</Text>
      <Text style={styles.message}>Bu ekran yüklenemedi. Ana sayfaya dönüp tekrar deneyin.</Text>
      <AppButton title="Ana sayfaya dön" onPress={goHome} />
      <AppButton title="Tekrar dene" variant="secondary" onPress={onRetry} />
    </View>
  );
}

interface State {
  failed: boolean;
  retryKey: number;
}

export interface SafeRuntimeDiagnostic {
  name: string;
  message: string;
  applicationStack: string[];
  componentStack: string;
}

interface AppErrorBoundaryProps extends PropsWithChildren {
  onDiagnostic?: (diagnostic: SafeRuntimeDiagnostic) => void;
}

const emailPattern = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
const urlPattern = /https?:\/\/\S+/g;
const secretPattern = /(?:token|password|secret|signed[_ -]?url)\s*[=:]\s*\S+/gi;
const userPathPattern = /([A-Za-z]:[\\/](?:Users|Kullanıcılar)[\\/])[^\\/]+/gi;

function sanitizeDiagnosticText(value: string): string {
  return value
    .replace(emailPattern, '[redacted-email]')
    .replace(urlPattern, '[redacted-url]')
    .replace(secretPattern, '[redacted-secret]')
    .replace(userPathPattern, '$1[redacted-user]');
}

export function createSafeRuntimeDiagnostic(
  error: Error,
  info: Pick<ErrorInfo, 'componentStack'>,
): SafeRuntimeDiagnostic {
  const applicationStack = (error.stack ?? '')
    .split('\n')
    .filter((line) => /[\\/]src[\\/]/.test(line))
    .slice(0, 8)
    .map(sanitizeDiagnosticText);
  return {
    name: error.name || 'Error',
    message: sanitizeDiagnosticText(error.message || 'Unknown runtime error'),
    applicationStack,
    componentStack: sanitizeDiagnosticText(info.componentStack ?? ''),
  };
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, State> {
  state: State = { failed: false, retryKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const diagnostic = createSafeRuntimeDiagnostic(error, info);
    this.props.onDiagnostic?.(diagnostic);
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.error('[AppErrorBoundary]', diagnostic);
    }
  }

  private reset = () =>
    this.setState((state) => ({ failed: false, retryKey: state.retryKey + 1 }));

  render(): ReactNode {
    return this.state.failed ? (
      <SafeErrorScreen onRetry={this.reset} />
    ) : (
      <Fragment key={this.state.retryKey}>{this.props.children}</Fragment>
    );
  }
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.lg,
      backgroundColor: colors.screenBackground,
    },
    title: { color: colors.textPrimary, ...typography.screenTitle },
    message: { color: colors.textSecondary, ...typography.body },
  });
