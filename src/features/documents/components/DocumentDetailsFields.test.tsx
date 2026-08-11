/* eslint-disable import/first */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { DocumentType } from '@/domain/entities';
import type { DocumentFormValues } from '../domain/documentValidation';

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles },
  View: 'View',
}));
vi.mock('@/shared/components/ui', async () => {
  const React = await import('react');
  const host = (name: string) =>
    function Host(props: Record<string, unknown>) {
      return React.createElement(name, props);
    };
  return {
    AppInput: host('AppInput'),
    DateField: host('DateField'),
    ErrorBanner: host('ErrorBanner'),
    FormSection: host('FormSection'),
  };
});
vi.mock('@/features/attachments/components/UnifiedAttachmentField', async () => {
  const React = await import('react');
  return {
    UnifiedAttachmentField: (props: Record<string, unknown>) =>
      React.createElement('UnifiedAttachmentField', props),
  };
});
vi.mock('../ocr/components/DocumentOcrSection', async () => {
  const React = await import('react');
  return {
    DocumentOcrSection: (props: Record<string, unknown>) =>
      React.createElement('DocumentOcrSection', props),
  };
});

import { DocumentDetailsFields } from './DocumentDetailsFields';

const values: DocumentFormValues = {
  title: 'Belge',
  documentNumber: '',
  issuerName: '',
  startDate: null,
  eventDate: null,
  expiryDate: null,
  note: '',
};

async function mount(type: DocumentType): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <DocumentDetailsFields
        type={type}
        values={values}
        errors={{}}
        attachments={[]}
        disabled={false}
        onChange={vi.fn()}
        onAttachmentsChange={vi.fn()}
        onOpenAttachment={vi.fn()}
        onApplyOcrSuggestions={vi.fn()}
      />,
    );
  });
  return renderer!;
}

function labels(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAll((node) => ['AppInput', 'DateField'].includes(String(node.type)))
    .map((node) => node.props.label);
}

describe('DocumentDetailsFields', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('renders insurance fields and the shared attachment control', async () => {
    const renderer = await mount('traffic_insurance');
    expect(labels(renderer)).toEqual([
      'Başlık *',
      'Poliçe numarası',
      'Sigorta şirketi',
      'Başlangıç tarihi',
      'Bitiş tarihi',
      'Not',
    ]);
    expect(renderer.root.findAllByType('UnifiedAttachmentField' as never)).toHaveLength(1);
    expect(renderer.root.findAllByType('DocumentOcrSection' as never)).toHaveLength(1);
  });

  it('keeps registration free of insurance-only fields and raw internal IDs', async () => {
    const renderer = await mount('registration');
    const visibleLabels = labels(renderer);
    expect(visibleLabels).toEqual(['Başlık *', 'Belge / seri numarası', 'Tescil tarihi', 'Not']);
    const serialized = JSON.stringify(renderer.toJSON());
    expect(serialized).not.toContain('traffic_insurance');
    expect(visibleLabels).not.toContain('Sigorta şirketi');
  });
});
