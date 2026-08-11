import { Fragment } from 'react';
import { UnifiedAttachmentField } from '@/features/attachments/components/UnifiedAttachmentField';
import type { AttachmentListItem, PersistedAttachment } from '@/features/attachments/domain/types';
import type { DocumentType } from '@/domain/entities';
import { AppInput, DateField, ErrorBanner, FormSection } from '@/shared/components/ui';
import { getDocumentTypeDefinition, type DocumentFieldKey } from '../config/documentTypes';
import type { DocumentFormValues, DocumentValidationResult } from '../domain/documentValidation';

function visibleLabel(label: string, required: boolean): string {
  return required ? `${label} *` : label;
}

export function DocumentDetailsFields({
  type,
  values,
  errors,
  attachments,
  disabled,
  onChange,
  onAttachmentsChange,
  onOpenAttachment,
}: {
  type: DocumentType;
  values: DocumentFormValues;
  errors: DocumentValidationResult['errors'];
  attachments: AttachmentListItem[];
  disabled: boolean;
  onChange: <K extends keyof DocumentFormValues>(key: K, value: DocumentFormValues[K]) => void;
  onAttachmentsChange: (items: AttachmentListItem[]) => void;
  onOpenAttachment: (item: PersistedAttachment) => Promise<void> | void;
}) {
  const definition = getDocumentTypeDefinition(type);

  return (
    <FormSection title="Belge ayrıntıları">
      {definition.fields.map((field) => {
        const label = visibleLabel(field.label, field.required);
        if (field.kind === 'attachments') {
          return (
            <UnifiedAttachmentField
              key={field.key}
              items={attachments}
              disabled={disabled}
              onChange={onAttachmentsChange}
              onOpen={onOpenAttachment}
            />
          );
        }
        if (field.kind === 'date') {
          const key = field.key as 'startDate' | 'eventDate' | 'expiryDate';
          return (
            <Fragment key={field.key}>
              <DateField
                label={label}
                value={values[key]}
                onChange={(value) => onChange(key, value)}
                optional={!field.required}
              />
              {errors[key] ? <ErrorBanner message={errors[key] ?? ''} /> : null}
            </Fragment>
          );
        }

        const key = field.key as Exclude<
          DocumentFieldKey,
          'attachments' | 'startDate' | 'eventDate' | 'expiryDate'
        >;
        return (
          <AppInput
            key={field.key}
            label={label}
            value={values[key]}
            onChangeText={(value) => onChange(key, value)}
            multiline={field.kind === 'multiline'}
            error={errors[key]}
          />
        );
      })}
    </FormSection>
  );
}
