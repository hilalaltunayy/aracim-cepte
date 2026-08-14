/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const loadReportsForVehicles = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock('react-native', () => {
  class Value { addListener() { return 'listener'; } removeListener() {} setValue() {} interpolate() { return 1; } }
  return { Animated: { Value, View: 'AnimatedView', timing: () => ({ start: () => undefined }) }, Pressable: 'Pressable', StyleSheet: { create: <T,>(styles: T) => styles }, Text: 'Text', View: 'View' };
});
vi.mock('react-native-svg', () => ({ default: 'Svg', Line: 'Line', Path: 'Path', Polyline: 'Polyline' }));
vi.mock('@expo/vector-icons', async () => { const React = await import('react'); return { Ionicons: (props: object) => React.createElement('Ionicons', props) }; });
vi.mock('@/shared/theme', () => {
  const theme = { colors: new Proxy({}, { get: (_target, key) => String(key) }) };
  return { fontFamilies: new Proxy({}, { get: () => 'Inter' }), radii: new Proxy({}, { get: () => 12 }), spacing: new Proxy({}, { get: () => 12 }), typography: new Proxy({}, { get: () => ({}) }), useAppTheme: () => theme, useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme) };
});
vi.mock('@/shared/components/ui', async () => {
  const React = await import('react');
  const wrap = (name: string) => {
    function Mock({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) { return React.createElement(name, props, children); }
    Mock.displayName = name;
    return Mock;
  };
  function AppHeaderMock({ children, action, ...props }: { children?: React.ReactNode; action?: React.ReactNode; [key: string]: unknown }) { return React.createElement('AppHeader', props, children, action); }
  return { ActionSheet: wrap('ActionSheet'), AppHeader: AppHeaderMock, Card: wrap('Card'), EmptyState: wrap('EmptyState'), FadeIn: wrap('FadeIn'), LoadingScreen: wrap('LoadingScreen'), Screen: wrap('Screen'), SectionHeader: wrap('SectionHeader') };
});
vi.mock('@/store/dataStore', () => ({ useDataStore: () => state.value }));
vi.mock('../services/vehicleReportLoader', () => ({ loadReportsForVehicles }));

import { VehicleReportsScreen } from './VehicleReportsScreen';

const base = { bootstrapped: true, loading: false, activeVehicleId: 'a', vehicles: [{ id: 'a', brand: 'Kia', model: 'Sportage' }], records: [], entitlements: { advancedReports: true, maxVehicles: 3 } };
async function mount() { let renderer: ReactTestRenderer | undefined; await act(async () => { renderer = create(<VehicleReportsScreen />); }); return renderer!; }
const texts = (renderer: ReactTestRenderer) => renderer.root.findAll((node) => String(node.type) === 'Text').map((node) => node.children.join(''));
describe('VehicleReportsScreen', () => {
  beforeAll(() => { (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
  it('renders an honest Premium empty report without turning unknown values into zero', async () => { state.value = base; const renderer = await mount(); expect(texts(renderer)).toContain('Bu dönem için henüz maliyet kaydı yok.'); expect(texts(renderer)).toContain('—'); });
  it('shows the scoped Premium availability state for Free users', async () => { state.value = { ...base, entitlements: { advancedReports: false } }; const renderer = await mount(); expect(texts(renderer)).toContain('Premium raporlar'); });
  it('renders rich fuel and maintenance trend surfaces with bar entrance motion', async () => {
    state.value = { ...base, records: [
      { id: 'f1', vehicleId: 'a', recordType: 'fuel', category: 'Yakıt', amount: 100, liters: 2, stationBrand: 'opet', recordDate: '2026-03-12', kilometer: 100, description: null, createdAt: '2026-03-12', updatedAt: '2026-03-12' },
      { id: 'f2', vehicleId: 'a', recordType: 'fuel', category: 'Yakıt', amount: 250, liters: 5, stationBrand: 'shell', recordDate: '2026-08-12', kilometer: 200, description: null, createdAt: '2026-08-12', updatedAt: '2026-08-12' },
      { id: 'm1', vehicleId: 'a', recordType: 'maintenance', category: 'Yağ bakımı', amount: 500, liters: null, recordDate: '2026-04-12', kilometer: 120, description: null, createdAt: '2026-04-12', updatedAt: '2026-04-12' },
      { id: 'm2', vehicleId: 'a', recordType: 'maintenance', category: 'Yağ bakımı', amount: 700, liters: null, recordDate: '2026-08-13', kilometer: 220, description: null, createdAt: '2026-08-13', updatedAt: '2026-08-13' },
    ] }; const renderer = await mount();
    expect(texts(renderer)).toContain('Yakıt harcama eğilimi'); expect(texts(renderer)).toContain('Bakım harcama eğilimi'); expect(renderer.root.findAllByProps({ testID: 'report-bar-entrance' }).length).toBeGreaterThan(0); expect(renderer.root.findAllByProps({ testID: 'report-kpi-count-up' })).toHaveLength(1); expect(renderer.root.findAllByProps({ testID: 'report-line-reveal' }).length).toBeGreaterThan(0); expect(renderer.root.findAllByProps({ testID: 'report-period-transition' })).toHaveLength(1);
  });
  it('loads real independently returned records for a two-vehicle comparison', async () => {
    loadReportsForVehicles.mockResolvedValueOnce([{ vehicle: { id: 'b', brand: 'Ford', model: 'Puma' }, records: [{ id: 'b1', vehicleId: 'b', recordType: 'fuel', category: 'Yakıt', amount: 300, liters: 5, recordDate: '2026-08-12', kilometer: 20, description: null, createdAt: 'x', updatedAt: 'x' }, { id: 'b2', vehicleId: 'b', recordType: 'fuel', category: 'Yakıt', amount: 200, liters: 4, recordDate: '2026-08-13', kilometer: 120, description: null, createdAt: 'x', updatedAt: 'x' }] }]);
    state.value = { ...base, vehicles: [...base.vehicles, { id: 'b', brand: 'Ford', model: 'Puma' }], records: [{ id: 'a1', vehicleId: 'a', recordType: 'fuel', category: 'Yakıt', amount: 100, liters: 2, recordDate: '2026-08-12', kilometer: 10, description: null, createdAt: 'x', updatedAt: 'x' }, { id: 'a2', vehicleId: 'a', recordType: 'fuel', category: 'Yakıt', amount: 100, liters: 2, recordDate: '2026-08-13', kilometer: 110, description: null, createdAt: 'x', updatedAt: 'x' }] };
    const renderer = await mount(); await vi.waitFor(() => expect(texts(renderer)).toContain('Ford Puma')); expect(renderer.root.findAll((node) => String(node.type) === 'SectionHeader').some((node) => node.props.title === 'Araç karşılaştırması')).toBe(true);
  });
  it('supports three vehicle comparison rows without becoming a fleet layout', async () => {
    loadReportsForVehicles.mockResolvedValueOnce([{ vehicle: { id: 'b', brand: 'Ford', model: 'Puma' }, records: [] }, { vehicle: { id: 'c', brand: 'Toyota', model: 'Corolla' }, records: [] }]);
    state.value = { ...base, vehicles: [...base.vehicles, { id: 'b', brand: 'Ford', model: 'Puma' }, { id: 'c', brand: 'Toyota', model: 'Corolla' }], records: [] };
    const renderer = await mount(); await vi.waitFor(() => expect(texts(renderer)).toContain('Toyota Corolla'));
  });
  it('shows an honest comparison error while retaining the selected vehicle report', async () => {
    loadReportsForVehicles.mockRejectedValueOnce(new Error('offline'));
    state.value = { ...base, vehicles: [...base.vehicles, { id: 'b', brand: 'Ford', model: 'Puma' }], records: [{ id: 'a', vehicleId: 'a', recordType: 'fuel', category: 'Yakıt', amount: 100, liters: 2, recordDate: '2026-08-12', kilometer: 10, description: null, createdAt: 'x', updatedAt: 'x' }, { id: 'a2', vehicleId: 'a', recordType: 'fuel', category: 'Yakıt', amount: 100, liters: 2, recordDate: '2026-08-13', kilometer: 110, description: null, createdAt: 'x', updatedAt: 'x' }] };
    const renderer = await mount(); await vi.waitFor(() => expect(texts(renderer)).toContain('Diğer araçların raporları şu anda yüklenemedi. Seçili aracın raporu kullanılabilir.')); expect(texts(renderer)).toContain('KAYITLI ARAÇ MALİYETİ');
  });
  it('updates the visible period through the existing action sheet without rebuilding the screen hierarchy', async () => {
    state.value = base; const renderer = await mount(); const period = renderer.root.find((node) => String(node.type) === 'Pressable' && node.props.accessibilityRole === 'button');
    await act(async () => { period.props.onPress(); }); let sheet = renderer.root.find((node) => String(node.type) === 'ActionSheet'); expect(sheet.props.visible).toBe(true);
    await act(async () => { sheet.props.onSelect('month'); }); sheet = renderer.root.find((node) => String(node.type) === 'ActionSheet'); expect(sheet.props.options.some((option: { value: string }) => option.value === 'month')).toBe(true); expect(renderer.root.findAllByProps({ testID: 'report-period-transition' })).toHaveLength(1);
  });
  it('changes the active vehicle report instead of mixing the previous vehicle data', async () => {
    state.value = { ...base, vehicles: [...base.vehicles, { id: 'b', brand: 'Ford', model: 'Puma' }], records: [{ id: 'a', vehicleId: 'a', recordType: 'fuel', category: 'Yakıt', amount: 100, liters: 2, recordDate: '2026-08-12', kilometer: 10, description: null, createdAt: 'x', updatedAt: 'x' }, { id: 'b', vehicleId: 'b', recordType: 'fuel', category: 'Yakıt', amount: 900, liters: 18, recordDate: '2026-08-12', kilometer: 10, description: null, createdAt: 'x', updatedAt: 'x' }] };
    const renderer = await mount(); state.value = { ...state.value, activeVehicleId: 'b' }; await act(async () => { renderer.update(<VehicleReportsScreen />); }); expect(renderer.root.find((node) => String(node.type) === 'AppHeader').props.subtitle).toBe('Ford Puma'); expect(texts(renderer).some((value) => value.includes('900'))).toBe(true);
  });
  it('keeps fuel-only reports honest about unavailable maintenance data', async () => { state.value = { ...base, records: [{ id: 'f', vehicleId: 'a', recordType: 'fuel', category: 'Yakıt', amount: 100, liters: 2, recordDate: '2026-08-12', kilometer: null, description: null, createdAt: 'x', updatedAt: 'x' }] }; const renderer = await mount(); expect(texts(renderer)).toContain('0'); expect(texts(renderer)).toContain('Yeterli veri yok'); });
  it('keeps maintenance-only reports honest about unavailable fuel analytics', async () => { state.value = { ...base, records: [{ id: 'm', vehicleId: 'a', recordType: 'maintenance', category: 'Bakım', amount: 100, liters: null, recordDate: '2026-08-12', kilometer: null, description: null, createdAt: 'x', updatedAt: 'x' }] }; const renderer = await mount(); expect(texts(renderer)).toContain('Yeterli veri yok'); });
  it('has stable loading and no-vehicle states', async () => { state.value = { ...base, loading: true }; let renderer = await mount(); expect(renderer.root.findAll((node) => String(node.type) === 'LoadingScreen')).toHaveLength(1); state.value = { ...base, vehicles: [], activeVehicleId: null, loading: false }; renderer = await mount(); expect(renderer.root.find((node) => String(node.type) === 'EmptyState').props.title).toBe('Önce bir araç ekleyin'); });
});
