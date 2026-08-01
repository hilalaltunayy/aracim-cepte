import { describe, expect, it } from 'vitest';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { getAccountDeletionErrorMessage, getFunctionErrorCode } from './functionErrors';

describe('Edge Function error parsing', () => {
  it('returns only the structured safe error code', async () => {
    const response = Response.json(
      { code: 'ATTACHMENT_FILE_TOO_LARGE', internal: 'must not be surfaced' },
      { status: 413 },
    );
    await expect(getFunctionErrorCode(new FunctionsHttpError(response))).resolves.toBe(
      'ATTACHMENT_FILE_TOO_LARGE',
    );
  });

  it('returns null for non-function and malformed errors', async () => {
    await expect(getFunctionErrorCode(new Error('secret detail'))).resolves.toBeNull();
    await expect(
      getFunctionErrorCode(new FunctionsHttpError(new Response('not json', { status: 500 }))),
    ).resolves.toBeNull();
  });

  it('does not expose raw account deletion errors', () => {
    expect(getAccountDeletionErrorMessage('ACCOUNT_STORAGE_DELETE_FAILED')).toContain(
      'hesap silme durduruldu',
    );
    expect(getAccountDeletionErrorMessage('database detail')).not.toContain('database detail');
  });
});
