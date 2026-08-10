/* eslint-disable import/first */
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-linking', () => ({
  createURL: (path: string) => `aracimcepte://${path}`,
  getInitialURL: vi.fn(async () => null),
}));

import {
  getEmailConfirmationRedirectUrl,
  getPasswordRecoveryRedirectUrl,
} from './recoveryRedirect';

describe('production native auth redirect URLs', () => {
  it('uses the existing app scheme and exact auth routes', () => {
    expect(getEmailConfirmationRedirectUrl()).toBe('aracimcepte://auth/confirm-email');
    expect(getPasswordRecoveryRedirectUrl()).toBe('aracimcepte://auth/reset-password');
  });
});
