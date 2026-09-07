/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { PendingAttachment } from '@/features/attachments/domain/types';
import type { DocumentFormValues } from '../../domain/documentValidation';

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
vi.mock('@/features/entitlements/services/ocrUsageQuota', () => ({
  reserveOcrUsage: vi.fn().mockResolvedValue({ operationId: 'ocr-op', usage: { usedCount: 0, monthlyQuota: 3, periodStart: '2026-08-01' } }),
  commitOcrUsage: vi.fn().mockResolvedValue({ usedCount: 1, monthlyQuota: 3, periodStart: '2026-08-01' }),
  releaseOcrUsage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/shared/theme', () => ({
  radii: { lg: 20 },
  spacing: { xs: 4, sm: 8, md: 12 },
  typography: { cardTitle: {}, caption: {}, label: {} },
  useAppTheme: () => ({ colors: { primaryAction: '#000' } }),
  useThemedStyles: (factory: (theme: unknown) => unknown) =>
    factory({
      colors: {
        border: '#000',
        elevatedSurface: '#fff',
        textPrimary: '#000',
        textSecondary: '#555',
        warning: '#800',
      },
    }),
}));
vi.mock('@/shared/components/ui', async () => {
  const React = await import('react');
  const host = (name: string) =>
    function Host(props: Record<string, unknown>) {
      return React.createElement(name, props);
    };
  return {
    AppButton: host('AppButton'),
    AppInput: host('AppInput'),
    ErrorBanner: host('ErrorBanner'),
  };
});

import { DocumentOcrSection } from './DocumentOcrSection';

const values: DocumentFormValues = {
  title: 'Trafik sigortası',
  documentNumber: '',
  issuerName: '',
  startDate: null,
  eventDate: null,
  expiryDate: null,
  note: '',
};
const image: PendingAttachment = {
  id: 'pending-image',
  requestId: 'request-image',
  uri: 'file:///synthetic.jpg',
  originalName: 'synthetic.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1200,
  source: 'gallery',
};

describe('DocumentOcrSection', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('does not mutate the form until the user explicitly applies reviewed suggestions', async () => {
    const onApply = vi.fn();
    const analyze = vi.fn().mockResolvedValue({
      status: 'success',
      suggestions: [
        { fieldId: 'documentNumber', suggestedValue: 'POL-42', source: 'document_ocr' },
      ],
    });
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <DocumentOcrSection
          documentType="traffic_insurance"
          attachments={[image]}
          currentValues={values}
          disabled={false}
          onApply={onApply}
          analyze={analyze}
        />,
      );
    });
    const scan = renderer!.root.findByProps({ title: 'Belgeden bilgileri tara' });
    await act(async () => scan.props.onPress());
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
    expect(renderer!.root.findAllByProps({ testID: 'document-ocr-review' })).toHaveLength(1);
    const apply = renderer!.root.findByProps({ title: 'Forma aktar' });
    act(() => apply.props.onPress());
    expect(onApply).toHaveBeenCalledWith({ documentNumber: 'POL-42' });
  });

  it('cancels suggestions without changing manual form data', async () => {
    const onApply = vi.fn();
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <DocumentOcrSection
          documentType="registration"
          attachments={[image]}
          currentValues={values}
          disabled={false}
          onApply={onApply}
          analyze={vi.fn().mockResolvedValue({
            status: 'success',
            suggestions: [
              { fieldId: 'documentNumber', suggestedValue: 'R-1', source: 'document_ocr' },
            ],
          })}
        />,
      );
    });
    await act(async () =>
      renderer!.root.findByProps({ title: 'Belgeden bilgileri tara' }).props.onPress(),
    );
    act(() => renderer!.root.findByProps({ title: 'Vazgeç' }).props.onPress());
    expect(onApply).not.toHaveBeenCalled();
    expect(renderer!.root.findAllByProps({ testID: 'document-ocr-review' })).toHaveLength(0);
  });

  it('shows a safe error and keeps manual entry available for unsupported input', async () => {
    const onApply = vi.fn();
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <DocumentOcrSection
          documentType="registration"
          attachments={[]}
          currentValues={values}
          disabled={false}
          onApply={onApply}
        />,
      );
    });
    act(() => renderer!.root.findByProps({ title: 'Belgeden bilgileri tara' }).props.onPress());
    expect(renderer!.root.findByType('ErrorBanner' as never).props.message).toContain(
      'JPG veya PNG',
    );
    expect(onApply).not.toHaveBeenCalled();
    expect(renderer!.root.findAllByType('AppButton' as never)).toHaveLength(1);
  });

  it('tells the user a stored image cannot be scanned instead of asking for one', async () => {
    // Recognition runs on the local file, so an uploaded attachment is not scannable.
    const stored = {
      id: 'stored-image',
      ownerId: 'owner',
      vehicleId: 'vehicle',
      parentType: 'vehicle_document' as const,
      parentId: 'document',
      source: 'gallery' as const,
      originalName: 'stored.jpg',
      storagePath: 'private/stored.jpg',
      mimeType: 'image/jpeg' as const,
      sizeBytes: 900,
      createdAt: '2026-09-07T00:00:00Z',
    };
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <DocumentOcrSection
          documentType="registration"
          attachments={[stored]}
          currentValues={values}
          disabled={false}
          onApply={vi.fn()}
        />,
      );
    });
    act(() => renderer!.root.findByProps({ title: 'Belgeden bilgileri tara' }).props.onPress());
    const message = renderer!.root.findByType('ErrorBanner' as never).props.message;
    expect(message).toContain('Kaydedilmiş bir görüntü');
    expect(message).not.toContain('JPG veya PNG biçiminde bir görüntü ekleyin');
  });

  it('surfaces the quota rejection reason instead of a generic failure', async () => {
    const quota = await import('@/features/entitlements/services/ocrUsageQuota');
    vi.mocked(quota.reserveOcrUsage).mockRejectedValueOnce(
      new Error('Bu ayki tarama limitinize ulaştınız. Bilgileri manuel girebilirsiniz.'),
    );
    const analyze = vi.fn();
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <DocumentOcrSection
          documentType="registration"
          attachments={[image]}
          currentValues={values}
          disabled={false}
          onApply={vi.fn()}
          analyze={analyze}
        />,
      );
    });
    await act(async () =>
      renderer!.root.findByProps({ title: 'Belgeden bilgileri tara' }).props.onPress(),
    );
    expect(renderer!.root.findByType('ErrorBanner' as never).props.message).toContain(
      'tarama limitinize ulaştınız',
    );
    // Quota was refused, so no scan and therefore no commit may follow.
    expect(analyze).not.toHaveBeenCalled();
  });

  it('reserves quota once for a double tap that lands before the first re-render', async () => {
    const quota = await import('@/features/entitlements/services/ocrUsageQuota');
    vi.mocked(quota.reserveOcrUsage).mockClear();
    let resolveAnalysis: ((value: { status: 'no_result'; code: 'no_text' }) => void) | undefined;
    const analyze = vi.fn(
      () =>
        new Promise<{ status: 'no_result'; code: 'no_text' }>((resolve) => {
          resolveAnalysis = resolve;
        }),
    );
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <DocumentOcrSection
          documentType="registration"
          attachments={[image]}
          currentValues={values}
          disabled={false}
          onApply={vi.fn()}
          analyze={analyze}
        />,
      );
    });
    const scan = renderer!.root.findByProps({ title: 'Belgeden bilgileri tara' });
    // Two taps in the same tick: a `useState` busy flag would not have applied yet.
    scan.props.onPress();
    scan.props.onPress();
    await act(async () => {
      resolveAnalysis?.({ status: 'no_result', code: 'no_text' });
    });
    expect(quota.reserveOcrUsage).toHaveBeenCalledTimes(1);
  });

  it('ignores a late OCR result after unmounting the document form', async () => {
    let resolveAnalysis: ((value: { status: 'success'; suggestions: [] }) => void) | undefined;
    const analyze = vi.fn(
      () =>
        new Promise<{ status: 'success'; suggestions: [] }>((resolve) => {
          resolveAnalysis = resolve;
        }),
    );
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <DocumentOcrSection
          documentType="registration"
          attachments={[image]}
          currentValues={values}
          disabled={false}
          onApply={vi.fn()}
          analyze={analyze}
        />,
      );
    });
    act(() => renderer!.root.findByProps({ title: 'Belgeden bilgileri tara' }).props.onPress());
    renderer!.unmount();
    await act(async () => resolveAnalysis?.({ status: 'success', suggestions: [] }));

    expect(analyze).toHaveBeenCalledTimes(1);
  });
});
