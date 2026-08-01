import { describe, expect, it, vi } from 'vitest';
import { ATTACHMENT_OPEN_ERROR_MESSAGE } from './attachmentRules';
import { openPrivateAttachment } from './openAttachment';

function gateway(overrides: Partial<Parameters<typeof openPrivateAttachment>[1]> = {}) {
  return {
    createSignedUrl: vi.fn(async () => 'https://storage.test/signed'),
    canOpenUrl: vi.fn(async () => true),
    openUrl: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('safe private attachment opening', () => {
  it('opens a supported short-lived https URL', async () => {
    const target = gateway();
    await expect(openPrivateAttachment('owner/random.pdf', target)).resolves.toBeUndefined();
    expect(target.openUrl).toHaveBeenCalledWith('https://storage.test/signed');
  });

  it.each([
    ['missing object', { createSignedUrl: vi.fn(async () => null) }],
    ['expired URL', { openUrl: vi.fn(async () => { throw new Error('expired provider URL'); }) }],
    ['unsupported handler', { canOpenUrl: vi.fn(async () => false) }],
    ['unsafe URL', { createSignedUrl: vi.fn(async () => 'file:///private/path') }],
  ])('maps %s to the same safe user message', async (_name, override) => {
    await expect(openPrivateAttachment('owner/random.pdf', gateway(override))).rejects.toMatchObject({
      message: ATTACHMENT_OPEN_ERROR_MESSAGE,
      code: 'ATTACHMENT_OPEN_FAILED',
    });
  });
});
