/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const loadReportsForVehicles = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const exportVehicleReportPdf = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ uri: 'file:///r.pdf', fileName: 'r.pdf', shared: true }),
);

vi.mock('react-native', () => {
  class Value {
    addListener() {
      return 'listener';
    }
    removeListener() {}
    setValue() {}
    interpolate() {
      return 1;
    }
  }
  return {
    Animated: {
      Value,
      View: 'AnimatedView',
      timing: () => ({ start: () => undefined }),
    },
    Pressable: 'Pressable',
    StyleSheet: {
      create: <T,>(styles: T) => styles,
      absoluteFill: { position: 'absolute' },
      hairlineWidth: 1,
    },
    Text: 'Text',
    View: 'View',
  };
});
vi.mock('react-native-svg', () => ({
  default: 'Svg',
  Circle: 'Circle',
  Defs: 'Defs',
  G: 'G',
  Line: 'Line',
  Path: 'Path',
  Pattern: 'Pattern',
  Rect: 'Rect',
}));
vi.mock('@expo/vector-icons', async () => {
  const React = await import('react');
  return { Ionicons: (props: object) => React.createElement('Ionicons', props) };
});
vi.mock('@/shared/theme', () => {
  const colors = new Proxy(
    { chart: new Proxy({}, { get: (_t, k) => `chart.${String(k)}` }) },
    { get: (target, key) => (key in target ? (target as never)[key] : String(key)) },
  );
  const theme = { colors };
  return {
    fontFamilies: new Proxy({}, { get: () => 'Inter' }),
    radii: new Proxy({}, { get: () => 12 }),
    spacing: new Proxy({}, { get: () => 12 }),
    typography: new Proxy({}, { get: () => ({}) }),
    useAppTheme: () => theme,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});
vi.mock('@/shared/components/ui', async () => {
  const React = await import('react');
  const wrap = (name: string) => {
    function Mock({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) {
      return React.createElement(name, props, children);
    }
    Mock.displayName = name;
    return Mock;
  };
  return {
    ActionSheet: wrap('ActionSheet'),
    AppButton: wrap('AppButton'),
    Card: wrap('Card'),
    EmptyState: wrap('EmptyState'),
    ErrorBanner: wrap('ErrorBanner'),
    FadeIn: wrap('FadeIn'),
    LoadingScreen: wrap('LoadingScreen'),
    Screen: wrap('Screen'),
  };
});
vi.mock('@/store/dataStore', () => ({ useDataStore: () => state.value }));
vi.mock('../services/vehicleReportLoader', () => ({ loadReportsForVehicles }));
vi.mock('../pdf/expoReportPdfGateway', () => ({ expoReportPdfGateway: {} }));
vi.mock('../pdf/vehicleReportPdf', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../pdf/vehicleReportPdf')>()),
  exportVehicleReportPdf,
}));

import { VehicleReportsScreen } from './VehicleReportsScreen';

// The screen resolves the period from the real clock. The first of the current
// month is always inside "Son 6 ay" and is never a future date, whatever day the
// suite runs.
const currentMonthStart = `${new Date().toISOString().slice(0, 7)}-01`;

const setReportPeriod = vi.fn();

const base = {
  bootstrapped: true,
  loading: false,
  activeVehicleId: 'a',
  vehicles: [
    {
      id: 'a',
      brand: 'Kia',
      model: 'Sportage',
      year: 2022,
      plate: '34 ABC 123',
      currentKm: 86_400,
      fuelType: 'diesel',
      bodyType: 'suv',
      colorId: 'blue',
      color: null,
    },
  ],
  records: [] as unknown[],
  reminders: [],
  bodyConditions: [],
  documents: [],
  expertiseReports: [],
  notes: [],
  entitlements: { advancedReports: true, maxVehicles: 3 },
  reportPeriodId: 'six_months',
  setReportPeriod,
};

const fuel = (id: string, amount: number, extra: Record<string, unknown> = {}) => ({
  id,
  vehicleId: 'a',
  recordType: 'fuel',
  category: 'Yakıt',
  amount,
  liters: 20,
  recordDate: currentMonthStart,
  kilometer: null,
  description: null,
  createdAt: 'x',
  updatedAt: 'x',
  ...extra,
});

async function mount(props: { onUpgrade?: () => void } = {}) {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<VehicleReportsScreen {...props} />);
  });
  return renderer!;
}
const texts = (renderer: ReactTestRenderer) =>
  renderer.root
    .findAll((node) => String(node.type) === 'Text')
    .map((node) => node.children.join(''));

describe('VehicleReportsScreen', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    setReportPeriod.mockReset();
  });

  it('shows an honest empty report — ₺0, no fake trend or distribution', async () => {
    state.value = base;
    const renderer = await mount();
    expect(texts(renderer)).toContain('KAYITLI ARAÇ MALİYETİ');
    expect(texts(renderer)).toContain('Bu dönemde harcama kaydı bulunmuyor.');
    expect(texts(renderer)).toContain('Bu dönemde kayıtlı gider yok.');
    // No trend chart is drawn when there is nothing to plot.
    expect(renderer.root.findAllByProps({ testID: 'report-trend-reveal' })).toHaveLength(0);
  });

  it('is a chart-led layout: no repeated Card tiles, one hero total, one trend, one donut', async () => {
    state.value = {
      ...base,
      records: [
        fuel('f1', 2000, { stationBrand: 'opet' }),
        fuel('f2', 1000, { stationBrand: 'shell' }),
        {
          id: 'm1',
          vehicleId: 'a',
          recordType: 'maintenance',
          category: 'Yağ bakımı',
          amount: 700,
          liters: null,
          recordDate: currentMonthStart,
          kilometer: null,
          description: null,
          createdAt: 'x',
          updatedAt: 'x',
        },
      ],
    };
    const renderer = await mount();
    expect(renderer.root.findAllByProps({ testID: 'report-hero-total' })).toHaveLength(1);
    expect(texts(renderer)).toContain('Maliyet eğilimi');
    expect(texts(renderer)).toContain('Harcama dağılımı');
    expect(texts(renderer)).toContain('Yakıt ve verimlilik');
    expect(texts(renderer)).toContain('Bakım');
    // The redesign renders on the backdrop — no stack of Card widgets.
    expect(renderer.root.findAll((node) => String(node.type) === 'Card')).toHaveLength(0);
  });

  it('draws a weekly trend for a single-month period instead of a dead state', async () => {
    state.value = {
      ...base,
      reportPeriodId: 'last_month',
      records: [fuel('f1', 300), fuel('f2', 500)],
    };
    // "Geçen ay" is always fully in the past — records dated this month fall
    // outside it, so seed the previous month explicitly.
    const prev = new Date();
    prev.setMonth(prev.getMonth() - 1);
    const prevMonth = prev.toISOString().slice(0, 7);
    state.value = {
      ...(state.value as object),
      records: [
        fuel('f1', 300, { recordDate: `${prevMonth}-02` }),
        fuel('f2', 500, { recordDate: `${prevMonth}-20` }),
      ],
    };
    const renderer = await mount();
    expect(texts(renderer)).toContain('Haftaya göre toplam kayıtlı gider');
    expect(renderer.root.findAllByProps({ testID: 'report-trend-reveal' })).toHaveLength(1);
  });

  it('routes a Free user to the paywall and never generates a PDF', async () => {
    const onUpgrade = vi.fn();
    state.value = { ...base, entitlements: { advancedReports: false } };
    const renderer = await mount({ onUpgrade });
    expect(texts(renderer)).toContain('Premium raporlar');
    exportVehicleReportPdf.mockClear();
    await act(async () =>
      renderer.root
        .findByProps({ title: 'PDF araç raporunu dışa aktar' })
        .props.onPress(),
    );
    expect(onUpgrade).toHaveBeenCalled();
    expect(exportVehicleReportPdf).not.toHaveBeenCalled();
  });

  it('exports a PDF built from the same canonical report data', async () => {
    exportVehicleReportPdf.mockClear();
    state.value = { ...base, records: [fuel('f1', 5000)] };
    const renderer = await mount();
    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: 'Raporu PDF olarak dışa aktar' })
        .props.onPress(),
    );
    expect(exportVehicleReportPdf).toHaveBeenCalledOnce();
    const [html, fileName] = exportVehicleReportPdf.mock.calls[0];
    expect(html).toContain('Araç Geçmiş ve Durum Raporu');
    expect(html).toContain('Kia');
    expect(html).toContain('5.000');
    expect(fileName).toMatch(/^Aracim_Cepte_Rapor_.*\.pdf$/);
  });

  it('surfaces an export failure without breaking the report', async () => {
    exportVehicleReportPdf.mockClear();
    exportVehicleReportPdf.mockRejectedValueOnce(new Error('boom'));
    state.value = { ...base, records: [fuel('f1', 5000)] };
    const renderer = await mount();
    await act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: 'Raporu PDF olarak dışa aktar' })
        .props.onPress(),
    );
    expect(renderer.root.findAll((node) => String(node.type) === 'ErrorBanner')).toHaveLength(1);
    expect(texts(renderer)).toContain('KAYITLI ARAÇ MALİYETİ');
  });

  it('does not stack export jobs on repeated taps', async () => {
    exportVehicleReportPdf.mockClear();
    let resolve: (value: unknown) => void = () => undefined;
    exportVehicleReportPdf.mockImplementation(
      () => new Promise((done) => (resolve = done as typeof resolve)),
    );
    state.value = { ...base, records: [fuel('f1', 5000)] };
    const renderer = await mount();
    const button = renderer.root.findByProps({
      accessibilityLabel: 'Raporu PDF olarak dışa aktar',
    });
    await act(async () => button.props.onPress());
    await act(async () => button.props.onPress());
    await act(async () => button.props.onPress());
    expect(exportVehicleReportPdf).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ uri: 'x', fileName: 'x', shared: true }));
  });

  it('persists the chosen period through the store, not local state', async () => {
    setReportPeriod.mockReset();
    state.value = base;
    const renderer = await mount();
    const sheet = renderer.root.find((node) => String(node.type) === 'ActionSheet');
    await act(async () => sheet.props.onSelect('month'));
    expect(setReportPeriod).toHaveBeenCalledWith('month');
  });

  it('keeps currency values line-clamped so a large amount cannot overflow', async () => {
    state.value = {
      ...base,
      records: [
        {
          id: 'big',
          vehicleId: 'a',
          recordType: 'maintenance',
          category: 'Motor revizyonu',
          amount: 1234567.89,
          liters: null,
          recordDate: currentMonthStart,
          kilometer: null,
          description: null,
          createdAt: 'x',
          updatedAt: 'x',
        },
      ],
    };
    const renderer = await mount();
    const currencyTexts = renderer.root.findAll(
      (node) => String(node.type) === 'Text' && node.children.join('').includes('1.234.567'),
    );
    expect(currencyTexts.length).toBeGreaterThan(0);
    // Every large TL value is line-clamped and shrink-to-fit, so it can never
    // push past its slot — a KPI value to one line, the wrapping footnote to two.
    for (const node of currencyTexts) {
      expect(typeof node.props.numberOfLines).toBe('number');
      expect(node.props.numberOfLines).toBeLessThanOrEqual(2);
    }
    const heroTotal = renderer.root.findByProps({ testID: 'report-hero-total' });
    expect(heroTotal.props.numberOfLines).toBe(1);
    expect(heroTotal.props.adjustsFontSizeToFit).toBe(true);
  });

  it('switches the active vehicle report without mixing the previous vehicle', async () => {
    state.value = {
      ...base,
      vehicles: [...base.vehicles, { id: 'b', brand: 'Ford', model: 'Puma' }],
      records: [fuel('a1', 100), fuel('b1', 900, { vehicleId: 'b' })],
    };
    const renderer = await mount();
    expect(texts(renderer).some((value) => value.includes('100'))).toBe(true);
    state.value = { ...(state.value as object), activeVehicleId: 'b' };
    await act(async () => renderer.update(<VehicleReportsScreen />));
    expect(texts(renderer).some((value) => value.includes('Ford Puma'))).toBe(true);
    expect(texts(renderer).some((value) => value.includes('900'))).toBe(true);
  });

  it('renders an isolated two-vehicle comparison', async () => {
    loadReportsForVehicles.mockResolvedValueOnce([
      { vehicle: { id: 'b', brand: 'Ford', model: 'Puma' }, records: [fuel('b1', 300)] },
    ]);
    state.value = {
      ...base,
      vehicles: [...base.vehicles, { id: 'b', brand: 'Ford', model: 'Puma' }],
      records: [fuel('a1', 100)],
    };
    const renderer = await mount();
    await vi.waitFor(() =>
      expect(texts(renderer).some((value) => value.includes('Araç karşılaştırması'))).toBe(true),
    );
  });

  it('has stable loading and no-vehicle states', async () => {
    state.value = { ...base, loading: true };
    let renderer = await mount();
    expect(renderer.root.findAll((node) => String(node.type) === 'LoadingScreen')).toHaveLength(1);
    state.value = { ...base, vehicles: [], activeVehicleId: null, loading: false };
    renderer = await mount();
    expect(renderer.root.find((node) => String(node.type) === 'EmptyState').props.title).toBe(
      'Önce bir araç ekleyin',
    );
  });
});
