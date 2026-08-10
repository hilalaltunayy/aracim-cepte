import {
  BodyPartCondition,
  DocumentDraft,
  ExpertiseDraft,
  ExpertiseReport,
  MaintenanceTemplate,
  MaintenanceTemplateDraft,
  NoteDraft,
  RecordDraft,
  Reminder,
  ReminderDraft,
  Vehicle,
  VehicleDocument,
  VehicleDraft,
  VehicleNote,
  VehicleRecord,
} from '@/domain/entities';

export interface VehicleDataBundle {
  records: VehicleRecord[];
  reminders: Reminder[];
  bodyConditions: BodyPartCondition[];
  expertiseReports: ExpertiseReport[];
  notes: VehicleNote[];
  documents: VehicleDocument[];
  maintenanceTemplates: MaintenanceTemplate[];
}

export interface AppRepository {
  listVehicles(): Promise<Vehicle[]>;
  saveVehicle(draft: VehicleDraft, id?: string): Promise<Vehicle>;
  deleteVehicle(id: string): Promise<void>;
  loadVehicleData(vehicleId: string): Promise<VehicleDataBundle>;
  reconcileVehicleData(
    vehicleId: string,
    reminders: Reminder[],
  ): Promise<Pick<VehicleDataBundle, 'reminders' | 'expertiseReports' | 'documents'>>;
  saveRecord(
    vehicleId: string,
    draft: RecordDraft,
    id?: string,
    requestId?: string,
  ): Promise<VehicleRecord>;
  deleteRecord(id: string): Promise<void>;
  saveMaintenanceTemplate(
    draft: MaintenanceTemplateDraft,
    id?: string,
  ): Promise<MaintenanceTemplate>;
  deleteMaintenanceTemplate(id: string): Promise<void>;
  saveReminder(vehicleId: string, draft: ReminderDraft, id?: string): Promise<Reminder>;
  setReminderCompleted(reminder: Reminder, completed: boolean): Promise<Reminder>;
  deleteReminder(id: string): Promise<void>;
  saveBodyCondition(
    vehicle: Vehicle,
    partKey: string,
    condition: BodyPartCondition['condition'],
    note: string | null,
  ): Promise<BodyPartCondition>;
  saveExpertise(vehicleId: string, draft: ExpertiseDraft, id?: string): Promise<ExpertiseReport>;
  deleteExpertise(id: string): Promise<void>;
  saveNote(vehicleId: string, draft: NoteDraft, id?: string): Promise<VehicleNote>;
  deleteNote(id: string): Promise<void>;
  saveDocument(vehicleId: string, draft: DocumentDraft, id?: string): Promise<VehicleDocument>;
  deleteDocument(id: string): Promise<void>;
  clearVehicleSection(
    vehicleId: string,
    section: 'records' | 'reminders' | 'body' | 'documents',
  ): Promise<void>;
}
