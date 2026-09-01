import { AppError } from '@/shared/utils/errors';

export type DataAccessFailureCategory =
  | 'auth'
  | 'network'
  | 'permission'
  | 'schema'
  | 'server';

const schemaCodes = new Set(['42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205']);
const permissionCodes = new Set(['42501', 'PGRST301', 'PGRST302']);

function safeProviderCode(error: unknown): string | null {
  const value = (error as { code?: unknown } | null)?.code;
  return typeof value === 'string' && /^[A-Z0-9_-]{1,64}$/i.test(value) ? value : null;
}

function errorMessage(error: unknown): string {
  const value = (error as { message?: unknown } | null)?.message;
  return typeof value === 'string' ? value.toLowerCase() : '';
}

export function classifyDataAccessFailure(error: unknown): DataAccessFailureCategory {
  const code = safeProviderCode(error);
  const message = errorMessage(error);

  if (
    message.includes('jwt expired') ||
    message.includes('invalid jwt') ||
    message.includes('refresh token')
  ) {
    return 'auth';
  }
  if (message.includes('network') || message.includes('failed to fetch') || message === 'fetch failed') {
    return 'network';
  }
  if ((code && schemaCodes.has(code)) || message.includes('schema cache')) return 'schema';
  if ((code && permissionCodes.has(code)) || message.includes('permission denied')) {
    return 'permission';
  }
  return 'server';
}

const messages: Readonly<Record<DataAccessFailureCategory, string>> = {
  auth: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
  network: 'Ağ bağlantısı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.',
  permission: 'Araç verilerine erişim doğrulanamadı. Lütfen tekrar giriş yapıp yeniden deneyin.',
  schema:
    'Araç verileri sunucu güncellemesi eksik olduğu için yüklenemiyor. Lütfen daha sonra tekrar deneyin.',
  server: 'Araç verileri şu anda yüklenemiyor. Lütfen daha sonra tekrar deneyin.',
};

const appCodes: Readonly<Record<DataAccessFailureCategory, string>> = {
  auth: 'AUTH',
  network: 'DATA_NETWORK',
  permission: 'DATA_ACCESS_DENIED',
  schema: 'DATA_SCHEMA_MISMATCH',
  server: 'DATA_SERVER',
};

export function createDataAccessError(operation: string, error: unknown): AppError {
  const category = classifyDataAccessFailure(error);
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[data-access]', {
      operation,
      category,
      providerCode: safeProviderCode(error) ?? 'unknown',
    });
  }
  return new AppError(messages[category], appCodes[category]);
}
