export const LEGAL_SITE_BASE_URL = 'https://aracimcepte.hilalaltunay.com' as const;

export const LEGAL_LINKS = [
  {
    id: 'kvkkNotice',
    title: 'KVKK Aydınlatma Metni',
    href: '/legal/kvkk-notice',
    url: `${LEGAL_SITE_BASE_URL}/kvkk-aydinlatma`,
  },
  {
    id: 'privacyPolicy',
    title: 'Gizlilik Politikası',
    href: '/legal/privacy-policy',
    url: `${LEGAL_SITE_BASE_URL}/gizlilik-politikasi`,
  },
  {
    id: 'retentionAndDeletion',
    title: 'Saklama ve Silme Politikası',
    href: '/legal/retention-and-deletion',
    url: `${LEGAL_SITE_BASE_URL}/saklama-silme`,
  },
  {
    id: 'accountAndDataDeletion',
    title: 'Hesap ve Veri Silme',
    href: '/legal/account-and-data-deletion',
    url: `${LEGAL_SITE_BASE_URL}/hesap-silme`,
  },
  {
    id: 'kvkkApplication',
    title: 'KVKK Başvuru Bilgileri',
    href: '/legal/kvkk-application',
    url: `${LEGAL_SITE_BASE_URL}/veri-basvurusu`,
  },
] as const;

export type LegalLink = (typeof LEGAL_LINKS)[number];

export const LEGAL_LINK_FALLBACK_MESSAGE =
  'Bağlantı açılamadı. Belgeyi uygulama içinde görüntüleyebilirsiniz.';

const legalUrlAllowList = new Set<string>(LEGAL_LINKS.map((link) => link.url));
export interface LegalLinkDependencies {
  isReachable: (url: string) => Promise<boolean>;
  canOpenUrl: (url: string) => Promise<boolean>;
  openUrl: (url: string) => Promise<unknown>;
  showFallback: (message: string, openFallback: () => void) => void;
}

export function isAllowedLegalUrl(url: string): boolean {
  return url.startsWith('https://') && legalUrlAllowList.has(url);
}

export async function openLegalLinkWithFallback(
  link: LegalLink,
  openFallback: () => void,
  dependencies: LegalLinkDependencies,
): Promise<'external' | 'fallback'> {
  try {
    if (
      isAllowedLegalUrl(link.url) &&
      (await dependencies.isReachable(link.url)) &&
      (await dependencies.canOpenUrl(link.url))
    ) {
      await dependencies.openUrl(link.url);
      return 'external';
    }
  } catch {
    // The user-facing fallback below intentionally hides native/provider details.
  }

  try {
    dependencies.showFallback(LEGAL_LINK_FALLBACK_MESSAGE, openFallback);
  } catch {
    openFallback();
  }
  return 'fallback';
}
