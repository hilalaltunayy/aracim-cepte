export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemePreferenceStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

export const THEME_PREFERENCE_STORAGE_KEY = '@aracim-cepte/theme-preference-v1';

export const THEME_OPTIONS = [
  {
    value: 'system',
    label: 'Sistem ayarını kullan',
    description: 'Cihazın açık veya koyu görünümünü takip eder.',
  },
  { value: 'light', label: 'Açık', description: 'Her zaman açık görünümü kullanır.' },
  { value: 'dark', label: 'Koyu', description: 'Her zaman koyu görünümü kullanır.' },
] as const satisfies readonly {
  value: ThemePreference;
  label: string;
  description: string;
}[];

export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark' | null | undefined,
): ResolvedTheme {
  if (preference !== 'system') return preference;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export async function loadThemePreference(
  storage: ThemePreferenceStorage,
): Promise<ThemePreference> {
  try {
    return parseThemePreference(await storage.getItem(THEME_PREFERENCE_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

export async function saveThemePreference(
  storage: ThemePreferenceStorage,
  preference: ThemePreference,
): Promise<void> {
  await storage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
}
