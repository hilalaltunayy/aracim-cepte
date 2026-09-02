import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { AppError } from '@/shared/utils/errors';
import { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(
  url?.startsWith('http') && key && !url.includes('YOUR_PROJECT_REF'),
);

let client: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured || !url || !key) {
    throw new AppError(
      'Supabase bağlantısı henüz yapılandırılmadı. .env dosyasına proje URL ve yayınlanabilir anahtarı ekleyin.',
      'CONFIG_MISSING',
    );
  }
  if (!client) {
    client = createClient<Database>(url, key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // PKCE keeps auth-callback material in the query string. Implicit-flow
        // fragments (`#access_token=...`) are dropped by Android when Chrome
        // redirects a verify response to the app's custom scheme, which made
        // fresh recovery/confirmation links land on the "invalid link" screen.
        flowType: 'pkce',
      },
    });
  }
  return client;
}
