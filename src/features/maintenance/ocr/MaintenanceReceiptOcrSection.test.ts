/* eslint-disable import/first */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import type { PendingAttachment } from '@/features/attachments/domain/types';

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('@/features/entitlements/services/ocrUsageQuota', () => ({
  reserveOcrUsage: vi.fn().mockResolvedValue({ operationId: 'ocr-op', usage: { usedCount: 0, monthlyQuota: 3, periodStart: '2026-08-01' } }),
  commitOcrUsage: vi.fn().mockResolvedValue({ usedCount: 1, monthlyQuota: 3, periodStart: '2026-08-01' }),
  releaseOcrUsage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/shared/components/ui', () => ({
  AppButton: 'AppButton',
  AppInput: 'AppInput',
  ErrorBanner: 'ErrorBanner',
}));
vi.mock('@/shared/theme', () => ({
  spacing: { xs: 4, sm: 8, md: 12 },
  typography: { label: {}, caption: {} },
  useThemedStyles: (factory: (theme: unknown) => unknown) =>
    factory({ colors: { textPrimary: '#000', textSecondary: '#555', border: '#ddd', elevatedSurface: '#fff', primaryAction: '#00a', warning: '#a80' } }),
}));

import {
  buildMaintenanceReceiptPatch,
  MaintenanceReceiptOcrSection,
  prepareMaintenanceReceiptReviewSuggestions,
} from './MaintenanceReceiptOcrSection';

const image: PendingAttachment = {
  id: 'synthetic-maintenance-receipt',
  requestId: 'synthetic-request',
  uri: 'file:///synthetic-maintenance-receipt.jpg',
  originalName: 'synthetic-maintenance-receipt.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  source: 'gallery',
};
const details = { serviceType: '', serviceName: '', partsCost: '', laborCost: '', invoiceNumber: '', notes: '' };

describe('MaintenanceReceiptOcrSection review safety', () => {
  it('does not preselect an OCR overwrite for existing manual values', () => {
    const suggestions = prepareMaintenanceReceiptReviewSuggestions(
      [
        { fieldId: 'total', value: '4300', source: 'ocr' },
        { fieldId: 'partsCost', value: '3200', source: 'ocr' },
      ],
      details,
      '5000',
      '2026-08-11',
    );
    expect(suggestions[0].selected).toBe(false);
    expect(buildMaintenanceReceiptPatch(suggestions)).toEqual({ partsCost: '3200' });
  });

  it('applies reviewed suggestions only after explicit user action', async () => {
    const onApply = vi.fn();
    const analyze = vi.fn().mockResolvedValue({
      status: 'success',
      result: { suggestions: [{ fieldId: 'serviceName', value: 'ABC Oto', source: 'ocr' }] },
    });
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        React.createElement(MaintenanceReceiptOcrSection, {
          attachments: [image], details, total: '', recordDate: '2026-08-11', disabled: false, onApply, analyze,
        }),
      );
    });
    await act(async () => renderer!.root.findByProps({ title: 'Fişten bilgileri tara' }).props.onPress());
    expect(onApply).not.toHaveBeenCalled();
    expect(renderer!.root.findAllByProps({ testID: 'maintenance-receipt-ocr-review' })).toHaveLength(1);
    act(() => renderer!.root.findByProps({ title: 'Forma aktar' }).props.onPress());
    expect(onApply).toHaveBeenCalledWith({ serviceName: 'ABC Oto' });
  });
});
