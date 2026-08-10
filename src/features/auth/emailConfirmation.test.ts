import { describe, expect, it } from 'vitest';
import {
  EMAIL_CONFIRMATION_INVALID_MESSAGE,
  parseEmailConfirmationCallback,
} from './emailConfirmation';

describe('email confirmation callback', () => {
  it('accepts Supabase signup callbacks in implicit and PKCE formats', () => {
    expect(
      parseEmailConfirmationCallback(
        'aracimcepte://auth/confirm-email#access_token=redacted&refresh_token=redacted&type=signup',
      ),
    ).toEqual({ kind: 'success' });
    expect(
      parseEmailConfirmationCallback('aracimcepte://auth/confirm-email?code=redacted&type=signup'),
    ).toEqual({ kind: 'success' });
  });

  it('rejects missing, malformed, expired and recovery callbacks without exposing details', () => {
    expect(parseEmailConfirmationCallback(null)).toEqual({
      kind: 'error',
      message: EMAIL_CONFIRMATION_INVALID_MESSAGE,
    });
    expect(parseEmailConfirmationCallback('not-a-url').kind).toBe('error');
    expect(
      parseEmailConfirmationCallback(
        'aracimcepte://auth/confirm-email?error=access_denied&error_description=raw-provider-secret',
      ),
    ).toEqual({ kind: 'error', message: EMAIL_CONFIRMATION_INVALID_MESSAGE });
    expect(
      parseEmailConfirmationCallback(
        'aracimcepte://auth/confirm-email#access_token=a&refresh_token=r&type=recovery',
      ).kind,
    ).toBe('error');
    expect(EMAIL_CONFIRMATION_INVALID_MESSAGE).not.toContain('raw-provider-secret');
  });
});
