/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { MaintenanceDetailsFormValues } from '../domain/maintenanceDetails';

vi.mock('react-native', () => ({ View: 'View' }));
vi.mock('@/shared/theme', () => ({ spacing: { md: 12 } }));
vi.mock('@/shared/components/ui', async () => {
  const React = await import('react');
  const host = (name: string) =>
    function Host(props: Record<string, unknown>) {
      return React.createElement(name, props, props.children as React.ReactNode);
    };
  return {
    AppButton: host('AppButton'),
    AppInput: host('AppInput'),
    ErrorBanner: host('ErrorBanner'),
    FormSection: host('FormSection'),
    SelectField: host('SelectField'),
  };
});
vi.mock('@/features/attachments/components/UnifiedAttachmentField', async () => {
  const React = await import('react');
  return {
    UnifiedAttachmentField: (props: Record<string, unknown>) =>
      React.createElement('UnifiedAttachmentField', props),
  };
});
vi.mock('../ocr/MaintenanceReceiptOcrSection', async () => {
  const React = await import('react');
  return {
    MaintenanceReceiptOcrSection: (props: Record<string, unknown>) =>
      React.createElement('MaintenanceReceiptOcrSection', props),
  };
});

import { MaintenanceDetailsSection } from './MaintenanceDetailsSection';

const values: MaintenanceDetailsFormValues = {
  serviceType: '',
  serviceName: '',
  partsCost: '',
  laborCost: '',
  invoiceNumber: '',
  notes: '',
};

async function mount(expanded: boolean): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <MaintenanceDetailsSection
        expanded={expanded}
        values={values}
        errors={{}}
        attachments={[]}
        disabled={false}
        total=""
        recordDate="2026-08-11"
        onToggle={vi.fn()}
        onChange={vi.fn()}
        onAttachmentsChange={vi.fn()}
        onOpenAttachment={vi.fn()}
        onOcrApply={vi.fn()}
      />,
    );
  });
  return renderer!;
}

describe('MaintenanceDetailsSection', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('keeps optional fields collapsed by default', async () => {
    const renderer = await mount(false);
    expect(renderer.root.findByProps({ title: 'Detay ekle' })).toBeDefined();
    expect(renderer.root.findAllByType('UnifiedAttachmentField' as never)).toHaveLength(0);
  });

  it('renders service fields and the shared attachment picker when expanded', async () => {
    const renderer = await mount(true);
    expect(renderer.root.findByProps({ label: 'Servis türü' })).toBeDefined();
    expect(renderer.root.findByProps({ label: 'Parça tutarı' })).toBeDefined();
    expect(renderer.root.findByProps({ label: 'İşçilik tutarı' })).toBeDefined();
    expect(renderer.root.findAllByType('UnifiedAttachmentField' as never)).toHaveLength(1);
  });
});
