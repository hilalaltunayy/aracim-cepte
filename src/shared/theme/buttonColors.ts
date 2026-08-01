import type { ThemeColors } from './tokens';

export function getButtonLoadingIndicatorColor(colors: Pick<ThemeColors, 'disabledText'>): string {
  return colors.disabledText;
}
