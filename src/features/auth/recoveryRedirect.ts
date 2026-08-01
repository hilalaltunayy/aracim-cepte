import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { buildRecoveryRedirectUrl } from './passwordRecovery';

export function getPasswordRecoveryRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof globalThis.location?.origin === 'string') {
    return buildRecoveryRedirectUrl({
      platform: 'web',
      webOrigin: globalThis.location.origin,
    });
  }
  return buildRecoveryRedirectUrl({
    platform: 'native',
    nativeUrl: Linking.createURL('auth/reset-password'),
  });
}

export async function getIncomingRecoveryUrl(currentUrl: string | null): Promise<string | null> {
  if (Platform.OS === 'web' && typeof globalThis.location?.href === 'string') {
    return globalThis.location.href;
  }
  return currentUrl ?? Linking.getInitialURL();
}
