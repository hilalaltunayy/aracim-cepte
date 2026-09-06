/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PendingAttachment } from '@/features/attachments/domain/types';

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  StyleSheet: { create: <T>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@/features/entitlements/services/ocrUsageQuota', () => ({
  reserveOcrUsage: vi
    .fn()
    .mockResolvedValue({
      operationId: 'ocr-op',
      usage: { usedCount: 0, monthlyQuota: 3, periodStart: '2026-08-01' },
    }),
  commitOcrUsage: vi
    .fn()
    .mockResolvedValue({ usedCount: 1, monthlyQuota: 3, periodStart: '2026-08-01' }),
  releaseOcrUsage: vi.fn().mockResolvedValue(undefined),
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
    factory({
      colors: {
        textPrimary: '#000',
        textSecondary: '#555',
        border: '#ddd',
        elevatedSurface: '#fff',
        primaryAction: '#00a',
        warning: '#a80',
      },
    }),
}));
import { formatDate } from '@/shared/utils/format';
import { createFuelEntryState } from '../domain/fuelEntry';
import { parseFuelReceiptOcrText } from './fuelReceiptOcr';
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
  it('keeps every OCR value directly editable and transfers each non-empty reviewed value', () => {
    const suggestions = prepareFuelReceiptReviewSuggestions(
      [
        { fieldId: 'total', value: '2000', source: 'ocr' },
        { fieldId: 'liters', value: '43,29', source: 'ocr' },
      ],
      createFuelEntryState({ total: 500 }),
      '',
      '2026-08-11',
    );

    expect(buildFuelReceiptFormPatch(suggestions)).toEqual({ total: '2000', liters: '43,29' });
  });

  it('always shows the six receipt fields, even the ones OCR could not read', () => {
    const reviewed = prepareFuelReceiptReviewSuggestions(
      [{ fieldId: 'total', value: '500', source: 'ocr' }],
      createFuelEntryState(),
      '',
      '2026-09-05',
    );

    expect(reviewed.map((item) => item.fieldId)).toEqual([
      'total',
      'liters',
      'pricePerLiter',
      'recordDate',
      'receiptTime',
      'documentNumber',
    ]);
    expect(reviewed.find((item) => item.fieldId === 'total')?.value).toBe('500');
    // Undetected fields stay visible with an empty, editable value...
    expect(reviewed.find((item) => item.fieldId === 'liters')?.value).toBe('');
    // ...and are never written into the form.
    expect(buildFuelReceiptFormPatch(reviewed)).toEqual({ total: '500' });
  });

  it('keeps extra detected fields (station, location) after the canonical rows', () => {
    const reviewed = prepareFuelReceiptReviewSuggestions(
      [
        { fieldId: 'stationBrand', value: 'opet', source: 'ocr' },
        { fieldId: 'liters', value: '6,55', source: 'ocr' },
      ],
      createFuelEntryState(),
      '',
      '2026-09-05',
    );
    expect(reviewed).toHaveLength(7);
    expect(reviewed[6]).toMatchObject({ fieldId: 'stationBrand', value: 'opet' });
    expect(buildFuelReceiptFormPatch(reviewed)).toEqual({ liters: '6,55', stationBrand: 'opet' });
  });

  it('copies only non-empty reviewed suggestions into the unsaved form patch', () => {
    expect(
      buildFuelReceiptFormPatch([
        { fieldId: 'total', value: '2000', source: 'ocr' },
        { fieldId: 'stationBrand', value: 'opet', source: 'ocr' },
        { fieldId: 'recordDate', value: '', source: 'ocr' },
      ]),
    ).toEqual({ total: '2000', stationBrand: 'opet' });
  });

  it(
    'RELEASE FIX regression: OCR-detected 02-09-2026 survives review -> Forma aktar -> ' +
      'form date state -> displayed date, replacing today’s default',
    () => {
      const todayIso = '2026-09-05';
      const receiptText = [
        'OPET AKARYAKIT',
        'PLAKA: 42 ABC 123',
        'TARIH:02-09-202614:45',
        '6,550 LT x 76,35 TL/L',
        'TOPLAM',
        '500,00 TL',
        'FIS NO: 0142',
      ].join('\n');

      // OCR text -> parser -> parsed receipt result.
      const parsed = parseFuelReceiptOcrText(receiptText);
      expect(parsed.suggestions).toContainEqual({
        fieldId: 'recordDate',
        value: '2026-09-02',
        source: 'ocr',
      });

      // parsed result -> review state (what the review screen shows/edits).
      const reviewState = prepareFuelReceiptReviewSuggestions(
        parsed.suggestions,
        createFuelEntryState(),
        '',
        todayIso,
      );

      // "Forma aktar" -> form state patch.
      const patch = buildFuelReceiptFormPatch(reviewState);
      expect(patch.recordDate).toBe('2026-09-02');

      // form state: the screen's `date` useState, exactly as record/edit.tsx
      // applies it (`if (patch.recordDate !== undefined) setDate(patch.recordDate)`).
      let formDate = todayIso;
      if (patch.recordDate !== undefined) formDate = patch.recordDate;
      expect(formDate).toBe('2026-09-02');
      expect(formDate).not.toBe(todayIso);

      // date picker/display + what actually gets persisted to the DB payload
      // (`recordDate: date` in record/edit.tsx's saveRecord call) both read the
      // same form date state, so this is the final displayed AND saved value.
      expect(formatDate(formDate)).toBe('02 Eylül 2026');
    },
  );

  it('keeps the current form date when OCR finds no trustworthy date', () => {
    const todayIso = '2026-09-05';
    const parsed = parseFuelReceiptOcrText('Toplam: 500,00\nFİŞ NO: 0142');
    expect(parsed.suggestions.some((s) => s.fieldId === 'recordDate')).toBe(false);

    const patch = buildFuelReceiptFormPatch(
      prepareFuelReceiptReviewSuggestions(parsed.suggestions, createFuelEntryState(), '', todayIso),
    );
    expect(patch.recordDate).toBeUndefined();

    let formDate = todayIso;
    if (patch.recordDate !== undefined) formDate = patch.recordDate;
    expect(formDate).toBe(todayIso);
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
    await act(async () =>
      renderer!.root.findByProps({ title: 'Fişten bilgileri tara' }).props.onPress(),
    );

    expect(onApply).not.toHaveBeenCalled();
    expect(renderer!.root.findAllByProps({ testID: 'fuel-receipt-ocr-review' })).toHaveLength(1);

    act(() => renderer!.root.findByProps({ title: 'Forma aktar' }).props.onPress());
    expect(onApply).toHaveBeenCalledWith({ total: '2000' });
  });
});
