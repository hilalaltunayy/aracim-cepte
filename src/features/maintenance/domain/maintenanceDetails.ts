import { parseDecimal } from '@/shared/utils/format';
import {
  isMaintenanceServiceType,
  type MaintenanceServiceType,
} from '../config/maintenanceServiceTypes';

export interface MaintenanceDetailsFormValues {
  serviceType: string;
  serviceName: string;
  partsCost: string;
  laborCost: string;
  invoiceNumber: string;
  notes: string;
}

export type MaintenanceDetailsField = keyof MaintenanceDetailsFormValues;
export type MaintenanceDetailsErrorCode =
  'unknown_service_type' | 'invalid_cost' | 'negative_cost' | 'too_long';

export interface NormalizedMaintenanceDetails {
  serviceType: MaintenanceServiceType | null;
  serviceName: string | null;
  partsCost: number | null;
  laborCost: number | null;
  invoiceNumber: string | null;
  notes: string | null;
}

export interface MaintenanceDetailsValidation {
  valid: boolean;
  values: NormalizedMaintenanceDetails;
  errors: Partial<Record<MaintenanceDetailsField, MaintenanceDetailsErrorCode>>;
}

function optionalCost(raw: string): {
  value: number | null;
  error?: 'invalid_cost' | 'negative_cost';
} {
  if (!raw.trim()) return { value: null };
  const value = parseDecimal(raw);
  if (value === null || !Number.isFinite(value)) return { value: null, error: 'invalid_cost' };
  if (value < 0) return { value: null, error: 'negative_cost' };
  return { value };
}

export function validateMaintenanceDetails(
  form: MaintenanceDetailsFormValues,
): MaintenanceDetailsValidation {
  const errors: MaintenanceDetailsValidation['errors'] = {};
  const parts = optionalCost(form.partsCost);
  const labor = optionalCost(form.laborCost);

  if (form.serviceType && !isMaintenanceServiceType(form.serviceType)) {
    errors.serviceType = 'unknown_service_type';
  }
  if (parts.error) errors.partsCost = parts.error;
  if (labor.error) errors.laborCost = labor.error;
  if (form.serviceName.trim().length > 120) errors.serviceName = 'too_long';
  if (form.invoiceNumber.trim().length > 80) errors.invoiceNumber = 'too_long';
  if (form.notes.trim().length > 1_000) errors.notes = 'too_long';

  return {
    valid: Object.keys(errors).length === 0,
    values: {
      serviceType: isMaintenanceServiceType(form.serviceType) ? form.serviceType : null,
      serviceName: form.serviceName.trim() || null,
      partsCost: parts.value,
      laborCost: labor.value,
      invoiceNumber: form.invoiceNumber.trim() || null,
      notes: form.notes.trim() || null,
    },
    errors,
  };
}

export function resolveMaintenanceTotal(
  totalInput: string,
  details: Pick<NormalizedMaintenanceDetails, 'partsCost' | 'laborCost'>,
): { value: number | null; source: 'user' | 'breakdown' | 'none' } {
  if (totalInput.trim()) {
    return { value: parseDecimal(totalInput), source: 'user' };
  }
  if (details.partsCost !== null && details.laborCost !== null) {
    return { value: details.partsCost + details.laborCost, source: 'breakdown' };
  }
  return { value: null, source: 'none' };
}

export function hasMaintenanceDetails(
  details: NormalizedMaintenanceDetails,
  attachmentCount = 0,
): boolean {
  return Boolean(
    details.serviceType ||
    details.serviceName ||
    details.partsCost !== null ||
    details.laborCost !== null ||
    details.invoiceNumber ||
    details.notes ||
    attachmentCount > 0,
  );
}
