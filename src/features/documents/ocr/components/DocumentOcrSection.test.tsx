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
});
