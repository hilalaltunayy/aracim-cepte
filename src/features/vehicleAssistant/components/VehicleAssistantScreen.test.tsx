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
    fontFamilies: { regular: 'regular' },
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
    AppInput: host('AppInput'),
    Card: host('Card'),
    FadeIn: host('FadeIn'),
    Screen: host('Screen'),
    SectionHeader: host('SectionHeader'),
    StatusBadge: host('StatusBadge'),
  };
});

import { VehicleAssistantScreen } from './VehicleAssistantScreen';
import type { VehicleAssistantResult } from '../domain/assistantContract';

const success: VehicleAssistantResult = {
  source: 'provider',
  quota: { used: 1, limit: 1, remaining: 0, periodStart: '2026-08-01' },
  response: {
    answer: 'Bakım yaklaşıyor; 600 km içinde planlamak uygun olur.',
    domain: 'maintenance',
    severity: 'medium',
    safetyEscalation: false,
    externalDataRequired: false,
    evidence: [
      { factCode: 'maintenanceFacts.kmSinceLast', label: 'Son bakımdan beri', value: '9.400 km' },
    ],
    suggestions: ['Bakım randevusu planlayın.'],
  },
};
const base: ComponentProps<typeof VehicleAssistantScreen> = {
  vehicleName: 'Kia Sportage',
  initialQuota: { used: 0, limit: 1, remaining: 1, periodStart: '2026-08-01' },
  entitlementLimit: 1,
  enabled: true,
  onAsk: vi.fn().mockResolvedValue(success),
};

async function mount(props = base): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<VehicleAssistantScreen {...props} />);
  });
  return renderer!;
}
const texts = (renderer: ReactTestRenderer) =>
  renderer.root
    .findAll((node) => String(node.type) === 'Text')
    .map((node) => node.children.join(''));

describe('VehicleAssistantScreen', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('renders a vehicle-scoped empty ASK state with quiet prompt suggestions', async () => {
    const renderer = await mount();
    expect(
      renderer.root.find((node) => String(node.type) === 'AppHeader').props.subtitle,
    ).toContain('Kia Sportage');
    expect(texts(renderer)).toContain('Örnek sorular');
    expect(texts(renderer)).toContain('Bu ay 1 / 1 soru kaldı');
  });

  it('uses the authenticated first name when it is available', async () => {
    const renderer = await mount({ ...base, userName: 'Hilal' });
    expect(texts(renderer)).toContain('Merhaba Hilal, aracınız hakkında sorun');
  });

  it('submits an explicit question and renders the structured answer', async () => {
    const onAsk = vi.fn().mockResolvedValue(success);
    const renderer = await mount({ ...base, onAsk });
    const input = renderer.root.find((node) => String(node.type) === 'AppInput');
    await act(async () => input.props.onChangeText('Bakım durumum nedir?'));
    const button = renderer.root.find((node) => String(node.type) === 'AppButton');
    await act(async () => button.props.onPress());
    expect(onAsk).toHaveBeenCalledWith('Bakım durumum nedir?');
    expect(texts(renderer)).toContain(success.response.answer);
    expect(texts(renderer)).toContain('Bu ay 0 / 1 soru kaldı');
    expect(renderer.root.find((node) => String(node.type) === 'StatusBadge').props.label).toBe(
      'Dikkat gerektirir',
    );
  });

  it('discloses human-readable evidence on demand and keeps suggestions out of raw JSON', async () => {
    const renderer = await mount();
    const input = renderer.root.find((node) => String(node.type) === 'AppInput');
    await act(async () => input.props.onChangeText('Bunu neye göre söyledin?'));
    await act(async () =>
      renderer.root.find((node) => String(node.type) === 'AppButton').props.onPress(),
    );
    expect(texts(renderer)).toContain('Bu cevabı neye göre verdim?');
    expect(texts(renderer)).not.toContain('Son bakımdan beri');
    await act(async () =>
      renderer.root
        .find((node) => node.props.accessibilityLabel === 'Bu cevabı neye göre verdim?')
        .props.onPress(),
    );
    expect(texts(renderer)).toContain('Son bakımdan beri');
    expect(texts(renderer)).toContain('Önerilen sonraki adımlar');
  });

  it('shows a stable loading state while the single request is pending', async () => {
    let resolve: (value: VehicleAssistantResult) => void = () => undefined;
    const pending = new Promise<VehicleAssistantResult>((done) => {
      resolve = done;
    });
    const renderer = await mount({ ...base, onAsk: vi.fn(() => pending) });
    await act(async () =>
      renderer.root
        .find((node) => String(node.type) === 'AppInput')
        .props.onChangeText('Araç durumum?'),
    );
    await act(async () => {
      renderer.root.find((node) => String(node.type) === 'AppButton').props.onPress();
      await Promise.resolve();
    });
    expect(texts(renderer)).toContain('Araç verileri değerlendiriliyor');
    await act(async () => {
      resolve(success);
      await pending;
    });
  });

  it('renders a calm backend-unavailable error without technical details', async () => {
    const renderer = await mount({
      ...base,
      onAsk: vi.fn().mockRejectedValue(new Error('Araç Asistanı şu anda kullanılamıyor.')),
    });
    await act(async () =>
      renderer.root
        .find((node) => String(node.type) === 'AppInput')
        .props.onChangeText('Araç durumum?'),
    );
    await act(async () =>
      renderer.root.find((node) => String(node.type) === 'AppButton').props.onPress(),
    );
    expect(texts(renderer)).toContain('Araç Asistanı şu anda kullanılamıyor.');
  });

  it('renders quota exhaustion and disables a new request', async () => {
    const renderer = await mount({
      ...base,
      initialQuota: { used: 1, limit: 1, remaining: 0, periodStart: '2026-08-01' },
    });
    expect(texts(renderer)).toContain('Bu ayki Araç Asistanı kullanım sınırınıza ulaştınız.');
    expect(renderer.root.find((node) => String(node.type) === 'AppButton').props.disabled).toBe(
      true,
    );
  });

  it.each([
    [
      'out-of-domain',
      {
        ...success,
        source: 'local' as const,
        response: {
          ...success.response,
          answer: 'Bu asistan araç soruları içindir.',
          domain: 'out_of_domain' as const,
          evidence: [],
          suggestions: [],
        },
      },
    ],
    [
      'live-data-required',
      {
        ...success,
        source: 'local' as const,
        response: {
          ...success.response,
          answer: 'Canlı veri sağlayıcısı bağlı değil.',
          domain: 'external_data' as const,
          externalDataRequired: true,
          evidence: [],
          suggestions: [],
        },
      },
    ],
  ])('renders the %s normalized backend result', async (_label, localResult) => {
    const renderer = await mount({ ...base, onAsk: vi.fn().mockResolvedValue(localResult) });
    await act(async () =>
      renderer.root.find((node) => String(node.type) === 'AppInput').props.onChangeText('Soru'),
    );
    await act(async () =>
      renderer.root.find((node) => String(node.type) === 'AppButton').props.onPress(),
    );
    expect(texts(renderer)).toContain(localResult.response.answer);
  });
});
