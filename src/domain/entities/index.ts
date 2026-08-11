export type FuelType = 'gasoline' | 'diesel' | 'lpg' | 'electric' | 'hybrid';
export type BodySchemaType = 'sedan_hatchback' | 'suv_crossover' | 'pickup_light_commercial';
export type NormalizedBodyType =
  | 'sedan'
  | 'hatchback'
  | 'crossover'
  | 'suv'
  | 'station_wagon'
  | 'coupe'
  | 'cabrio'
  | 'roadster'
  | 'pickup'
  | 'mpv_minivan'
  | 'van'
  | 'sports_car'
  | 'campervan'
  | 'minibus';
export type BodyType = BodySchemaType | NormalizedBodyType;
export type VehicleColorId =
  | 'white'
  | 'black'
  | 'gray'
  | 'silver'
  | 'red'
  | 'blue'
  | 'green'
  | 'brown'
  | 'beige'
  | 'gold'
  | 'yellow'
  | 'orange';
export type RecordType = 'fuel' | 'maintenance' | 'expense';
export type FuelStationId =
  | 'opet'
  | 'shell'
  | 'petrol_ofisi'
  | 'bp'
  | 'totalenergies'
  | 'aytemiz'
  | 'other';
export type MaintenanceSource =
  | 'manual'
  | 'receipt_ocr'
  | 'service'
  | 'obd'
  | 'connected_vehicle'
  | 'import';
export type ReminderType =
  | 'inspection'
  | 'traffic_insurance'
  | 'comprehensive_insurance'
  | 'motor_vehicle_tax'
  | 'periodic_maintenance'
  | 'tire_change'
  | 'custom';
export type ReminderNotificationStatus =
  | 'pending'
  | 'scheduled'
  | 'not_required'
  | 'permission_denied'
  | 'failed';
export type BodyCondition =
  'original' | 'painted' | 'locally_painted' | 'replaced' | 'damaged' | 'unknown';
export type DocumentType =
  | 'registration'
  | 'traffic_insurance'
  | 'comprehensive_insurance'
  | 'inspection'
  | 'tax'
  | 'service_document'
  | 'expertise_report'
  | 'invoice'
  | 'custom';

export interface Vehicle {
  id: string;
  ownerId: string;
  brand: string;
  model: string;
  year: number | null;
  plate: string | null;
  currentKm: number;
  fuelType: FuelType;
  bodyType: BodyType;
  colorId: VehicleColorId | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface VehicleRecord {
  id: string;
  vehicleId: string;
  ownerId: string;
  recordType: RecordType;
  category: string;
  amount: number;
  recordDate: string;
  kilometer: number | null;
  liters: number | null;
  pricePerLiter?: number | null;
  stationBrand?: FuelStationId | null;
  description: string | null;
  source?: MaintenanceSource;
  maintenanceItems?: MaintenanceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceItem {
  id: string;
  maintenanceRecordId: string;
  vehicleId: string;
  ownerId: string;
  itemType: string;
  cost: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceTemplate {
  id: string;
  ownerId: string;
  title: string;
  itemDefinitions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  vehicleId: string;
  ownerId: string;
  title: string;
  reminderType: ReminderType;
  dueDate: string | null;
  dueTime?: string | null;
  dueKilometer: number | null;
  completed: boolean;
  completedAt: string | null;
  notificationId: string | null;
  notificationStatus: ReminderNotificationStatus;
  notificationLastAttemptAt: string | null;
  notificationErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BodyPartCondition {
  id: string;
  vehicleId: string;
  ownerId: string;
  schemaType: BodySchemaType;
  partKey: string;
  conditions: BodyCondition[];
  condition: BodyCondition;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpertiseReport {
  id: string;
  vehicleId: string;
  ownerId: string;
  reportDate: string | null;
  companyName: string | null;
  overallNote: string | null;
  reportNumber: string | null;
  attachmentPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleNote {
  id: string;
  vehicleId: string;
  ownerId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  ownerId: string;
  documentType: DocumentType;
  title: string;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  note: string | null;
  attachmentPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VehicleDraft = Pick<
  Vehicle,
  'brand' | 'model' | 'year' | 'plate' | 'currentKm' | 'fuelType' | 'bodyType' | 'colorId' | 'color'
>;
export type RecordDraft = Pick<
  VehicleRecord,
  | 'recordType'
  | 'category'
  | 'amount'
  | 'recordDate'
  | 'kilometer'
  | 'liters'
  | 'pricePerLiter'
  | 'stationBrand'
  | 'description'
> & { maintenanceItemTypes?: string[]; source?: MaintenanceSource };
export type MaintenanceTemplateDraft = Pick<MaintenanceTemplate, 'title' | 'itemDefinitions'>;
export type ReminderDraft = Pick<
  Reminder,
  'title' | 'reminderType' | 'dueDate' | 'dueTime' | 'dueKilometer'
> & { notificationLeadDays?: number };
export type ExpertiseDraft = Pick<
  ExpertiseReport,
  'reportDate' | 'companyName' | 'overallNote' | 'reportNumber' | 'attachmentPath'
>;
export type NoteDraft = Pick<VehicleNote, 'title' | 'content'>;
export type DocumentDraft = Pick<
  VehicleDocument,
  | 'documentType'
  | 'title'
  | 'documentNumber'
  | 'issueDate'
  | 'expiryDate'
  | 'note'
  | 'attachmentPath'
>;
