import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  loadThemePreference,
  saveThemePreference,
  type ThemePreference,
} from '@/features/theme/themePreference';

interface ThemeState {
  preference: ThemePreference;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

let hydration: Promise<void> | null = null;

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: 'system',
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    hydration ??= loadThemePreference(AsyncStorage).then((preference) => {
      set({ preference, hydrated: true });
    });
    await hydration;
  },

  setPreference: async (preference) => {
    set({ preference });
    try {
      await saveThemePreference(AsyncStorage, preference);
    } catch {
      // The live UI selection remains active; persistence will be retried on the next user choice.
    }
  },
}));
