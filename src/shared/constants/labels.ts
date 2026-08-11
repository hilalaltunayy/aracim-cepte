import {
  BodyCondition,
  DocumentType,
  FuelType,
  RecordType,
  ReminderType,
} from '@/domain/entities';

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

export const bodyConditionLabels: Record<BodyCondition, string> = {
  original: 'Orijinal',
  painted: 'Boyalı',
  locally_painted: 'Lokal Boyalı',
  replaced: 'Değişen',
  damaged: 'Hasarlı',
  unknown: 'Bilinmiyor',
};

export const documentTypeLabels: Record<DocumentType, string> = {
  registration: 'Ruhsat',
  traffic_insurance: 'Trafik sigortası',
  comprehensive_insurance: 'Kasko',
  inspection: 'Muayene',
  tax: 'MTV',
  service_document: 'Servis belgesi',
  expertise_report: 'Ekspertiz raporu',
  invoice: 'Fatura',
  custom: 'Diğer belge',
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
