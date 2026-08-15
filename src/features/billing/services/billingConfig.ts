import { Platform } from 'react-native';
import type { BillingAvailability } from './BillingProvider';
import type { BillingPlatform } from '../domain/billing';

export interface RevenueCatPublicConfig {
  availability: BillingAvailability;
  apiKey: string | null;
  platform: BillingPlatform | null;
}

export function getRevenueCatPublicConfig(): RevenueCatPublicConfig {
  const enabled = process.env.EXPO_PUBLIC_REVENUECAT_PURCHASES_ENABLED === 'true';
  const platform: BillingPlatform | null =
    Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : null;
  const apiKey =
    platform === 'android'
      ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
      : platform === 'ios'
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
        : undefined;

  if (!platform)
    return {
      availability: { enabled: false, reason: 'unsupported_platform' },
      apiKey: null,
      platform: null,
    };
  if (!enabled)
    return {
      availability: { enabled: false, reason: 'disabled' },
      apiKey: null,
      platform,
    };
  if (!apiKey)
    return {
      availability: { enabled: false, reason: 'missing_key' },
      apiKey: null,
      platform,
    };
  return { availability: { enabled: true, reason: 'ready' }, apiKey, platform };
}
