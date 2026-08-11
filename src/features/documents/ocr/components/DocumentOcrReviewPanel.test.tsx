/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { DocumentFormValues } from '../../domain/documentValidation';
import type { DocumentOcrSuggestion } from '../domain/documentOcrTypes';

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
  return { AppButton: host('AppButton'), AppInput: host('AppInput') };
});

import {
  DocumentOcrReviewPanel,
  buildDocumentOcrFormPatch,
  prepareReviewSuggestions,
} from './DocumentOcrReviewPanel';
import { validateDocument } from '../../domain/documentValidation';

const emptyValues: DocumentFormValues = {
  title: 'Trafik sigortası',
  documentNumber: '',
  issuerName: '',
  startDate: null,
  eventDate: null,
  expiryDate: null,
  note: '',
};
const suggestions: DocumentOcrSuggestion[] = [
  { fieldId: 'documentNumber', suggestedValue: 'POL-1', source: 'document_ocr' },
  { fieldId: 'expiryDate', suggestedValue: '2027-08-10', source: 'document_ocr' },
];

describe('DocumentOcrReviewPanel', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('does not preselect an OCR overwrite for existing manual input', () => {
    const prepared = prepareReviewSuggestions(suggestions, {
      ...emptyValues,
      documentNumber: 'MANUEL-9',
    });
    expect(prepared[0].selected).toBe(false);
    expect(buildDocumentOcrFormPatch(prepared)).toEqual({ expiryDate: '2027-08-10' });
  });

  it('allows edit, remove and explicit apply without persisting itself', async () => {
    const onApply = vi.fn();
    const onChange = vi.fn();
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <DocumentOcrReviewPanel
          documentType="traffic_insurance"
          suggestions={prepareReviewSuggestions(suggestions, emptyValues)}
          currentValues={emptyValues}
          onChange={onChange}
          onApply={onApply}
          onCancel={vi.fn()}
        />,
      );
    });
    expect(onApply).not.toHaveBeenCalled();
    const policyInput = renderer!.root.findByProps({
      testID: 'ocr-suggestion-input-documentNumber',
    });
    act(() => policyInput.props.onChangeText('POL-EDIT'));
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ suggestedValue: 'POL-EDIT' })]),
    );
    act(() =>
      renderer!.root
        .findByProps({ testID: 'ocr-suggestion-toggle-documentNumber' })
        .props.onPress(),
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ fieldId: 'documentNumber', selected: false }),
      ]),
    );
    expect(onApply).not.toHaveBeenCalled();
  });

  it('keeps TASK-023 validation authoritative after suggestions are applied', () => {
    const invalid = prepareReviewSuggestions(
      [
        { fieldId: 'startDate', suggestedValue: '2027-08-10', source: 'document_ocr' },
        { fieldId: 'expiryDate', suggestedValue: '2026-08-10', source: 'document_ocr' },
      ],
      emptyValues,
    );
    const nextValues = { ...emptyValues, ...buildDocumentOcrFormPatch(invalid) };
    expect(validateDocument('traffic_insurance', nextValues).errors.expiryDate).toContain(
      'başlangıç',
    );
  });
});
