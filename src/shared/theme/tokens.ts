import type { BodyCondition } from '@/domain/entities';
import type { ResolvedTheme } from '@/features/theme/themePreference';

const sharedBrand = {
  primaryDark: '#087DB3',
  aqua: '#31C8BE',
  sky: '#72CBEA',
  white: '#FFFFFF',
} as const;

const lightBodyCondition: Record<BodyCondition, string> = {
  original: '#72B99C',
  painted: '#3E8FD0',
  locally_painted: '#9A74BF',
  replaced: '#DE8738',
  damaged: '#CB5259',
  unknown: '#B7C5CA',
};

const darkBodyCondition: Record<BodyCondition, string> = {
  original: '#58C49B',
  painted: '#5AB3ED',
  locally_painted: '#BE94E8',
  replaced: '#F2A454',
  damaged: '#F1747C',
  unknown: '#6F8791',
};

export interface ThemeColors {
  scheme: ResolvedTheme;
  screenBackground: string;
  cardBackground: string;
  elevatedSurface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  borderStrong: string;
  inputBackground: string;
  disabledSurface: string;
  disabledText: string;
  primaryAction: string;
  onPrimary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  tabBar: string;
  modalOverlay: string;
  paleAqua: string;
  paleBlue: string;
  successSurface: string;
  warningSurface: string;
  errorSurface: string;
  infoSurface: string;
  neutralSurface: string;
  chartGrid: string;
  diagramBackground: string;
  diagramSilhouette: string;
  diagramWindshield: string;
  diagramRearWindow: string;
  diagramWheel: string;
  bodyCondition: Record<BodyCondition, string>;
  primary: string;
  primaryDark: string;
  aqua: string;
  sky: string;
  navy: string;
  muted: string;
  background: string;
  surface: string;
  surfaceMuted: string;
  danger: string;
  white: string;
  overlay: string;
}

export const lightColors: ThemeColors = {
  ...sharedBrand,
  scheme: 'light',
  screenBackground: '#F3F8FA',
  cardBackground: '#FFFFFF',
  elevatedSurface: '#F8FBFC',
  textPrimary: '#163244',
  textSecondary: '#6C7E89',
  border: '#D9E8EC',
  borderStrong: '#C7DDE3',
  inputBackground: '#FFFFFF',
  disabledSurface: '#E1EAED',
  disabledText: '#82919A',
  primaryAction: '#149FD7',
  onPrimary: '#FFFFFF',
  success: '#168665',
  warning: '#D98222',
  error: '#C94E54',
  info: '#2877BC',
  tabBar: '#FFFFFF',
  modalOverlay: 'rgba(17, 43, 58, 0.46)',
  paleAqua: '#E8F7FA',
  paleBlue: '#EAF4FB',
  successSurface: '#E2F5EF',
  warningSurface: '#FFF2DF',
  errorSurface: '#FDE8E8',
  infoSurface: '#E7F1FB',
  neutralSurface: '#EFF3F4',
  chartGrid: '#D9E8EC',
  diagramBackground: '#F8FBFC',
  diagramSilhouette: '#E6EFF2',
  diagramWindshield: '#D9EEF3',
  diagramRearWindow: '#CBE7EE',
  diagramWheel: '#163244',
  bodyCondition: lightBodyCondition,
  navy: '#163244',
  muted: '#6C7E89',
  background: '#F3F8FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FBFC',
  primary: '#149FD7',
  danger: '#C94E54',
  overlay: 'rgba(17, 43, 58, 0.46)',
};

export const darkColors: ThemeColors = {
  ...sharedBrand,
  primaryDark: '#6CCEF0',
  aqua: '#3BD2C5',
  sky: '#80D5F0',
  scheme: 'dark',
  screenBackground: '#0B151B',
  cardBackground: '#12232D',
  elevatedSurface: '#182D38',
  textPrimary: '#EDF7FA',
  textSecondary: '#A5B8C1',
  border: '#29414D',
  borderStrong: '#385865',
  inputBackground: '#10212A',
  disabledSurface: '#263840',
  disabledText: '#7F929B',
  primaryAction: '#28AFE0',
  onPrimary: '#07151B',
  success: '#59C99E',
  warning: '#F1AD57',
  error: '#FF7C84',
  info: '#7ABCF4',
  tabBar: '#132630',
  modalOverlay: 'rgba(0, 0, 0, 0.68)',
  paleAqua: '#15363D',
  paleBlue: '#152F40',
  successSurface: '#163B32',
  warningSurface: '#44321F',
  errorSurface: '#46262B',
  infoSurface: '#18334A',
  neutralSurface: '#263840',
  chartGrid: '#29414D',
  diagramBackground: '#0F2028',
  diagramSilhouette: '#263B45',
  diagramWindshield: '#24434F',
  diagramRearWindow: '#1D3A45',
  diagramWheel: '#081116',
  bodyCondition: darkBodyCondition,
  navy: '#EDF7FA',
  muted: '#A5B8C1',
  background: '#0B151B',
  surface: '#12232D',
  surfaceMuted: '#182D38',
  primary: '#28AFE0',
  danger: '#FF7C84',
  overlay: 'rgba(0, 0, 0, 0.68)',
};

export interface ThemeShadows {
  card: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  floating: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

export const lightShadows: ThemeShadows = {
  card: {
    shadowColor: '#173042',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },
  floating: {
    shadowColor: '#0B536E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const darkShadows: ThemeShadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 3,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.34,
    shadowRadius: 24,
    elevation: 10,
  },
};

export function getThemeTokens(scheme: ResolvedTheme) {
  return scheme === 'dark'
    ? { colors: darkColors, shadows: darkShadows }
    : { colors: lightColors, shadows: lightShadows };
}
