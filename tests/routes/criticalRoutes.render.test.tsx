/* eslint-disable import/first */
import type { ReactNode } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authState,
  dataState,
  openAttachmentMock,
  routeParams,
  routerMock,
} = vi.hoisted(() => ({
  routeParams: {} as Record<string, string | string[] | undefined>,
  routerMock: {
    navigate: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    canGoBack: vi.fn(() => true),
  },
  openAttachmentMock: vi.fn(async () => undefined),
  authState: {
    signUp: vi.fn(async () => true),
    resendConfirmation: vi.fn(async () => true),
    busy: false,
    error: null as string | null,
    clearError: vi.fn(),
  },
  dataState: {} as Record<string, unknown>,
}));

vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => '99999999-9999-4999-8999-999999999999'),
}));

vi.mock('expo-router', async () => {
  const React = await import('react');
  return {
    router: routerMock,
    useLocalSearchParams: () => routeParams,
    useNavigation: () => ({ addListener: vi.fn(() => vi.fn()), dispatch: vi.fn() }),
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, [callback]),
  };
});

vi.mock('expo-router/react-navigation', () => ({ usePreventRemove: vi.fn() }));

vi.mock('react-native', () => ({
  Alert: { alert: vi.fn() },
  Platform: { OS: 'android' },
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles, hairlineWidth: 1 },
  Text: 'Text',
  View: 'View',
}));

vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
vi.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

vi.mock('@/shared/theme', () => {
  const colors = new Proxy({}, { get: (_target, key) => String(key) });
  const metrics = new Proxy({}, { get: () => 12 });
  const textStyles = new Proxy({}, { get: () => ({}) });
  const shadows = new Proxy({}, { get: () => ({}) });
  const theme = { colors, shadows };
  return {
    fontFamilies: new Proxy({}, { get: () => 'Inter' }),
    radii: metrics,
    shadows,
    spacing: metrics,
    typography: textStyles,
    useAppTheme: () => theme,
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});

vi.mock('@/shared/components/ui', async () => {
  const React = await import('react');
  const host = (name: string) =>
    function Host({
      children,
      title,
      label,
      message,
      subtitle,
      ...props
    }: Record<string, unknown> & {
      children?: ReactNode;
      title?: ReactNode;
      label?: ReactNode;
      message?: ReactNode;
      subtitle?: ReactNode;
    }) {
      return React.createElement(
        name,
        { ...props, title, label, message, subtitle },
        title ?? label ?? message ?? subtitle,
        children,
      );
    };
  return {
    AppButton: host('AppButton'),
    AppHeader: host('AppHeader'),
    AppInput: host('AppInput'),
    Card: host('Card'),
    DateField: host('DateField'),
    EmptyState: host('EmptyState'),
    ErrorBanner: host('ErrorBanner'),
    FadeIn: host('FadeIn'),
    FormSection: host('FormSection'),
    LoadingScreen: host('LoadingScreen'),
    NoVehicleState: host('NoVehicleState'),
    PasswordInput: host('PasswordInput'),
    Screen: host('Screen'),
    SectionHeader: host('SectionHeader'),
    SelectField: host('SelectField'),
    StatusBadge: host('StatusBadge'),
    confirmAction: vi.fn(),
  };
});

vi.mock('@/shared/components/entityCards', async () => {
  const React = await import('react');
  return {
    DocumentCard: ({ document, ...props }: Record<string, unknown> & { document: { title: string } }) =>
      React.createElement('DocumentCard', { ...props, document }, document.title),
    RecordCard: ({ record, ...props }: Record<string, unknown> & { record: { category: string } }) =>
      React.createElement('RecordCard', { ...props, record }, record.category),
  };
});

vi.mock('@/shared/components/MiniBarChart', () => ({ MiniBarChart: 'MiniBarChart' }));
vi.mock('@/shared/components/AttachmentField', () => ({ AttachmentField: 'AttachmentField' }));
vi.mock('@/data/storage/attachments', () => ({
  deleteAttachment: vi.fn(async () => undefined),
  openAttachment: openAttachmentMock,
  uploadAttachment: vi.fn(async () => 'owner/vehicle/random.pdf'),
}));
vi.mock('@/data/supabase/client', () => ({ isSupabaseConfigured: true }));

vi.mock('@/store/dataStore', () => {
  const useDataStore = (selector?: (state: typeof dataState) => unknown) =>
    selector ? selector(dataState) : dataState;
  useDataStore.getState = () => dataState;
  return { useDataStore };
});

vi.mock('@/store/authStore', () => ({ useAuthStore: () => authState }));

import DashboardScreen from '@/app/(tabs)/index';
import HistoryScreen from '@/app/(tabs)/history';
import RegisterScreen from '@/app/auth/register';
import DocumentEditScreen from '@/app/documents/edit';
import DocumentsListScreen from '@/app/documents/index';
import ExpertiseEditScreen from '@/app/expertise/edit';
import ExpertiseListScreen from '@/app/expertise/index';
import RecordEditScreen from '@/app/record/edit';
import { formatCurrency } from '@/shared/utils/format';

const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const vehicleId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const recordIds = {
  fuel: '11111111-1111-4111-8111-111111111111',
  maintenance: '22222222-2222-4222-8222-222222222222',
  expense: '33333333-3333-4333-8333-333333333333',
};
const documentId = '44444444-4444-4444-8444-444444444444';
const expertiseId = '55555555-5555-4555-8555-555555555555';

const vehicle = {
  id: vehicleId,
  ownerId,
  brand: 'Test',
  model: 'Araç',
  year: 2024,
  plate: null,
  currentKm: 10_000,
  fuelType: 'gasoline',
  bodyType: 'sedan_hatchback',
  color: null,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  archivedAt: null,
};

const records = (['fuel', 'maintenance', 'expense'] as const).map((recordType, index) => ({
  id: recordIds[recordType],
  vehicleId,
  ownerId,
  recordType,
  category: recordType === 'expense' ? 'Otopark' : recordType === 'maintenance' ? 'Periyodik bakım' : 'Yakıt alımı',
  amount: recordType === 'fuel' ? 500 : index + 1,
  recordDate: '2026-08-01',
  kilometer: 10_000 + index,
  liters: null,
  description: null,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
}));

const documents = [
  {
    id: documentId,
    vehicleId,
    ownerId,
    documentType: 'registration',
    title: 'Ruhsat',
    documentNumber: null,
    issueDate: null,
    expiryDate: null,
    note: null,
    attachmentPath: 'owner/vehicle/random.pdf',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
];

const expertiseReports = [
  {
    id: expertiseId,
    vehicleId,
    ownerId,
    reportDate: '2026-08-01',
    companyName: 'QA Ekspertiz',
    overallNote: null,
    reportNumber: null,
    attachmentPath: 'owner/vehicle/report.pdf',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
];

async function mount(Component: () => React.JSX.Element): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<Component />);
  });
  return renderer!;
}

function findHost(root: ReactTestInstance, type: string, predicate?: (node: ReactTestInstance) => boolean) {
  return root.findAll((node) => node.type === type && (!predicate || predicate(node)));
}

function serialized(renderer: ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

describe('TASK-011 critical route component mounts', () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  beforeEach(() => {
    Object.keys(routeParams).forEach((key) => delete routeParams[key]);
    routerMock.navigate.mockClear();
    routerMock.push.mockClear();
    routerMock.replace.mockClear();
    openAttachmentMock.mockClear();
    authState.signUp.mockClear().mockResolvedValue(true);
    authState.resendConfirmation.mockClear().mockResolvedValue(true);
    Object.assign(dataState, {
      vehicles: [vehicle],
      activeVehicleId: vehicleId,
      records: [...records],
      reminders: [],
      documents: [...documents],
      expertiseReports: [...expertiseReports],
      saveRecord: vi.fn(async () => true),
      deleteRecord: vi.fn(async () => true),
      saveDocument: vi.fn(async () => true),
      deleteDocument: vi.fn(async () => true),
      saveExpertise: vi.fn(async () => true),
      deleteExpertise: vi.fn(async () => true),
      refresh: vi.fn(async () => undefined),
      loading: false,
      error: null,
      bootstrapped: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['fuel', 'Litre'],
    ['maintenance', 'Bakım kategorisi'],
    ['expense', 'Masraf kategorisi'],
  ] as const)('mounts the %s create route with its form', async (type, expectedField) => {
    routeParams.type = type;
    const renderer = await mount(RecordEditScreen);
    expect(serialized(renderer)).toContain('Kayıt ayrıntıları');
    expect(serialized(renderer)).toContain(expectedField);
  });

  it.each(Object.entries(recordIds))('mounts the %s edit/detail route', async (_type, id) => {
    routeParams.id = id;
    const renderer = await mount(RecordEditScreen);
    expect(serialized(renderer)).toContain('Kaydı sil');
    expect(serialized(renderer)).toContain('Kayıt ayrıntıları');
  });

  it('mounts attachment and expertise create routes', async () => {
    const documentRenderer = await mount(DocumentEditScreen);
    expect(serialized(documentRenderer)).toContain('Belge bilgileri');
    expect(serialized(documentRenderer)).toContain('AttachmentField');

    const expertiseRenderer = await mount(ExpertiseEditScreen);
    expect(serialized(expertiseRenderer)).toContain('Rapor bilgileri');
    expect(serialized(expertiseRenderer)).toContain('AttachmentField');
  });

  it('emits exact list-to-create and list-to-edit hrefs for documents and expertise', async () => {
    const documentsRenderer = await mount(DocumentsListScreen);
    act(() => documentsRenderer.root.findByProps({ title: 'Yeni belge' }).props.onPress());
    expect(routerMock.push).toHaveBeenLastCalledWith('/documents/edit');
    act(() => findHost(documentsRenderer.root, 'DocumentCard')[0].props.onPress());
    expect(routerMock.push).toHaveBeenLastCalledWith({
      pathname: '/documents/edit',
      params: { id: documentId },
    });

    const expertiseRenderer = await mount(ExpertiseListScreen);
    act(() =>
      expertiseRenderer.root.findByProps({ title: 'Yeni ekspertiz raporu' }).props.onPress(),
    );
    expect(routerMock.push).toHaveBeenLastCalledWith('/expertise/edit');
    act(() => expertiseRenderer.root.findByProps({ title: 'Aç' }).props.onPress());
    expect(routerMock.navigate).toHaveBeenLastCalledWith({
      pathname: '/expertise/edit',
      params: { id: expertiseId },
    });
  });

  it('mounts expertise file-open state and awaits the safe shared opener', async () => {
    routeParams.id = expertiseId;
    const renderer = await mount(ExpertiseEditScreen);
    const openButton = findHost(
      renderer.root,
      'AppButton',
      (node) => node.props.title === 'Mevcut eki aç',
    )[0];
    expect(openButton).toBeDefined();
    await act(async () => openButton.props.onPress());
    expect(openAttachmentMock).toHaveBeenCalledWith('owner/vehicle/report.pdf');
  });

  it('ends file-open loading and exposes only the safe retryable error', async () => {
    openAttachmentMock.mockRejectedValueOnce(
      new Error('provider signed_url=https://secret.example/object'),
    );
    routeParams.id = expertiseId;
    const renderer = await mount(ExpertiseEditScreen);
    const openButton = findHost(
      renderer.root,
      'AppButton',
      (node) => node.props.title === 'Mevcut eki aç',
    )[0];
    await act(async () => openButton.props.onPress());
    expect(serialized(renderer)).toContain(
      'Dosya açılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.',
    );
    expect(serialized(renderer)).not.toContain('secret.example');
    expect(
      findHost(renderer.root, 'AppButton', (node) => node.props.title === 'Mevcut eki aç')[0].props
        .loading,
    ).toBe(false);

    openAttachmentMock.mockResolvedValueOnce(undefined);
    await act(async () =>
      findHost(renderer.root, 'AppButton', (node) => node.props.title === 'Mevcut eki aç')[0].props.onPress(),
    );
    expect(openAttachmentMock).toHaveBeenCalledTimes(2);
  });

  it('does not present a missing attachment as an openable report', async () => {
    dataState.expertiseReports = [{ ...expertiseReports[0], attachmentPath: null }];
    routeParams.id = expertiseId;
    const renderer = await mount(ExpertiseEditScreen);
    expect(
      findHost(renderer.root, 'AppButton', (node) => node.props.title === 'Mevcut eki aç'),
    ).toHaveLength(0);
  });

  it.each([
    [RecordEditScreen, 'Bu kayıt silinmiş'],
    [DocumentEditScreen, 'Bu belge silinmiş'],
    [ExpertiseEditScreen, 'Bu ekspertiz raporu silinmiş'],
  ] as const)('renders a safe state for an invalid entity parameter', async (Component, copy) => {
    routeParams.id = 'not-a-valid-id';
    const renderer = await mount(Component);
    expect(serialized(renderer)).toContain(copy);
  });

  it('emits exact string-only dashboard create hrefs and does not show amount as litres', async () => {
    dataState.records = [records[0]];
    const renderer = await mount(DashboardScreen);
    for (const [label, type] of [
      ['Yakıt', 'fuel'],
      ['Bakım', 'maintenance'],
      ['Masraf', 'expense'],
    ] as const) {
      const action = findHost(
        renderer.root,
        'Pressable',
        (node) => String(node.props.accessibilityLabel).startsWith(label),
      )[0];
      expect(action).toBeDefined();
      act(() => action.props.onPress());
      expect(routerMock.navigate).toHaveBeenLastCalledWith({
        pathname: '/record/edit',
        params: { type },
      });
    }
    const dashboardText = findHost(renderer.root, 'Text')
      .flatMap((node) => node.children)
      .map(String)
      .join(' ');
    expect(dashboardText).toContain('—');
    expect(dashboardText).not.toContain('500 L');
  });

  it('renders current-month fuel, maintenance and expense totals without the free premium card', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-02T09:00:00+03:00'));
    dataState.records = [
      { ...records[0], amount: 500 },
      { ...records[1], amount: 2_000 },
      { ...records[2], amount: 5 },
    ];

    const renderer = await mount(DashboardScreen);
    const dashboardText = findHost(renderer.root, 'Text')
      .flatMap((node) => node.children)
      .map(String);
    expect(dashboardText).toContain(formatCurrency(500));
    expect(dashboardText).toContain(formatCurrency(2_000));
    expect(dashboardText).toContain(formatCurrency(5));
    expect(dashboardText).not.toContain('Yaklaşık maliyet');

    const chart = findHost(renderer.root, 'MiniBarChart')[0];
    expect(chart.props.data.at(-1)).toMatchObject({ key: '2026-08', total: 2_505 });
  });

  it('emits exact history edit hrefs for all three record types', async () => {
    const renderer = await mount(HistoryScreen);
    const cards = findHost(renderer.root, 'RecordCard');
    expect(cards).toHaveLength(3);
    cards.forEach((card) => {
      act(() => card.props.onPress());
      expect(routerMock.navigate).toHaveBeenLastCalledWith({
        pathname: '/record/edit',
        params: { id: card.props.record.id },
      });
    });
  });

  it('keeps the working auth register route independent from request IDs', async () => {
    const renderer = await mount(RegisterScreen);
    expect(serialized(renderer)).toContain('Aracınız için güvenli bir alan');
    expect(serialized(renderer)).toContain('Hesap oluştur');
  });

  it('keeps the normalized email through 60-second cooldowns and stops after three resends', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-02T09:00:00+03:00'));
    const renderer = await mount(RegisterScreen);
    const setField = (type: string, label: string, value: string) => {
      const field = findHost(renderer.root, type, (node) => node.props.label === label)[0];
      act(() => field.props.onChangeText(value));
    };
    setField('AppInput', 'Adınız', 'Sentetik Kullanıcı');
    setField('AppInput', 'E-posta', '  QA@Example.Invalid ');
    setField('PasswordInput', 'Şifre', 'Test1234!');
    setField('PasswordInput', 'Şifre tekrar', 'Test1234!');
    await act(async () => renderer.root.findByProps({ title: 'Hesap oluştur' }).props.onPress());
    expect(serialized(renderer)).toContain('E-postanızı doğrulayın');

    for (let attempt = 0; attempt < 3; attempt += 1) {
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      const resendButton = renderer.root.findAll((node) => String(node.type) === 'AppButton').find((node) =>
        String(node.props.title).includes('Doğrulama e-postasını tekrar gönder'),
      );
      expect(resendButton).toBeDefined();
      await act(async () => resendButton!.props.onPress());
    }
    expect(authState.resendConfirmation).toHaveBeenCalledTimes(3);
    expect(authState.resendConfirmation).toHaveBeenCalledWith('qa@example.invalid');
    expect(serialized(renderer)).toContain(
      'Çok fazla doğrulama e-postası istediniz. Lütfen daha sonra tekrar deneyin.',
    );
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(renderer.root.findByProps({ title: 'Tekrar gönderme sınırına ulaşıldı' }).props.disabled).toBe(
      true,
    );
    act(() => renderer.unmount());
  });
});
