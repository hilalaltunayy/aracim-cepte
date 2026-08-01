import { describe, expect, it } from 'vitest';
import { darkColors, getThemeTokens, lightColors } from './tokens';

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('semantic theme tokens', () => {
  it('provides every required semantic color in both themes', () => {
    const required = [
      'screenBackground',
      'cardBackground',
      'elevatedSurface',
      'textPrimary',
      'textSecondary',
      'border',
      'inputBackground',
      'disabledSurface',
      'primaryAction',
      'success',
      'warning',
      'error',
      'tabBar',
      'modalOverlay',
    ] as const;
    for (const key of required) {
      expect(lightColors[key]).toBeTruthy();
      expect(darkColors[key]).toBeTruthy();
    }
  });

  it('keeps the brand while using distinct surfaces and body-condition colors', () => {
    expect(getThemeTokens('light').colors.screenBackground).not.toBe(
      getThemeTokens('dark').colors.screenBackground,
    );
    expect(darkColors.primaryAction).not.toBe(darkColors.screenBackground);
    expect(new Set(Object.values(darkColors.bodyCondition)).size).toBe(6);
  });

  it('keeps primary and secondary copy readable on the main dark surfaces', () => {
    for (const background of [darkColors.screenBackground, darkColors.cardBackground]) {
      expect(contrast(darkColors.textPrimary, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(darkColors.textSecondary, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(darkColors.onPrimary, darkColors.primaryAction)).toBeGreaterThanOrEqual(4.5);
  });
});
