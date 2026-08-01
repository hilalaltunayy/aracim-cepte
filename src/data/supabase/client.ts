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
      },
    });
  }
  return client;
}
