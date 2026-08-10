import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { buildRecoveryRedirectUrl } from './passwordRecovery';

export const AUTH_REDIRECT_PATHS = {
  emailConfirmation: 'auth/confirm-email',
  passwordRecovery: 'auth/reset-password',
} as const;

function getAuthRedirectUrl(path: string): string {
  if (Platform.OS === 'web' && typeof globalThis.location?.origin === 'string') {
    return new URL(`/${path}`, globalThis.location.origin).toString();
  }
  return Linking.createURL(path);
}

export function getEmailConfirmationRedirectUrl(): string {
  return getAuthRedirectUrl(AUTH_REDIRECT_PATHS.emailConfirmation);
}

export function getPasswordRecoveryRedirectUrl(): string {
  return buildRecoveryRedirectUrl({
    platform: Platform.OS === 'web' ? 'web' : 'native',
    webOrigin: globalThis.location?.origin,
    nativeUrl: getAuthRedirectUrl(AUTH_REDIRECT_PATHS.passwordRecovery),
  });
}

export async function getIncomingAuthUrl(currentUrl: string | null): Promise<string | null> {
  if (Platform.OS === 'web' && typeof globalThis.location?.href === 'string') {
    return globalThis.location.href;
  }
  return currentUrl ?? Linking.getInitialURL();
}

export const getIncomingRecoveryUrl = getIncomingAuthUrl;
