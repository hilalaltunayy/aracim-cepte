export const colors = {
  primary: '#149FD7',
  primaryDark: '#087DB3',
  aqua: '#31C8BE',
  sky: '#72CBEA',
  navy: '#163244',
  muted: '#6C7E89',
  background: '#F3F8FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FBFC',
  paleAqua: '#E8F7FA',
  paleBlue: '#EAF4FB',
  border: '#D9E8EC',
  borderStrong: '#C7DDE3',
  success: '#168665',
  warning: '#D98222',
  danger: '#C94E54',
  info: '#2877BC',
  white: '#FFFFFF',
  overlay: 'rgba(17, 43, 58, 0.46)',
} as const;

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
    fontFamily: fontFamilies.bold,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -0.65,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.3,
  },
  cardTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 17,
    lineHeight: 23,
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
} as const;

export const shadows = {
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
} as const;
