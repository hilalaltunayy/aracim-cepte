/* eslint-disable import/first */
import type { ReactNode } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  Object.assign(globalThis, {
    __DEV__: false,
    requestAnimationFrame: vi.fn(() => 1),
    cancelAnimationFrame: vi.fn(),
  });
});

const {
  authState,
  confirmChoiceMock,
  dataState,
  deleteAttachmentMock,
  openAttachmentMock,
  routeParams,
  routerMock,
  uploadParentAttachmentMock,
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
  deleteAttachmentMock: vi.fn(async () => undefined),
  uploadParentAttachmentMock: vi.fn(
    async (
      _vehicleId: string,
      parentType: string,
      _parentId: string,
      attachment: { id: string },
    ) => ({
      path:
        parentType === 'expertise_report'
          ? `owner/vehicle/expertise/report/${attachment.id}.jpg`
          : parentType === 'maintenance_record'
            ? `owner/vehicle/maintenance/record/${attachment.id}.jpg`
            : `owner/vehicle/document/${attachment.id}.jpg`,
      attachmentId: attachment.id,
    }),
  ),
  confirmChoiceMock: vi.fn(),
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
vi.mock('expo-linking', () => ({
  canOpenURL: vi.fn(async () => true),
  createURL: vi.fn((path: string) => `aracimcepte://${path}`),
  openURL: vi.fn(async () => undefined),
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
    confirmChoice: confirmChoiceMock,
  };
});

vi.mock('@/shared/components/entityCards', async () => {
  const React = await import('react');
  return {
    DocumentCard: ({
      document,
      ...props
    }: Record<string, unknown> & { document: { title: string } }) =>
      React.createElement('DocumentCard', { ...props, document }, document.title),
    RecordCard: ({
      record,
      ...props
    }: Record<string, unknown> & { record: { category: string } }) =>
      React.createElement('RecordCard', { ...props, record }, record.category),
  };
});

vi.mock('@/shared/components/MiniBarChart', () => ({ MiniBarChart: 'MiniBarChart' }));
vi.mock('@/shared/components/AttachmentField', () => ({ AttachmentField: 'AttachmentField' }));
vi.mock('@/features/attachments/components/UnifiedAttachmentField', () => ({
  UnifiedAttachmentField: 'UnifiedAttachmentField',
}));
vi.mock('@/data/storage/attachments', () => ({
  deleteAttachment: deleteAttachmentMock,
  openAttachment: openAttachmentMock,
  uploadAttachment: vi.fn(async () => 'owner/vehicle/random.pdf'),
  uploadParentAttachment: uploadParentAttachmentMock,
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
import VehicleEditScreen from '@/app/vehicle/edit';
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
  colorId: null,
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
  category:
    recordType === 'expense'
      ? 'Otopark'
      : recordType === 'maintenance'
        ? 'Periyodik bakım'
        : 'Yakıt alımı',
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
    issuerName: null,
    startDate: null,
    eventDate: null,
    issueDate: null,
    expiryDate: null,
    note: null,
    attachmentPath: 'owner/vehicle/random.pdf',
    attachments: [
      {
        id: `legacy:${documentId}`,
        storagePath: 'owner/vehicle/random.pdf',
        originalName: 'Mevcut belge eki.pdf',
        mimeType: 'application/pdf',
        sizeBytes: null,
        source: 'document',
        legacy: true,
      },
    ],
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
    attachments: [
      {
        id: `legacy:${expertiseId}`,
        storagePath: 'owner/vehicle/report.pdf',
        originalName: 'Mevcut ekspertiz eki.pdf',
        mimeType: 'application/pdf',
        sizeBytes: null,
        source: 'document',
        legacy: true,
      },
    ],
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

function findHost(
  root: ReactTestInstance,
  type: string,
  predicate?: (node: ReactTestInstance) => boolean,
) {
  return root.findAll((node) => node.type === type && (!predicate || predicate(node)));
}

function serialized(renderer: ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

describe('TASK-011 critical route component mounts', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    Object.keys(routeParams).forEach((key) => delete routeParams[key]);
    routerMock.navigate.mockClear();
    routerMock.push.mockClear();
    routerMock.replace.mockClear();
    openAttachmentMock.mockClear();
    deleteAttachmentMock.mockClear();
    uploadParentAttachmentMock.mockClear();
    confirmChoiceMock.mockClear();
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
      saveVehicle: vi.fn(async () => true),
      deleteRecord: vi.fn(async () => true),
      saveDocument: vi.fn(async () => true),
      deleteDocument: vi.fn(async () => true),
      saveExpertise: vi.fn(async () => true),
      deleteExpertise: vi.fn(async () => true),
      maintenanceTemplates: [],
      saveMaintenanceTemplate: vi.fn(async () => true),
      deleteMaintenanceTemplate: vi.fn(async () => true),
      refresh: vi.fn(async () => undefined),
      loading: false,
      error: null,
      bootstrapped: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mounts vehicle create with no fake body/color default and catalog options', async () => {
    const renderer = await mount(VehicleEditScreen);
    const bodyField = renderer.root.findByProps({ label: 'Gövde tipi' });
    const colorField = renderer.root.findByProps({ label: 'Araç rengi' });
    expect(bodyField.props.value).toBe('');
    expect(bodyField.props.options).toHaveLength(14);
    expect(colorField.props.value).toBe('');
    expect(colorField.props.options).toHaveLength(12);
    expect(colorField.props.options[0]).toMatchObject({ label: 'Beyaz', swatchColor: '#F7F7F2' });
  });

  it('restores normalized body and color selections when vehicle edit mounts', async () => {
    routeParams.id = vehicleId;
    dataState.vehicles = [{ ...vehicle, bodyType: 'suv', colorId: 'blue', color: 'Mavi' }];
    const renderer = await mount(VehicleEditScreen);
    expect(renderer.root.findByProps({ label: 'Gövde tipi' }).props.value).toBe('suv');
    expect(renderer.root.findByProps({ label: 'Araç rengi' }).props.value).toBe('blue');
  });

  it.each([
    ['fuel', 'Litre'],
    ['maintenance', 'Bakım paketi'],
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

  it('loads saved maintenance operations in the edit/detail route', async () => {
    routeParams.id = recordIds.maintenance;
    dataState.records = records.map((record) =>
      record.id === recordIds.maintenance
        ? {
            ...record,
            maintenanceItems: [
              {
                id: 'item-engine-oil',
                maintenanceRecordId: record.id,
                vehicleId,
                ownerId,
                itemType: 'engine_oil',
                cost: null,
                note: null,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
              },
            ],
          }
        : record,
    );
    const renderer = await mount(RecordEditScreen);
    expect(
      renderer.root.findByProps({ testID: 'maintenance-item-engine_oil' }).props.accessibilityState,
    ).toEqual({ checked: true });
  });

  it('asks before saving a timeline-inconsistent mileage and accepts explicit continuation', async () => {
    routeParams.type = 'maintenance';
    dataState.vehicles = [{ ...vehicle, currentKm: 150_000 }];
    dataState.records = [
      { ...records[0], id: recordIds.fuel, recordDate: '2026-04-01', kilometer: 145_000 },
      {
        ...records[1],
        id: recordIds.maintenance,
        recordDate: '2026-06-01',
        kilometer: 149_000,
      },
    ];
    const renderer = await mount(RecordEditScreen);
    const amountField = findHost(
      renderer.root,
      'AppInput',
      (node) => node.props.label === 'Toplam tutar',
    )[0];
    const kilometerField = findHost(
      renderer.root,
      'AppInput',
      (node) => node.props.label === 'Kilometre',
    )[0];
    const dateField = findHost(
      renderer.root,
      'DateField',
      (node) => node.props.label === 'Tarih',
    )[0];
    act(() => {
      amountField.props.onChangeText('100');
      kilometerField.props.onChangeText('170000');
      dateField.props.onChange('2026-05-01');
    });

    await act(async () => renderer.root.findByProps({ title: 'Kaydet' }).props.onPress());

    expect(confirmChoiceMock).toHaveBeenCalledWith(
      'Kilometre sıralaması',
      'Bu kilometre, diğer kayıtlarınızın tarih ve kilometre sıralamasıyla uyuşmuyor.',
      'Yine de kaydet',
      expect.any(Function),
      false,
      'Düzenle',
    );
    expect(dataState.saveRecord).not.toHaveBeenCalled();

    await act(async () => confirmChoiceMock.mock.calls[0][3]());
    expect(dataState.saveRecord).toHaveBeenCalledWith(
      expect.objectContaining({ kilometer: 170_000, recordDate: '2026-05-01' }),
      undefined,
      expect.any(String),
    );
  });

  it('mounts attachment and expertise create routes', async () => {
    const documentRenderer = await mount(DocumentEditScreen);
    expect(serialized(documentRenderer)).toContain('Belge ayrıntıları');
    expect(serialized(documentRenderer)).toContain('UnifiedAttachmentField');

    const expertiseRenderer = await mount(ExpertiseEditScreen);
    expect(serialized(expertiseRenderer)).toContain('Rapor bilgileri');
    expect(serialized(expertiseRenderer)).toContain('UnifiedAttachmentField');
  });

  it('saves optional maintenance service details through the shared attachment flow', async () => {
    routeParams.type = 'maintenance';
    const renderer = await mount(RecordEditScreen);
    act(() => renderer.root.findByProps({ title: 'Detay ekle' }).props.onPress());
    const field = findHost(renderer.root, 'UnifiedAttachmentField')[0];
    const pending = {
      id: '88888888-8888-4888-8888-888888888886',
      requestId: '88888888-8888-4888-8888-888888888896',
      uri: 'file:///maintenance-invoice.pdf',
      originalName: 'maintenance-invoice.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 200,
      source: 'document',
    };
    act(() => {
      renderer.root.findByProps({ label: 'Parça tutarı' }).props.onChangeText('3200');
      renderer.root.findByProps({ label: 'İşçilik tutarı' }).props.onChangeText('1800');
      renderer.root.findByProps({ label: 'Servis türü' }).props.onChange('authorized_service');
      renderer.root.findByProps({ label: 'Servis / Usta adı' }).props.onChangeText('QA Servis');
      renderer.root.findByProps({ label: 'Fatura / Fiş no' }).props.onChangeText('QA-001');
      field.props.onChange([pending]);
    });
    await act(async () => renderer.root.findByProps({ title: 'Kaydet' }).props.onPress());

    expect(uploadParentAttachmentMock).toHaveBeenCalledWith(
      vehicleId,
      'maintenance_record',
      '99999999-9999-4999-8999-999999999999',
      pending,
    );
    expect(dataState.saveRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        serviceType: 'authorized_service',
        serviceName: 'QA Servis',
        partsCost: 3200,
        laborCost: 1800,
        invoiceNumber: 'QA-001',
        attachmentPaths: [
          'owner/vehicle/maintenance/record/88888888-8888-4888-8888-888888888886.jpg',
        ],
      }),
      '99999999-9999-4999-8999-999999999999',
      expect.any(String),
    );
  });

  it('uploads a vehicle-document attachment through the TASK-022 parent flow', async () => {
    const renderer = await mount(DocumentEditScreen);
    const field = findHost(renderer.root, 'UnifiedAttachmentField')[0];
    const pending = {
      id: '88888888-8888-4888-8888-888888888884',
      requestId: '88888888-8888-4888-8888-888888888894',
      uri: 'file:///registration.pdf',
      originalName: 'registration.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 200,
      source: 'document',
    };
    await act(async () => field.props.onChange([pending]));
    await act(async () => renderer.root.findByProps({ title: 'Belgeyi kaydet' }).props.onPress());

    expect(uploadParentAttachmentMock).toHaveBeenCalledWith(
      vehicleId,
      'vehicle_document',
      '99999999-9999-4999-8999-999999999999',
      pending,
    );
    expect(dataState.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: 'registration',
        eventDate: null,
        attachmentPaths: ['owner/vehicle/document/88888888-8888-4888-8888-888888888884.jpg'],
      }),
      '99999999-9999-4999-8999-999999999999',
    );
  });

  it('uploads mixed-source expertise files into one atomic save payload', async () => {
    const renderer = await mount(ExpertiseEditScreen);
    const field = findHost(renderer.root, 'UnifiedAttachmentField')[0];
    const pending = [
      {
        id: '88888888-8888-4888-8888-888888888881',
        requestId: '88888888-8888-4888-8888-888888888891',
        uri: 'file:///camera.jpg',
        originalName: 'camera.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 100,
        source: 'camera',
      },
      {
        id: '88888888-8888-4888-8888-888888888882',
        requestId: '88888888-8888-4888-8888-888888888892',
        uri: 'file:///report.pdf',
        originalName: 'report.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 200,
        source: 'document',
      },
    ];
    await act(async () => field.props.onChange(pending));
    await act(async () => renderer.root.findByProps({ title: 'Raporu kaydet' }).props.onPress());
    expect(uploadParentAttachmentMock).toHaveBeenCalledTimes(2);
    expect(dataState.saveExpertise).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentPaths: [
          'owner/vehicle/expertise/report/88888888-8888-4888-8888-888888888881.jpg',
          'owner/vehicle/expertise/report/88888888-8888-4888-8888-888888888882.jpg',
        ],
      }),
      expect.any(String),
    );
  });

  it('queues uploaded expertise files for cleanup when metadata save fails', async () => {
    dataState.saveExpertise = vi.fn(async () => false);
    const renderer = await mount(ExpertiseEditScreen);
    const field = findHost(renderer.root, 'UnifiedAttachmentField')[0];
    await act(async () =>
      field.props.onChange([
        {
          id: '88888888-8888-4888-8888-888888888883',
          requestId: '88888888-8888-4888-8888-888888888893',
          uri: 'file:///failed.jpg',
          originalName: 'failed.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 100,
          source: 'gallery',
        },
      ]),
    );
    await act(async () => renderer.root.findByProps({ title: 'Raporu kaydet' }).props.onPress());
    expect(deleteAttachmentMock).toHaveBeenCalledWith(
      'owner/vehicle/expertise/report/88888888-8888-4888-8888-888888888883.jpg',
    );
    expect(serialized(renderer)).toContain(
      'Ekspertiz raporu kaydedilemedi. Lütfen tekrar deneyin.',
    );
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
    const field = findHost(renderer.root, 'UnifiedAttachmentField')[0];
    expect(field.props.items).toHaveLength(1);
    await act(async () => field.props.onOpen(field.props.items[0]));
    expect(openAttachmentMock).toHaveBeenCalledWith('owner/vehicle/report.pdf');
  });

  it('does not present a missing attachment as an openable report', async () => {
    dataState.expertiseReports = [
      { ...expertiseReports[0], attachmentPath: null, attachments: [] },
    ];
    routeParams.id = expertiseId;
    const renderer = await mount(ExpertiseEditScreen);
    expect(findHost(renderer.root, 'UnifiedAttachmentField')[0].props.items).toEqual([]);
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
      const action = findHost(renderer.root, 'Pressable', (node) =>
        String(node.props.accessibilityLabel).startsWith(label),
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
      const resendButton = renderer.root
        .findAll((node) => String(node.type) === 'AppButton')
        .find((node) => String(node.props.title).includes('Doğrulama e-postasını tekrar gönder'));
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
    expect(
      renderer.root.findByProps({ title: 'Tekrar gönderme sınırına ulaşıldı' }).props.disabled,
    ).toBe(true);
    act(() => renderer.unmount());
  });
});
