import { describe, expect, it, vi } from 'vitest';
import {
  LEGAL_LINKS,
  LEGAL_LINK_FALLBACK_MESSAGE,
  LEGAL_SITE_BASE_URL,
  isAllowedLegalUrl,
  openLegalLinkWithFallback,
  type LegalLink,
  type LegalLinkDependencies,
} from './legalLinks';

function dependencies(overrides: Partial<LegalLinkDependencies> = {}): LegalLinkDependencies {
  return {
    isReachable: vi.fn(async () => true),
    canOpenUrl: vi.fn(async () => true),
    openUrl: vi.fn(async () => true),
    showFallback: vi.fn(),
    ...overrides,
  };
}

describe('central legal links', () => {
  it('keeps every exact public URL in one HTTPS-only allow-list', () => {
    expect(LEGAL_SITE_BASE_URL).toBe('https://aracimcepte.hilalaltunay.com');
    expect(LEGAL_LINKS.map(({ url }) => url)).toEqual([
      'https://aracimcepte.hilalaltunay.com/kvkk-aydinlatma',
      'https://aracimcepte.hilalaltunay.com/gizlilik-politikasi',
      'https://aracimcepte.hilalaltunay.com/saklama-silme',
      'https://aracimcepte.hilalaltunay.com/hesap-silme',
      'https://aracimcepte.hilalaltunay.com/veri-basvurusu',
    ]);
    expect(LEGAL_LINKS.every(({ url }) => isAllowedLegalUrl(url))).toBe(true);
    expect(isAllowedLegalUrl('http://aracimcepte.hilalaltunay.com/kvkk-aydinlatma')).toBe(false);
    expect(isAllowedLegalUrl('https://example.com/kvkk-aydinlatma')).toBe(false);
  });

  it('opens a reachable supported live URL without using fallback', async () => {
    const deps = dependencies();
    const fallback = vi.fn();

    await expect(openLegalLinkWithFallback(LEGAL_LINKS[0], fallback, deps)).resolves.toBe(
      'external',
    );
    expect(deps.isReachable).toHaveBeenCalledWith(LEGAL_LINKS[0].url);
    expect(deps.canOpenUrl).toHaveBeenCalledWith(LEGAL_LINKS[0].url);
    expect(deps.openUrl).toHaveBeenCalledWith(LEGAL_LINKS[0].url);
    expect(deps.showFallback).not.toHaveBeenCalled();
    expect(fallback).not.toHaveBeenCalled();
  });

  it.each([
    ['offline', { isReachable: vi.fn(async () => false) }],
    ['canOpenURL false', { canOpenUrl: vi.fn(async () => false) }],
    [
      'canOpenURL rejection',
      {
        canOpenUrl: vi.fn(async () => {
          throw new Error('native provider detail');
        }),
      },
    ],
    [
      'openURL rejection',
      {
        openUrl: vi.fn(async () => {
          throw new Error('browser provider detail');
        }),
      },
    ],
  ] as const)('offers the safe in-app fallback for %s', async (_case, override) => {
    let offeredFallback: (() => void) | undefined;
    const deps = dependencies({
      ...override,
      showFallback: vi.fn((_message, openFallback) => {
        offeredFallback = openFallback;
      }),
    });
    const fallback = vi.fn();

    await expect(openLegalLinkWithFallback(LEGAL_LINKS[1], fallback, deps)).resolves.toBe(
      'fallback',
    );
    expect(deps.showFallback).toHaveBeenCalledWith(
      LEGAL_LINK_FALLBACK_MESSAGE,
      expect.any(Function),
    );
    expect(fallback).not.toHaveBeenCalled();
    offeredFallback?.();
    expect(fallback).toHaveBeenCalledOnce();
  });

  it('rejects an unexpected scheme before any network or native call', async () => {
    const deps = dependencies();
    const fallback = vi.fn();
    const unsafe = {
      ...LEGAL_LINKS[0],
      url: 'javascript:alert(1)',
    } as unknown as LegalLink;

    await expect(openLegalLinkWithFallback(unsafe, fallback, deps)).resolves.toBe('fallback');
    expect(deps.isReachable).not.toHaveBeenCalled();
    expect(deps.canOpenUrl).not.toHaveBeenCalled();
    expect(deps.openUrl).not.toHaveBeenCalled();
  });
});
