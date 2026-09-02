/* eslint-disable import/first */
import type { ComponentProps, ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@expo/vector-icons', async () => {
  const React = await import('react');
  return { Ionicons: (props: object) => React.createElement('Ionicons', props) };
});
vi.mock('@/shared/theme', () => {
  const theme = { colors: new Proxy({}, { get: (_target, key) => String(key) }) };
  return {
    radii: new Proxy({}, { get: () => 12 }),
    spacing: new Proxy({}, { get: () => 12 }),
    typography: new Proxy({}, { get: () => ({}) }),
    useAppTheme: () => theme,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});
vi.mock('@/shared/components/ui', async () => {
  const React = await import('react');
  const host = (name: string) =>
    function Host({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) {
      return React.createElement(name, props, children);
    };
  return {
    AppButton: host('AppButton'),
    AppHeader: host('AppHeader'),
    Card: host('Card'),
    Screen: host('Screen'),
    StatusBadge: host('StatusBadge'),
  };
});

import { PremiumPaywallScreen } from './PremiumPaywallScreen';

const offering = {
  id: 'default',
  packages: [
    {
      id: 'monthly',
      packageType: 'monthly' as const,
      title: 'Aylık Premium',
      productId: 'premium_monthly',
      priceString: '₺49,99',
    },
    {
      id: 'annual',
      packageType: 'annual' as const,
      title: 'Yıllık Premium',
      productId: 'premium_annual',
      priceString: '₺499,99',
    },
  ],
};
const base: ComponentProps<typeof PremiumPaywallScreen> = {
  authoritativePlanId: 'free' as const,
  billingEnabled: true,
  subscription: { status: 'free' as const, entitlementActive: false },
  offering,
  selectedPackageId: 'annual',
  loading: false,
  message: null,
  onSelectPackage: vi.fn(),
  onPurchase: vi.fn(),
  onRestore: vi.fn(),
  onReload: vi.fn(),
};

async function mount(
  props: ComponentProps<typeof PremiumPaywallScreen> = base,
): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<PremiumPaywallScreen {...props} />);
  });
  return renderer!;
}
const texts = (renderer: ReactTestRenderer) =>
  renderer.root
    .findAll((node) => String(node.type) === 'Text')
    .map((node) => node.children.join(''));

describe('PremiumPaywallScreen', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('renders only currently implemented Premium benefits', async () => {
    const renderer = await mount();
    expect(texts(renderer)).toContain('En fazla 3 araç');
    expect(texts(renderer)).toContain('Ayda 30 OCR taraması');
    expect(texts(renderer)).toContain('Günde 10 Araç Asistanı yanıtı');
    expect(texts(renderer).join(' ')).not.toContain('OBD');
    expect(texts(renderer).join(' ')).not.toContain('Smart Trips');
  });

  it('renders monthly and annual prices exclusively from Offering metadata', async () => {
    const renderer = await mount();
    expect(texts(renderer)).toEqual(expect.arrayContaining(['₺49,99', '₺499,99']));
    expect(
      renderer.root.find(
        (node) => String(node.type) === 'AppButton' && node.props.title === '₺499,99 ile devam et',
      ),
    ).toBeDefined();
  });

  it('selects a remote package through an accessible radio row', async () => {
    const onSelectPackage = vi.fn();
    const renderer = await mount({ ...base, onSelectPackage });
    const monthly = renderer.root.find((node) => node.props.accessibilityLabel === 'Aylık, ₺49,99');
    await act(async () => monthly.props.onPress());
    expect(onSelectPackage).toHaveBeenCalledWith('monthly');
  });

  it('fails gracefully when billing is disabled and exposes no active purchase button', async () => {
    const renderer = await mount({ ...base, billingEnabled: false, offering: null });
    expect(texts(renderer).join(' ')).toContain('Premium satın alma şu anda kullanıma açık değil');
    const continueButton = renderer.root.find(
      (node) => String(node.type) === 'AppButton' && node.props.title === 'Devam et',
    );
    expect(continueButton.props.disabled).toBe(true);
  });

  it('shows missing Offering without fabricating a price', async () => {
    const renderer = await mount({ ...base, offering: null, selectedPackageId: null });
    expect(texts(renderer).join(' ')).toContain('Mağaza paketleri yüklenemedi');
    expect(texts(renderer).join(' ')).not.toMatch(/₺\d/);
  });

  it('provides restore purchases as a calm explicit action', async () => {
    const onRestore = vi.fn();
    const renderer = await mount({ ...base, onRestore });
    const restore = renderer.root.find(
      (node) =>
        String(node.type) === 'AppButton' && node.props.title === 'Satın alımları geri yükle',
    );
    await act(async () => restore.props.onPress());
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it('shows authoritative Premium as active without rendering purchase controls', async () => {
    const renderer = await mount({
      ...base,
      authoritativePlanId: 'premium',
      subscription: {
        status: 'premium',
        entitlementActive: true,
        willRenew: true,
      },
    });
    expect(texts(renderer)).toContain('Premium hesabınız aktif');
    expect(renderer.root.findAll((node) => String(node.type) === 'StatusBadge')).toHaveLength(1);
    expect(renderer.root.findAll((node) => String(node.type) === 'AppButton')).toHaveLength(0);
  });

  it('documents cancelled-but-active downgrade semantics without deletion', async () => {
    const renderer = await mount({
      ...base,
      authoritativePlanId: 'premium',
      subscription: {
        status: 'premium',
        entitlementActive: true,
        willRenew: false,
      },
    });
    expect(texts(renderer).join(' ')).toContain('Hiçbir araç veya kayıt silinmez');
  });
});
