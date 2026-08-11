import { FuelType, RecordType, ReminderType } from '@/domain/entities';
export { bodyConditionLabels } from '@/features/bodyCondition/config/bodyConditions';
export { documentTypeLabels } from '@/features/documents/config/documentTypes';

export const fuelTypeLabels: Record<FuelType, string> = {
  gasoline: 'Benzin',
  diesel: 'Dizel',
  lpg: 'LPG',
  electric: 'Elektrik',
  hybrid: 'Hibrit',
};

export const recordTypeLabels: Record<RecordType, string> = {
  fuel: 'Yakıt',
  maintenance: 'Bakım',
  expense: 'Diğer Masraf',
};

export const reminderTypeLabels: Record<ReminderType, string> = {
  inspection: 'Araç muayenesi',
  traffic_insurance: 'Trafik sigortası',
  comprehensive_insurance: 'Kasko',
  motor_vehicle_tax: 'MTV',
  periodic_maintenance: 'Periyodik bakım',
  tire_change: 'Lastik değişimi',
  custom: 'Özel hatırlatıcı',
};

export const maintenanceCategories = [
  'Yağ değişimi',
  'Filtre değişimi',
  'Lastik',
  'Fren',
  'Akü',
  'Periyodik bakım',
  'Tamir',
  'Diğer',
] as const;

export const expenseCategories = [
  'Otopark',
  'Araç yıkama',
  'Trafik sigortası',
  'Kasko',
  'MTV',
  'Muayene',
  'Ceza',
  'Tamir',
  'Otoyol ve köprü',
  'Diğer',
] as const;
