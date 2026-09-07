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

/**
 * Reporting palette — theme-aware and shared, so no screen hardcodes a chart
 * colour. Brand blue stays the anchor but is never the only hue. Categories map
 * to fixed roles: fuel = blue, maintenance = seafoam, other = warm amber. Trend
 * bars cycle blue → aqua → lilac by height band so a six-bar chart never reads
 * as one flat colour.
 */
export interface ChartPalette {
  fuel: string;
  maintenance: string;
  other: string;
  aqua: string;
  lilac: string;
  warm: string;
  /** Empty-bucket ghost fill and donut track. */
  track: string;
  /** Axis / gridline. */
  grid: string;
  /** Diagonal hatch stroke marking an incomplete interval. */
  hatch: string;
  /** Positive/negative comparison text + pill. */
  positive: string;
  negative: string;
  positiveSurface: string;
  negativeSurface: string;
}

const lightChart: ChartPalette = {
  fuel: '#2F7FBE',
  maintenance: '#2FA79A',
  other: '#D98A3A',
  aqua: '#3FB6C4',
  lilac: '#8A78C9',
  warm: '#DFA23C',
  track: '#E3ECEF',
  grid: '#D9E8EC',
  hatch: '#B7C9CE',
  positive: '#0B6B50',
  negative: '#A2442A',
  positiveSurface: '#E2F5EF',
  negativeSurface: '#FBEDE4',
};

const darkChart: ChartPalette = {
  fuel: '#5AB3ED',
  maintenance: '#48C9BB',
  other: '#F0A857',
  aqua: '#54CBD8',
  lilac: '#B69BE8',
  warm: '#F0B65F',
  track: '#22343D',
  grid: '#29414D',
  hatch: '#3C5560',
  positive: '#5FCB9F',
  negative: '#F0956E',
  positiveSurface: '#173B32',
  negativeSurface: '#3E2A22',
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
  chart: ChartPalette;
  /** Translucent "soft blue glass" surface for the Home assistant entry only. */
  assistantGlass: {
    fillStart: string;
    fillEnd: string;
    border: string;
    glow: string;
    icon: string;
  };
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
  chart: lightChart,
  assistantGlass: {
    fillStart: 'rgba(126, 195, 236, 0.80)',
    fillEnd: 'rgba(13, 108, 158, 0.82)',
    border: 'rgba(255, 255, 255, 0.52)',
    glow: 'rgba(8, 117, 168, 0.20)',
    icon: '#FFFFFF',
  },
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
  chart: darkChart,
  assistantGlass: {
    fillStart: 'rgba(96, 182, 238, 0.44)',
    fillEnd: 'rgba(36, 118, 164, 0.52)',
    border: 'rgba(233, 245, 250, 0.22)',
    glow: 'rgba(40, 175, 224, 0.24)',
    icon: '#F2FAFE',
  },
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
