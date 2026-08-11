/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PendingAttachment } from '@/features/attachments/domain/types';

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@/features/attachments/components/UnifiedAttachmentField', () => ({
  UnifiedAttachmentField: 'UnifiedAttachmentField',
}));
vi.mock('@/shared/components/ui', () => ({
  AppButton: 'AppButton',
  AppInput: 'AppInput',
  ErrorBanner: 'ErrorBanner',
  SelectField: 'SelectField',
}));
vi.mock('@/shared/theme', () => ({
  spacing: { sm: 8, md: 12 },
  typography: { label: {}, caption: {} },
  useThemedStyles: (factory: (theme: unknown) => unknown) =>
    factory({ colors: { textPrimary: '#000', textSecondary: '#555', border: '#ddd', elevatedSurface: '#fff', primaryAction: '#00a', warning: '#a80' } }),
}));
import { createFuelEntryState } from '../domain/fuelEntry';
import {
  buildFuelReceiptFormPatch,
  FuelReceiptOcrSection,
  prepareFuelReceiptReviewSuggestions,
} from './FuelReceiptOcrSection';

const image: PendingAttachment = {
  id: 'synthetic-receipt',
  requestId: 'synthetic-request',
  uri: 'file:///synthetic-receipt.jpg',
  originalName: 'synthetic-receipt.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  source: 'gallery',
};

describe('FuelReceiptOcrSection review safety', () => {
  it('does not preselect an OCR overwrite for existing manual input', () => {
    const suggestions = prepareFuelReceiptReviewSuggestions(
      [
        { fieldId: 'total', value: '2000', source: 'ocr' },
        { fieldId: 'liters', value: '43,29', source: 'ocr' },
      ],
      createFuelEntryState({ total: 500 }),
      '',
      '2026-08-11',
    );

    expect(suggestions[0].selected).toBe(false);
    expect(suggestions[1].selected).toBe(true);
    expect(buildFuelReceiptFormPatch(suggestions)).toEqual({ liters: '43,29' });
  });

  it('copies only explicitly selected edited suggestions into the unsaved form patch', () => {
    expect(
      buildFuelReceiptFormPatch([
        { fieldId: 'total', value: '2000', source: 'ocr', selected: true },
        { fieldId: 'stationBrand', value: 'opet', source: 'ocr', selected: true },
        { fieldId: 'recordDate', value: '2026-08-11', source: 'ocr', selected: false },
      ]),
    ).toEqual({ total: '2000', stationBrand: 'opet' });
  });

  it('does not change the fuel form until the user explicitly applies the reviewed result', async () => {
    const onApply = vi.fn();
    const analyze = vi.fn().mockResolvedValue({
      status: 'success',
      result: {
        inconsistent: false,
        suggestions: [{ fieldId: 'total', value: '2000', source: 'ocr' }],
      },
    });
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = create(
        React.createElement(FuelReceiptOcrSection, {
          fuelEntry: createFuelEntryState(),
          stationBrand: '',
          recordDate: '2026-08-11',
          disabled: false,
          onApply,
          analyze,
        }),
      );
    });

    act(() => renderer!.root.findByType('UnifiedAttachmentField' as never).props.onChange([image]));
    await act(async () => renderer!.root.findByProps({ title: 'Fişten bilgileri tara' }).props.onPress());

    expect(onApply).not.toHaveBeenCalled();
    expect(renderer!.root.findAllByProps({ testID: 'fuel-receipt-ocr-review' })).toHaveLength(1);

    act(() => renderer!.root.findByProps({ title: 'Forma aktar' }).props.onPress());
    expect(onApply).toHaveBeenCalledWith({ total: '2000' });
  });
});
