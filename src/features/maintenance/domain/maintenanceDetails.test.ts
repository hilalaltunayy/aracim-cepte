import { describe, expect, it } from 'vitest';
import {
  hasMaintenanceDetails,
  resolveMaintenanceTotal,
  validateMaintenanceDetails,
  type MaintenanceDetailsFormValues,
} from './maintenanceDetails';
import {
  getMaintenanceServiceTypeLabel,
  isMaintenanceServiceType,
  normalizeMaintenanceServiceType,
} from '../config/maintenanceServiceTypes';

const empty: MaintenanceDetailsFormValues = {
  serviceType: '',
  serviceName: '',
  partsCost: '',
  laborCost: '',
  invoiceNumber: '',
  notes: '',
};

describe('maintenance service details', () => {
  it('maps stable service type IDs to Turkish labels', () => {
    expect(getMaintenanceServiceTypeLabel('authorized_service')).toBe('Yetkili Servis');
    expect(getMaintenanceServiceTypeLabel('independent_service')).toBe('Özel Servis / Usta');
    expect(isMaintenanceServiceType('self_service')).toBe(true);
    expect(isMaintenanceServiceType('unknown')).toBe(false);
    expect(normalizeMaintenanceServiceType('other')).toBe('other');
    expect(normalizeMaintenanceServiceType('unknown')).toBeNull();
  });

  it('accepts missing optional details without inventing zero values', () => {
    const result = validateMaintenanceDetails(empty);
    expect(result).toEqual({
      valid: true,
      values: {
        serviceType: null,
        serviceName: null,
        partsCost: null,
        laborCost: null,
        invoiceNumber: null,
        notes: null,
      },
      errors: {},
    });
    expect(hasMaintenanceDetails(result.values)).toBe(false);
  });

  it('rejects unknown service types and malformed or negative costs', () => {
    const result = validateMaintenanceDetails({
      ...empty,
      serviceType: 'dealer_api',
      partsCost: '-1',
      laborCost: 'abc',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({
      serviceType: 'unknown_service_type',
      partsCost: 'negative_cost',
      laborCost: 'invalid_cost',
    });
  });

  it('normalizes service, invoice, notes and decimal costs', () => {
    const result = validateMaintenanceDetails({
      serviceType: 'authorized_service',
      serviceName: '  ABC Servis  ',
      partsCost: '3200,50',
      laborCost: '1100',
      invoiceNumber: '  F-123  ',
      notes: '  Yetkili servis bakımı  ',
    });
    expect(result.valid).toBe(true);
    expect(result.values).toEqual({
      serviceType: 'authorized_service',
      serviceName: 'ABC Servis',
      partsCost: 3200.5,
      laborCost: 1100,
      invoiceNumber: 'F-123',
      notes: 'Yetkili servis bakımı',
    });
  });

  it('derives a total only when the user left total empty and both costs are known', () => {
    const details = { partsCost: 3200, laborCost: 1100 };
    expect(resolveMaintenanceTotal('', details)).toEqual({ value: 4300, source: 'breakdown' });
    expect(resolveMaintenanceTotal('5000', details)).toEqual({ value: 5000, source: 'user' });
    expect(resolveMaintenanceTotal('', { partsCost: 3200, laborCost: null })).toEqual({
      value: null,
      source: 'none',
    });
  });
});
