import type { BodyCondition } from '@/domain/entities';
import type { ResolvedTheme } from '@/features/theme/themePreference';

const sharedBrand = {
  primaryDark: '#076A98',
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
  brandGradientStart: string;
  brandGradientEnd: string;
  onBrand: string;
  onBrandMuted: string;
  brandSurface: string;
  brandSurfaceStrong: string;
  illustrationBody: string;
  illustrationGlass: string;
  illustrationTrim: string;
  illustrationWheel: string;
  illustrationHub: string;
  illustrationAccent: string;
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
  diagramCenterLine: string;
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
  textSecondary: '#4F6570',
  border: '#78929B',
  borderStrong: '#5B7882',
  inputBackground: '#FFFFFF',
  disabledSurface: '#DCE5E8',
  disabledText: '#4F626B',
  primaryAction: '#0875A8',
  onPrimary: '#FFFFFF',
  success: '#0B6B50',
  warning: '#7A4A00',
  error: '#A22D36',
  info: '#155E96',
  tabBar: '#FFFFFF',
  modalOverlay: 'rgba(17, 43, 58, 0.46)',
  brandGradientStart: '#0875A8',
  brandGradientEnd: '#087870',
  onBrand: '#FFFFFF',
  onBrandMuted: '#E6F5F7',
  brandSurface: 'rgba(255, 255, 255, 0.12)',
  brandSurfaceStrong: 'rgba(255, 255, 255, 0.18)',
  illustrationBody: '#FFFFFF',
  illustrationGlass: '#BDECF4',
  illustrationTrim: '#F8FDFF',
  illustrationWheel: '#173042',
  illustrationHub: '#85D8E4',
  illustrationAccent: '#35CFC4',
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
  diagramCenterLine: 'rgba(22, 50, 68, 0.34)',
  bodyCondition: lightBodyCondition,
  navy: '#163244',
  muted: '#4F6570',
  background: '#F3F8FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FBFC',
  primary: '#0875A8',
  danger: '#A22D36',
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
  border: '#5A7682',
  borderStrong: '#74909B',
  inputBackground: '#10212A',
  disabledSurface: '#263840',
  disabledText: '#B7C7CE',
  primaryAction: '#28AFE0',
  onPrimary: '#07151B',
  success: '#59C99E',
  warning: '#F1AD57',
  error: '#FF7C84',
  info: '#7ABCF4',
  tabBar: '#132630',
  modalOverlay: 'rgba(0, 0, 0, 0.68)',
  brandGradientStart: '#0B668F',
  brandGradientEnd: '#08756E',
  onBrand: '#FFFFFF',
  onBrandMuted: '#E4F4F6',
  brandSurface: 'rgba(255, 255, 255, 0.1)',
  brandSurfaceStrong: 'rgba(255, 255, 255, 0.16)',
  illustrationBody: '#EDF7FA',
  illustrationGlass: '#9DD8E2',
  illustrationTrim: '#DCEEF2',
  illustrationWheel: '#07151B',
  illustrationHub: '#72CBD6',
  illustrationAccent: '#3BD2C5',
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
  diagramCenterLine: 'rgba(237, 247, 250, 0.42)',
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
