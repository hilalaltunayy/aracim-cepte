import { Href, router } from 'expo-router';

export function goBackOr(fallback: Href = '/(tabs)') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
