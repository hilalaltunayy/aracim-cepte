import { randomUUID } from 'expo-crypto';

export function createRequestId(): string {
  return randomUUID();
}
