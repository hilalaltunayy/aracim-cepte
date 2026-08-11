import {
  BodyPartCondition,
  ExpertiseReport,
  MaintenanceItem,
  MaintenanceTemplate,
  Reminder,
  Vehicle,
  VehicleDocument,
  VehicleNote,
  VehicleRecord,
} from '@/domain/entities';
import { Database } from '@/data/supabase/database.types';
import { getBodySchemaType } from '@/features/vehicles/config/bodyTypes';
import { resolveLegacyVehicleColor } from '@/features/vehicles/config/vehicleColors';
import { isFuelStationId } from '@/features/fuel/config/fuelStations';

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
  colorId: row.color_id ?? resolveLegacyVehicleColor(row.color),
  color: row.color,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
});

export const mapRecord = (
  row: Tables['vehicle_records']['Row'],
  maintenanceItems: MaintenanceItem[] = [],
): VehicleRecord => ({
  id: row.id,
  vehicleId: row.vehicle_id,
  ownerId: row.owner_id,
  recordType: row.record_type,
  category: row.category,
  amount: Number(row.amount),
  recordDate: row.record_date,
  kilometer: row.kilometer,
  liters: row.liters === null ? null : Number(row.liters),
  pricePerLiter: row.price_per_liter === null ? null : Number(row.price_per_liter),
  stationBrand: isFuelStationId(row.station_brand) ? row.station_brand : null,
  description: row.description,
  source: row.source,
  maintenanceItems,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapMaintenanceItem = (row: Tables['maintenance_items']['Row']): MaintenanceItem => ({
  id: row.id,
  maintenanceRecordId: row.maintenance_record_id,
  vehicleId: row.vehicle_id,
  ownerId: row.owner_id,
  itemType: row.item_type,
  cost: row.cost === null ? null : Number(row.cost),
  note: row.note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapMaintenanceTemplate = (
  row: Tables['maintenance_templates']['Row'],
): MaintenanceTemplate => ({
  id: row.id,
  ownerId: row.owner_id,
  title: row.title,
  itemDefinitions: [...row.item_definitions],
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
  dueTime: row.due_time?.slice(0, 5) ?? null,
  dueKilometer: row.due_kilometer,
  completed: row.completed,
  completedAt: row.completed_at,
  notificationId: row.notification_id,
  notificationStatus: row.notification_status,
  notificationLastAttemptAt: row.notification_last_attempt_at,
  notificationErrorCode: row.notification_error_code,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapBodyCondition = (
  row: Tables['body_part_conditions']['Row'],
): BodyPartCondition => ({
  id: row.id,
  vehicleId: row.vehicle_id,
  ownerId: row.owner_id,
  schemaType: getBodySchemaType(row.schema_type),
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
