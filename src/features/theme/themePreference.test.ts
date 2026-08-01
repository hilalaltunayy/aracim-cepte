import { describe, expect, it, vi } from 'vitest';
import {
  THEME_OPTIONS,
  THEME_PREFERENCE_STORAGE_KEY,
  loadThemePreference,
  parseThemePreference,
  resolveThemePreference,
  saveThemePreference,
} from './themePreference';

describe('theme preference', () => {
  it('exposes the approved settings options', () => {
    expect(THEME_OPTIONS.map(({ value, label }) => ({ value, label }))).toEqual([
      { value: 'system', label: 'Sistem ayarını kullan' },
      { value: 'light', label: 'Açık' },
      { value: 'dark', label: 'Koyu' },
    ]);
  });

  it('tracks system changes only for the system preference', () => {
    expect(resolveThemePreference('system', 'light')).toBe('light');
    expect(resolveThemePreference('system', 'dark')).toBe('dark');
    expect(resolveThemePreference('light', 'dark')).toBe('light');
    expect(resolveThemePreference('dark', 'light')).toBe('dark');
  });

  it('falls back safely for missing or invalid persisted values', () => {
    expect(parseThemePreference(null)).toBe('system');
    expect(parseThemePreference('sepia')).toBe('system');
  });

  it('loads and saves the preference through the dedicated storage key', async () => {
    const storage = {
      getItem: vi.fn().mockResolvedValue('dark'),
      setItem: vi.fn().mockResolvedValue(undefined),
    };
    await expect(loadThemePreference(storage)).resolves.toBe('dark');
    await saveThemePreference(storage, 'light');
    expect(storage.getItem).toHaveBeenCalledWith(THEME_PREFERENCE_STORAGE_KEY);
    expect(storage.setItem).toHaveBeenCalledWith(THEME_PREFERENCE_STORAGE_KEY, 'light');
  });

  it('uses system if persistence cannot be read', async () => {
    await expect(
      loadThemePreference({
        getItem: vi.fn().mockRejectedValue(new Error('unavailable')),
        setItem: vi.fn(),
      }),
    ).resolves.toBe('system');
  });
});
