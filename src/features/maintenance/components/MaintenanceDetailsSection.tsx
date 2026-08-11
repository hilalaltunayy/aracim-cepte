import { View } from 'react-native';
import { UnifiedAttachmentField } from '@/features/attachments/components/UnifiedAttachmentField';
import type { AttachmentListItem, PersistedAttachment } from '@/features/attachments/domain/types';
import { AppButton, AppInput, ErrorBanner, FormSection, SelectField } from '@/shared/components/ui';
import { spacing } from '@/shared/theme';
import { maintenanceServiceTypeOptions } from '../config/maintenanceServiceTypes';
import type {
  MaintenanceDetailsErrorCode,
  MaintenanceDetailsField,
  MaintenanceDetailsFormValues,
} from '../domain/maintenanceDetails';

function errorMessage(code: MaintenanceDetailsErrorCode | undefined): string | null {
  if (code === 'unknown_service_type') return 'Geçerli bir servis türü seçin.';
  if (code === 'negative_cost') return 'Tutar negatif olamaz.';
  if (code === 'invalid_cost') return 'Geçerli bir tutar girin.';
  if (code === 'too_long') return 'Bu alan izin verilen uzunluğu aşıyor.';
  return null;
}

export function MaintenanceDetailsSection({
  expanded,
  values,
  errors,
  attachments,
  disabled,
  onToggle,
  onChange,
  onAttachmentsChange,
  onOpenAttachment,
}: {
  expanded: boolean;
  values: MaintenanceDetailsFormValues;
  errors: Partial<Record<MaintenanceDetailsField, MaintenanceDetailsErrorCode>>;
  attachments: AttachmentListItem[];
  disabled: boolean;
  onToggle: () => void;
  onChange: <K extends MaintenanceDetailsField>(
    key: K,
    value: MaintenanceDetailsFormValues[K],
  ) => void;
  onAttachmentsChange: (items: AttachmentListItem[]) => void;
  onOpenAttachment: (item: PersistedAttachment) => Promise<void> | void;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      <AppButton
        title={expanded ? 'Detayları gizle' : 'Detay ekle'}
        icon={expanded ? 'chevron-up-outline' : 'add-circle-outline'}
        variant="secondary"
        disabled={disabled}
        onPress={onToggle}
      />
      {expanded ? (
        <FormSection
          title="Servis ve belge detayları"
          description="Bu alanların tamamı isteğe bağlıdır."
        >
          <SelectField
            label="Servis türü"
            value={values.serviceType}
            options={[...maintenanceServiceTypeOptions]}
            onChange={(value) => onChange('serviceType', value)}
          />
          {errors.serviceType ? (
            <ErrorBanner message={errorMessage(errors.serviceType) ?? ''} />
          ) : null}
          <AppInput
            label="Servis / Usta adı"
            value={values.serviceName}
            onChangeText={(value) => onChange('serviceName', value)}
            error={errorMessage(errors.serviceName)}
          />
          <AppInput
            label="Parça tutarı"
            value={values.partsCost}
            onChangeText={(value) => onChange('partsCost', value)}
            keyboardType="decimal-pad"
            placeholder="Bilinmiyor"
            error={errorMessage(errors.partsCost)}
          />
          <AppInput
            label="İşçilik tutarı"
            value={values.laborCost}
            onChangeText={(value) => onChange('laborCost', value)}
            keyboardType="decimal-pad"
            placeholder="Bilinmiyor"
            error={errorMessage(errors.laborCost)}
          />
          <AppInput
            label="Fatura / Fiş no"
            value={values.invoiceNumber}
            onChangeText={(value) => onChange('invoiceNumber', value)}
            error={errorMessage(errors.invoiceNumber)}
          />
          <AppInput
            label="Not"
            value={values.notes}
            onChangeText={(value) => onChange('notes', value)}
            multiline
            error={errorMessage(errors.notes)}
          />
          <UnifiedAttachmentField
            items={attachments}
            disabled={disabled}
            onChange={onAttachmentsChange}
            onOpen={onOpenAttachment}
          />
        </FormSection>
      ) : null}
    </View>
  );
}
