import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'aracim-cepte-has-signed-in-before';

interface BooleanStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export async function readHasSignedInBefore(
  storage: BooleanStorage = AsyncStorage,
): Promise<boolean> {
  try {
    return (await storage.getItem(STORAGE_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markHasSignedInBefore(storage: BooleanStorage = AsyncStorage): Promise<void> {
  try {
    await storage.setItem(STORAGE_KEY, 'true');
  } catch {
    // A preference write failure must not block authentication.
  }
}
