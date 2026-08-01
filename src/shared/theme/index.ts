export { AppThemeProvider, useAppTheme, useThemedStyles } from './ThemeProvider';
export type { AppTheme } from './ThemeProvider';
export { darkColors, getThemeTokens, lightColors } from './tokens';
export type { ThemeColors, ThemeShadows } from './tokens';

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 } as const;

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  screenTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 31,
    lineHeight: 39,
    letterSpacing: -0.45,
  },
  sectionTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 22,
    lineHeight: 29,
    letterSpacing: -0.18,
  },
  cardTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.08,
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  button: {
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  eyebrow: {
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.75,
  },
  status: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.05,
  },
} as const;
