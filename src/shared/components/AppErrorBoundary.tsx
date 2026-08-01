import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
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
}

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Deliberately do not log runtime details: they can contain route parameters or user data.
  }

  private reset = () => this.setState({ failed: false });

  render(): ReactNode {
    return this.state.failed ? <SafeErrorScreen onRetry={this.reset} /> : this.props.children;
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
