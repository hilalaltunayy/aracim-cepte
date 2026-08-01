import { describe, expect, it, vi } from 'vitest';
import { openNotificationSystemSettings } from './systemSettings';

describe('notification settings shortcut', () => {
  it('returns a safe result instead of propagating native errors', async () => {
    await expect(openNotificationSystemSettings(vi.fn(async () => undefined))).resolves.toBe(true);
    await expect(
      openNotificationSystemSettings(
        vi.fn(async () => {
          throw new Error('native detail');
        }),
      ),
    ).resolves.toBe(false);
  });
});
