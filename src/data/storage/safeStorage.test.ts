import { describe, expect, it, vi } from 'vitest';
import { createSafeStringStorage, StringStorage } from './safeStorage';

describe('corrupted cache fallback', () => {
  it('removes corrupted JSON and continues with an empty cache', async () => {
    const storage: StringStorage = {
      getItem: vi.fn(async () => '{broken-json'),
      setItem: vi.fn(async () => undefined),
      removeItem: vi.fn(async () => undefined),
    };
    const safe = createSafeStringStorage(storage);
    await expect(safe.getItem('preferences')).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith('preferences');
  });

  it('returns valid persisted JSON unchanged', async () => {
    const storage: StringStorage = {
      getItem: vi.fn(async () => '{"state":{"onboardingSeen":true}}'),
      setItem: vi.fn(async () => undefined),
      removeItem: vi.fn(async () => undefined),
    };
    await expect(createSafeStringStorage(storage).getItem('preferences')).resolves.toContain(
      'onboardingSeen',
    );
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
