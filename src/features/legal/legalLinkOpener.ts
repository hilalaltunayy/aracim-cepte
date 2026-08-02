import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import {
  openLegalLinkWithFallback,
  type LegalLink,
  type LegalLinkDependencies,
} from './legalLinks';

const reachabilityTimeoutMs = 5_000;

async function isLivePageReachable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), reachabilityTimeoutMs);
  try {
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

const legalLinkDependencies: LegalLinkDependencies = {
  isReachable: isLivePageReachable,
  canOpenUrl: (url) => Linking.canOpenURL(url),
  openUrl: (url) => Linking.openURL(url),
  showFallback: (message, openFallback) => {
    Alert.alert('Bağlantı açılamadı', message, [
      { text: 'Uygulamada görüntüle', onPress: openFallback },
    ]);
  },
};

export function openLegalLink(link: LegalLink, openFallback: () => void) {
  return openLegalLinkWithFallback(link, openFallback, legalLinkDependencies);
}
