/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('react-native', () => ({ Pressable: 'Pressable', StyleSheet: { create: <T,>(styles: T) => styles }, Text: 'Text', View: 'View' }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Line: 'Line', Path: 'Path', Polyline: 'Polyline' }));
vi.mock('@expo/vector-icons', async () => { const React = await import('react'); return { Ionicons: (props: object) => React.createElement('Ionicons', props) }; });
vi.mock('@/shared/theme', () => {
  const theme = { colors: new Proxy({}, { get: (_target, key) => String(key) }) };
  return { fontFamilies: new Proxy({}, { get: () => 'Inter' }), radii: new Proxy({}, { get: () => 12 }), spacing: new Proxy({}, { get: () => 12 }), typography: new Proxy({}, { get: () => ({}) }), useAppTheme: () => theme, useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme) };
});
vi.mock('@/shared/components/ui', async () => {
  const React = await import('react');
  const wrap = (name: string) => {
    function Mock({ children }: { children?: React.ReactNode }) { return React.createElement(name, null, children); }
    Mock.displayName = name;
    return Mock;
  };
  return { ActionSheet: wrap('ActionSheet'), AppHeader: wrap('AppHeader'), Card: wrap('Card'), EmptyState: wrap('EmptyState'), LoadingScreen: wrap('LoadingScreen'), Screen: wrap('Screen'), SectionHeader: wrap('SectionHeader') };
});
vi.mock('@/store/dataStore', () => ({ useDataStore: () => state.value }));

import { VehicleReportsScreen } from './VehicleReportsScreen';

const base = { bootstrapped: true, loading: false, activeVehicleId: 'a', vehicles: [{ id: 'a', brand: 'Kia', model: 'Sportage' }], records: [], entitlements: { advancedReports: true } };
async function mount() { let renderer: ReactTestRenderer | undefined; await act(async () => { renderer = create(<VehicleReportsScreen />); }); return renderer!; }
const texts = (renderer: ReactTestRenderer) => renderer.root.findAll((node) => String(node.type) === 'Text').map((node) => node.children.join(''));
describe('VehicleReportsScreen', () => {
  beforeAll(() => { (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
  it('renders an honest Premium empty report without turning unknown values into zero', async () => { state.value = base; const renderer = await mount(); expect(texts(renderer)).toContain('Bu dönem için henüz maliyet kaydı yok.'); expect(texts(renderer)).toContain('—'); });
  it('shows the scoped Premium availability state for Free users', async () => { state.value = { ...base, entitlements: { advancedReports: false } }; const renderer = await mount(); expect(texts(renderer)).toContain('Premium raporlar'); });
});
