import { createContext, type PropsWithChildren, useContext, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  resolveThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '@/features/theme/themePreference';
import { useThemeStore } from '@/store/themeStore';
import { getThemeTokens, type ThemeColors, type ThemeShadows } from './tokens';

export interface AppTheme {
  colors: ThemeColors;
  shadows: ThemeShadows;
  scheme: ResolvedTheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<AppTheme | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const { preference, hydrated, hydrate, setPreference } = useThemeStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const scheme = resolveThemePreference(
    preference,
    systemScheme === 'dark' || systemScheme === 'light' ? systemScheme : null,
  );
  const value = useMemo<AppTheme>(() => {
    const tokens = getThemeTokens(scheme);
    return { ...tokens, scheme, preference, setPreference };
  }, [preference, scheme, setPreference]);

  if (!hydrated) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useAppTheme must be used inside AppThemeProvider.');
  return value;
}

export function useThemedStyles<T>(factory: (theme: AppTheme) => T): T {
  const theme = useAppTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
