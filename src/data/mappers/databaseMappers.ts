import {
  BodyPartCondition,
  ExpertiseReport,
  Reminder,
  Vehicle,
  VehicleDocument,
  VehicleNote,
  VehicleRecord,
} from '@/domain/entities';
import { Database } from '@/data/supabase/database.types';

type Tables = Database['public']['Tables'];

export const mapVehicle = (row: Tables['vehicles']['Row']): Vehicle => ({
  id: row.id,
  ownerId: row.owner_id,
  brand: row.brand,
  model: row.model,
  year: row.year,
  plate: row.plate,
  currentKm: row.current_km,
  fuelType: row.fuel_type,
  bodyType: row.body_type,
  color: row.color,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
});

export const mapRecord = (row: Tables['vehicle_records']['Row']): VehicleRecord => ({
  id: row.id,
  vehicleId: row.vehicle_id,
  ownerId: row.owner_id,
  recordType: row.record_type,
  category: row.category,
  amount: Number(row.amount),
  recordDate: row.record_date,
  kilometer: row.kilometer,
  liters: row.liters === null ? null : Number(row.liters),
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapReminder = (row: Tables['reminders']['Row']): Reminder => ({
  id: row.id,
  vehicleId: row.vehicle_id,
  ownerId: row.owner_id,
  title: row.title,
  reminderType: row.reminder_type,
  dueDate: row.due_date,
  dueKilometer: row.due_kilometer,
  completed: row.completed,
  completedAt: row.completed_at,
  notificationId: row.notification_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapBodyCondition = (
  row: Tables['body_part_conditions']['Row'],
): BodyPartCondition => ({
  id: row.id,
  vehicleId: row.vehicle_id,
  ownerId: row.owner_id,
  schemaType: row.schema_type,
  partKey: row.part_key,
  condition: row.condition,
  note: row.note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapExpertise = (row: Tables['expertise_reports']['Row']): ExpertiseReport => ({
  id: row.id,
  vehicleId: row.vehicle_id,
  ownerId: row.owner_id,
  reportDate: row.report_date,
  companyName: row.company_name,
  overallNote: row.overall_note,
  reportNumber: row.report_number,
  attachmentPath: row.attachment_path,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapNote = (row: Tables['vehicle_notes']['Row']): VehicleNote => ({
  id: row.id,
  vehicleId: row.vehicle_id,
  ownerId: row.owner_id,
  title: row.title,
  content: row.content,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapDocument = (row: Tables['vehicle_documents']['Row']): VehicleDocument => ({
  id: row.id,
  vehicleId: row.vehicle_id,
  ownerId: row.owner_id,
  documentType: row.document_type,
  title: row.title,
  documentNumber: row.document_number,
  issueDate: row.issue_date,
  expiryDate: row.expiry_date,
  note: row.note,
  attachmentPath: row.attachment_path,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
