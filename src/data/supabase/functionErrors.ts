import { FunctionsHttpError } from '@supabase/supabase-js';

export async function getFunctionErrorCode(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  try {
    const payload = (await error.context.clone().json()) as { code?: unknown };
    return typeof payload.code === 'string' ? payload.code : null;
  } catch {
    return null;
  }
}

export function getAccountDeletionErrorMessage(code: string | null): string {
  switch (code) {
    case 'AUTH_REQUIRED':
      return 'Hesabı silmek için yeniden giriş yapın.';
    case 'ACCOUNT_STORAGE_DELETE_FAILED':
      return 'Belge dosyaları silinemediği için hesap silme durduruldu. Lütfen tekrar deneyin.';
    default:
      return 'Hesap silinemedi. Lütfen tekrar deneyin.';
  }
}
