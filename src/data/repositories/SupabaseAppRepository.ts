import {
  BodyPartCondition,
  DocumentDraft,
  ExpertiseDraft,
  MaintenanceTemplateDraft,
  NoteDraft,
  RecordDraft,
  Reminder,
  ReminderDraft,
  Vehicle,
  VehicleDraft,
  VehiclePhoto,
  VehicleRecord,
} from '@/domain/entities';
import { AppRepository, VehicleDataBundle } from '@/domain/repositories/AppRepository';
import { getSupabaseClient } from '@/data/supabase/client';
import {
  mapBodyCondition,
  mapAttachment,
  mapDocument,
  mapExpertise,
  mapMaintenanceItem,
  mapMaintenanceTemplate,
  mapNote,
  mapRecord,
  mapReminder,
  mapVehicle,
  mapVehiclePhoto,
} from '@/data/mappers/databaseMappers';
import { AppError } from '@/shared/utils/errors';
import {
  cancelReminderNotification,
  cancelUnknownReminderNotifications,
  reconcileReminderNotification,
} from '@/features/reminders/notifications';
import { isValidPartKey } from '@/features/bodyCondition/schemas';
import {
  normalizeBodyConditions,
  validateBodyConditions,
} from '@/features/bodyCondition/domain/bodyConditionRules';
import { getBodySchemaType } from '@/features/vehicles/config/bodyTypes';
import { getVehicleTaxonomyPersistenceFields } from '@/features/vehicles/services/vehiclePersistence';
import { createRequestId } from '@/shared/utils/requestId';
import { reconcileAttachments, uploadParentAttachment } from '@/data/storage/attachments';
import type { Attachment, PendingAttachment } from '@/features/attachments/domain/types';
import {
  removeNotificationPreferences,
  setNotificationLeadDays,
} from '@/features/reminders/notificationPreferences';
import { validateReminderDateTime } from '@/features/reminders/reminderDateTimeValidation';

async function ownerId(): Promise<string> {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error || !data.user)
    throw new AppError('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.', 'AUTH');
  return data.user.id;
}

function required<T>(value: T | null, message: string): T {
  if (value === null) throw new AppError(message);
  return value;
}

export class SupabaseAppRepository implements AppRepository {
  async listVehicles() {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('vehicles')
      .select('*')
      .is('archived_at', null)
      .order('created_at');
    if (error) throw error;
    const vehicleRows = data ?? [];
    if (!vehicleRows.length) return [];
    const vehicleIds = vehicleRows.map((vehicle) => vehicle.id);
    const [photoResult, attachmentResult] = await Promise.all([
      client
        .from('vehicle_photos')
        .select('*')
        .in('vehicle_id', vehicleIds)
        .eq('is_primary', true),
      client
        .from('attachments')
        .select('*')
        .in('vehicle_id', vehicleIds)
        .eq('parent_type', 'vehicle_photo'),
    ]);
    if (photoResult.error) throw photoResult.error;
    if (attachmentResult.error) throw attachmentResult.error;
    const attachmentById = new Map(
      (attachmentResult.data ?? []).map((attachment) => [attachment.id, mapAttachment(attachment)]),
    );
    const primaryByVehicle = new Map<string, NonNullable<Vehicle['primaryPhoto']>>();
    for (const photo of photoResult.data ?? []) {
      const attachment = attachmentById.get(photo.attachment_id);
      if (attachment) primaryByVehicle.set(photo.vehicle_id, { id: photo.id, storagePath: attachment.storagePath });
    }
    return vehicleRows.map((vehicle) => ({
      ...mapVehicle(vehicle),
      primaryPhoto: primaryByVehicle.get(vehicle.id) ?? null,
    }));
  }

  async saveVehicle(draft: VehicleDraft, id?: string) {
    const payload = {
      brand: draft.brand.trim(),
      model: draft.model.trim(),
      year: draft.year,
      plate: draft.plate?.trim().toLocaleUpperCase('tr-TR') || null,
      current_km: draft.currentKm,
      fuel_type: draft.fuelType,
      ...getVehicleTaxonomyPersistenceFields(draft),
      archived_at: null,
    };
    const client = getSupabaseClient();
    const result = id
      ? await client
          .from('vehicles')
          .update({ ...payload, owner_id: await ownerId() })
          .eq('id', id)
          .select('*')
          .single()
      : await client.rpc('create_vehicle_with_limit', {
          p_brand: payload.brand,
          p_model: payload.model,
          p_year: payload.year,
          p_plate: payload.plate,
          p_current_km: payload.current_km,
          p_fuel_type: payload.fuel_type,
          p_body_type: payload.body_type,
          p_color: payload.color,
          p_color_id: payload.color_id,
        });
    const { data, error } = result;
    if (error) throw error;
    return mapVehicle(required(data, 'Araç kaydedilemedi.'));
  }

  async deleteVehicle(id: string) {
    const client = getSupabaseClient();
    const reminders = await client
      .from('reminders')
      .select('id, notification_id')
      .eq('vehicle_id', id);
    if (reminders.error) throw reminders.error;
    const { error } = await client.rpc('delete_vehicle_consistent', { p_vehicle_id: id });
    if (error) throw error;
    await Promise.all(
      (reminders.data ?? []).map((item) => cancelReminderNotification(item.notification_id)),
    );
    await removeNotificationPreferences((reminders.data ?? []).map((item) => item.id));
    void reconcileAttachments().catch(() => undefined);
  }

  async listVehiclePhotos(vehicleId: string): Promise<VehiclePhoto[]> {
    const client = getSupabaseClient();
    const [photos, attachments] = await Promise.all([
      client
        .from('vehicle_photos')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('is_primary', { ascending: false })
        .order('sort_order')
        .order('created_at'),
      client
        .from('attachments')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('parent_type', 'vehicle_photo'),
    ]);
    if (photos.error) throw photos.error;
    if (attachments.error) throw attachments.error;
    const attachmentById = new Map<string, Attachment>(
      (attachments.data ?? []).map((attachment) => [attachment.id, mapAttachment(attachment)]),
    );
    return (photos.data ?? []).flatMap((photo) => {
      const attachment = attachmentById.get(photo.attachment_id);
      return attachment ? [mapVehiclePhoto(photo, attachment)] : [];
    });
  }

  async saveVehiclePhoto(
    vehicleId: string,
    attachment: PendingAttachment,
    replacesPhotoId?: string,
  ): Promise<VehiclePhoto> {
    const uploaded = await uploadParentAttachment(vehicleId, 'vehicle_photo', attachment.id, attachment, {
      replacesPhotoId,
    });
    const { error } = await getSupabaseClient().rpc('save_vehicle_photo', {
      p_vehicle_id: vehicleId,
      p_photo_id: attachment.id,
      p_attachment_path: uploaded.path,
    });
    if (error) throw error;
    const saved = (await this.listVehiclePhotos(vehicleId)).find((photo) => photo.id === attachment.id);
    if (!saved) throw new AppError('Araç fotoğrafı kaydedilemedi.');
    return saved;
  }

  async setVehiclePhotoPrimary(id: string): Promise<VehiclePhoto> {
    const { data, error } = await getSupabaseClient().rpc('set_vehicle_photo_primary', {
      p_photo_id: id,
    });
    if (error) throw error;
    const row = required(data, 'Araç profil fotoğrafı güncellenemedi.');
    const photos = await this.listVehiclePhotos(row.vehicle_id);
    const saved = photos.find((photo) => photo.id === row.id);
    if (!saved) throw new AppError('Araç profil fotoğrafı güncellenemedi.');
    return saved;
  }

  async deleteVehiclePhoto(id: string): Promise<boolean> {
    const { data, error } = await getSupabaseClient().rpc('delete_vehicle_photo', { p_photo_id: id });
    if (error) throw error;
    if (data) void reconcileAttachments().catch(() => undefined);
    return Boolean(data);
  }

  async loadVehicleReportRecords(vehicleId: string): Promise<VehicleRecord[]> {
    const client = getSupabaseClient();
    const [records, maintenanceItems] = await Promise.all([
      client.from('vehicle_records').select('*').eq('vehicle_id', vehicleId).order('record_date', { ascending: false }),
      client.from('maintenance_items').select('*').eq('vehicle_id', vehicleId),
    ]);
    if (records.error ?? maintenanceItems.error) throw records.error ?? maintenanceItems.error;
    const mappedItems = (maintenanceItems.data ?? []).map(mapMaintenanceItem);
    const itemsByRecord = new Map<string, typeof mappedItems>();
    for (const item of mappedItems) {
      const current = itemsByRecord.get(item.maintenanceRecordId) ?? [];
      current.push(item);
      itemsByRecord.set(item.maintenanceRecordId, current);
    }
    return (records.data ?? []).map((row) => mapRecord(row, itemsByRecord.get(row.id) ?? [], []));
  }

  async loadVehicleData(vehicleId: string): Promise<VehicleDataBundle> {
    const client = getSupabaseClient();
    const [
      records,
      maintenanceItems,
      maintenanceTemplates,
      reminders,
      body,
      bodyValues,
      expertise,
      vehiclePhotos,
      attachments,
      notes,
      documents,
    ] = await Promise.all([
      client
        .from('vehicle_records')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('record_date', { ascending: false }),
      client.from('maintenance_items').select('*').eq('vehicle_id', vehicleId),
      client.from('maintenance_templates').select('*').order('updated_at', { ascending: false }),
      client.from('reminders').select('*').eq('vehicle_id', vehicleId).order('due_date'),
      client.from('body_part_conditions').select('*').eq('vehicle_id', vehicleId),
      client.from('body_part_condition_values').select('*').eq('vehicle_id', vehicleId),
      client
        .from('expertise_reports')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('report_date', { ascending: false }),
      client
        .from('vehicle_photos')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('is_primary', { ascending: false })
        .order('sort_order')
        .order('created_at'),
      client
        .from('attachments')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .in('parent_type', ['expertise_report', 'vehicle_document', 'maintenance_record', 'vehicle_photo'])
        .order('created_at'),
      client
        .from('vehicle_notes')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('updated_at', { ascending: false }),
      client.from('vehicle_documents').select('*').eq('vehicle_id', vehicleId).order('expiry_date'),
    ]);
    const error =
      records.error ??
      maintenanceItems.error ??
      maintenanceTemplates.error ??
      reminders.error ??
      body.error ??
      bodyValues.error ??
      expertise.error ??
      vehiclePhotos.error ??
      attachments.error ??
      notes.error ??
      documents.error;
    if (error) throw error;
    const mappedReminders = (reminders.data ?? []).map(mapReminder);
    const mappedItems = (maintenanceItems.data ?? []).map(mapMaintenanceItem);
    const itemsByRecord = new Map<string, typeof mappedItems>();
    for (const item of mappedItems) {
      const current = itemsByRecord.get(item.maintenanceRecordId) ?? [];
      current.push(item);
      itemsByRecord.set(item.maintenanceRecordId, current);
    }
    const bodyValuesByParent = new Map<string, NonNullable<typeof bodyValues.data>>();
    for (const value of bodyValues.data ?? []) {
      const current = bodyValuesByParent.get(value.body_part_condition_id) ?? [];
      current.push(value);
      bodyValuesByParent.set(value.body_part_condition_id, current);
    }
    const attachmentsByParent = new Map<string, NonNullable<typeof attachments.data>>();
    for (const attachment of attachments.data ?? []) {
      const key = `${attachment.parent_type}:${attachment.parent_id}`;
      const current = attachmentsByParent.get(key) ?? [];
      current.push(attachment);
      attachmentsByParent.set(key, current);
    }
    const attachmentById = new Map<string, Attachment>(
      (attachments.data ?? []).map((attachment) => [attachment.id, mapAttachment(attachment)]),
    );
    return {
      records: (records.data ?? []).map((row) =>
        mapRecord(
          row,
          itemsByRecord.get(row.id) ?? [],
          attachmentsByParent.get(`maintenance_record:${row.id}`) ?? [],
        ),
      ),
      reminders: mappedReminders,
      bodyConditions: (body.data ?? []).map((row) =>
        mapBodyCondition(row, bodyValuesByParent.get(row.id) ?? []),
      ),
      expertiseReports: (expertise.data ?? []).map((row) =>
        mapExpertise(row, attachmentsByParent.get(`expertise_report:${row.id}`) ?? []),
      ),
      notes: (notes.data ?? []).map(mapNote),
      documents: (documents.data ?? []).map((row) =>
        mapDocument(row, attachmentsByParent.get(`vehicle_document:${row.id}`) ?? []),
      ),
      maintenanceTemplates: (maintenanceTemplates.data ?? []).map(mapMaintenanceTemplate),
      vehiclePhotos: (vehiclePhotos.data ?? []).flatMap((photo) => {
        const attachment = attachmentById.get(photo.attachment_id);
        return attachment ? [mapVehiclePhoto(photo, attachment)] : [];
      }),
    };
  }

  async reconcileVehicleData(vehicleId: string, reminders: Reminder[]) {
    const client = getSupabaseClient();
    const metadataRepair = await client.rpc('reconcile_my_attachment_metadata');
    if (metadataRepair.error) throw metadataRepair.error;
    void reconcileAttachments().catch(() => undefined);
    const reconciledReminders = await Promise.all(
      reminders.map(async (reminder) => {
        const sync = await reconcileReminderNotification(reminder, { requestPermission: false });
        if (
          sync.status === reminder.notificationStatus &&
          sync.notificationId === reminder.notificationId &&
          sync.errorCode === reminder.notificationErrorCode
        ) {
          return reminder;
        }
        const updated = await client
          .from('reminders')
          .update({
            notification_id: sync.notificationId,
            notification_status: sync.status,
            notification_last_attempt_at: new Date().toISOString(),
            notification_error_code: sync.errorCode,
          })
          .eq('id', reminder.id)
          .select('*')
          .maybeSingle();
        return updated.data ? mapReminder(updated.data) : reminder;
      }),
    );
    const allReminderIds = await client.from('reminders').select('id');
    if (!allReminderIds.error) {
      await cancelUnknownReminderNotifications(
        new Set((allReminderIds.data ?? []).map((item) => item.id)),
      );
    }
    const [expertise, attachments, documents] = await Promise.all([
      client
        .from('expertise_reports')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('report_date', { ascending: false }),
      client
        .from('attachments')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .in('parent_type', ['expertise_report', 'vehicle_document'])
        .order('created_at'),
      client.from('vehicle_documents').select('*').eq('vehicle_id', vehicleId).order('expiry_date'),
    ]);
    if (expertise.error) throw expertise.error;
    if (attachments.error) throw attachments.error;
    if (documents.error) throw documents.error;
    const attachmentsByParent = new Map<string, NonNullable<typeof attachments.data>>();
    for (const attachment of attachments.data ?? []) {
      const key = `${attachment.parent_type}:${attachment.parent_id}`;
      const current = attachmentsByParent.get(key) ?? [];
      current.push(attachment);
      attachmentsByParent.set(key, current);
    }
    return {
      reminders: reconciledReminders,
      expertiseReports: (expertise.data ?? []).map((row) =>
        mapExpertise(row, attachmentsByParent.get(`expertise_report:${row.id}`) ?? []),
      ),
      documents: (documents.data ?? []).map((row) =>
        mapDocument(row, attachmentsByParent.get(`vehicle_document:${row.id}`) ?? []),
      ),
    };
  }

  async saveRecord(vehicleId: string, draft: RecordDraft, id?: string, requestId?: string) {
    const client = getSupabaseClient();
    if (draft.recordType === 'maintenance') {
      if (draft.attachmentPaths) {
        if (!id) throw new AppError('Bakım kaydı kimliği oluşturulamadı.');
        const { data, error } = await client.rpc('save_maintenance_record_with_details', {
          p_request_id: requestId ?? createRequestId(),
          p_vehicle_id: vehicleId,
          p_record_id: id,
          p_category: draft.category.trim(),
          p_amount: draft.amount,
          p_record_date: draft.recordDate,
          p_kilometer: draft.kilometer,
          p_description: draft.description?.trim() || null,
          p_item_types: [...(draft.maintenanceItemTypes ?? [])],
          p_service_type: draft.serviceType ?? null,
          p_service_name: draft.serviceName?.trim() || null,
          p_parts_cost: draft.partsCost ?? null,
          p_labor_cost: draft.laborCost ?? null,
          p_invoice_number: draft.invoiceNumber?.trim() || null,
          p_attachment_paths: draft.attachmentPaths,
        });
        if (error) throw error;
        return mapRecord(required(data, 'Bakım kaydı kaydedilemedi.'));
      }
      const { data, error } = await client.rpc('save_maintenance_record_atomic', {
        p_request_id: requestId ?? createRequestId(),
        p_vehicle_id: vehicleId,
        p_record_id: id ?? null,
        p_category: draft.category.trim(),
        p_amount: draft.amount,
        p_record_date: draft.recordDate,
        p_kilometer: draft.kilometer,
        p_description: draft.description?.trim() || null,
        p_item_types: [...(draft.maintenanceItemTypes ?? [])],
      });
      if (error) throw error;
      return mapRecord(required(data, 'Bakım kaydı kaydedilemedi.'));
    }
    const { data, error } = await client.rpc('save_vehicle_record_atomic_v2', {
      p_request_id: requestId ?? createRequestId(),
      p_vehicle_id: vehicleId,
      p_record_id: id ?? null,
      p_record_type: draft.recordType,
      p_category: draft.category.trim(),
      p_amount: draft.amount,
      p_record_date: draft.recordDate,
      p_kilometer: draft.kilometer,
      p_liters: draft.recordType === 'fuel' ? draft.liters : null,
      p_price_per_liter: draft.recordType === 'fuel' ? (draft.pricePerLiter ?? null) : null,
      p_station_brand: draft.recordType === 'fuel' ? (draft.stationBrand ?? null) : null,
      p_description: draft.description?.trim() || null,
    });
    if (error) throw error;
    return mapRecord(required(data, 'Kayıt kaydedilemedi.'));
  }

  async deleteRecord(id: string) {
    const { error } = await getSupabaseClient().from('vehicle_records').delete().eq('id', id);
    if (error) throw error;
    void reconcileAttachments().catch(() => undefined);
  }

  async saveMaintenanceTemplate(draft: MaintenanceTemplateDraft, id?: string) {
    const payload = {
      owner_id: await ownerId(),
      title: draft.title.trim(),
      item_definitions: [...new Set(draft.itemDefinitions)],
    };
    const query = id
      ? getSupabaseClient().from('maintenance_templates').update(payload).eq('id', id)
      : getSupabaseClient().from('maintenance_templates').insert(payload);
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    return mapMaintenanceTemplate(required(data, 'Bakım paketi kaydedilemedi.'));
  }

  async deleteMaintenanceTemplate(id: string) {
    const { error } = await getSupabaseClient().from('maintenance_templates').delete().eq('id', id);
    if (error) throw error;
  }

  async saveReminder(vehicleId: string, draft: ReminderDraft, id?: string) {
    const dateTimeValidation = validateReminderDateTime(draft.dueDate, draft.dueTime);
    if (!dateTimeValidation.valid) {
      throw new AppError('Geçmiş bir tarih için hatırlatıcı oluşturamazsınız.', 'VALIDATION');
    }
    const client = getSupabaseClient();
    let previous: Reminder | null = null;
    if (id) {
      const result = await client.from('reminders').select('*').eq('id', id).single();
      if (result.error) throw result.error;
      previous = mapReminder(required(result.data, 'Hatırlatıcı bulunamadı.'));
    }
    const payload = {
      vehicle_id: vehicleId,
      owner_id: await ownerId(),
      title: draft.title.trim(),
      reminder_type: draft.reminderType,
      due_date: draft.dueDate,
      due_time: draft.dueDate ? (draft.dueTime ?? '09:00') : null,
      due_kilometer: draft.dueKilometer,
      notification_id: null,
      notification_status: draft.dueDate ? ('pending' as const) : ('not_required' as const),
      notification_last_attempt_at: null,
      notification_error_code: null,
      completed: previous?.completed ?? false,
      completed_at: previous?.completedAt ?? null,
    };
    const query = id
      ? client.from('reminders').update(payload).eq('id', id)
      : client.from('reminders').insert(payload);
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    const saved = mapReminder(required(data, 'Hatırlatıcı kaydedilemedi.'));
    if (draft.notificationLeadDays !== undefined) {
      await setNotificationLeadDays(saved.id, draft.notificationLeadDays);
    }
    const sync = await reconcileReminderNotification(saved, {
      requestPermission: true,
      forceReschedule: true,
      staleIds: previous?.notificationId ? [previous.notificationId] : [],
      leadDays: draft.notificationLeadDays,
    });
    const synced = await client
      .from('reminders')
      .update({
        notification_id: sync.notificationId,
        notification_status: sync.status,
        notification_last_attempt_at: new Date().toISOString(),
        notification_error_code: sync.errorCode,
      })
      .eq('id', saved.id)
      .select('*')
      .maybeSingle();
    if (synced.error) {
      await cancelReminderNotification(sync.notificationId);
      return {
        ...saved,
        notificationStatus: 'failed' as const,
        notificationErrorCode: 'NOTIFICATION_STATE_FAILED',
      };
    }
    return mapReminder(required(synced.data, 'Hatırlatıcı kaydedilemedi.'));
  }

  async setReminderCompleted(reminder: Reminder, completed: boolean) {
    const { data, error } = await getSupabaseClient()
      .from('reminders')
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        notification_id: null,
        notification_status: completed || !reminder.dueDate ? 'not_required' : 'pending',
        notification_last_attempt_at: null,
        notification_error_code: null,
      })
      .eq('id', reminder.id)
      .select('*')
      .single();
    if (error) throw error;
    const saved = mapReminder(required(data, 'Hatırlatıcı güncellenemedi.'));
    const sync = await reconcileReminderNotification(saved, {
      requestPermission: false,
      forceReschedule: true,
      staleIds: reminder.notificationId ? [reminder.notificationId] : [],
    });
    const synced = await getSupabaseClient()
      .from('reminders')
      .update({
        notification_id: sync.notificationId,
        notification_status: sync.status,
        notification_last_attempt_at: new Date().toISOString(),
        notification_error_code: sync.errorCode,
      })
      .eq('id', saved.id)
      .select('*')
      .maybeSingle();
    if (synced.error) await cancelReminderNotification(sync.notificationId);
    return synced.data
      ? mapReminder(synced.data)
      : {
          ...saved,
          notificationStatus: 'failed' as const,
          notificationErrorCode: 'NOTIFICATION_STATE_FAILED',
        };
  }

  async deleteReminder(id: string) {
    const client = getSupabaseClient();
    const result = await client.from('reminders').select('notification_id').eq('id', id).single();
    const { error } = await client.from('reminders').delete().eq('id', id);
    if (error) throw error;
    if (result.data) await cancelReminderNotification(result.data.notification_id);
    await removeNotificationPreferences([id]);
  }

  async saveBodyCondition(
    vehicle: Vehicle,
    partKey: string,
    conditions: BodyPartCondition['conditions'],
    note: string | null,
  ) {
    if (!isValidPartKey(vehicle.bodyType, partKey))
      throw new AppError('Bu parça araç gövde şemasında bulunmuyor.');
    if (!validateBodyConditions(conditions).valid)
      throw new AppError('Seçilen parça durumları birlikte kullanılamıyor.');
    const { data, error } = await getSupabaseClient().rpc('save_body_part_conditions_atomic', {
      p_vehicle_id: vehicle.id,
      p_schema_type: getBodySchemaType(vehicle.bodyType),
      p_part_key: partKey,
      p_conditions: conditions,
      p_note: note?.trim() || '',
    });
    if (error) throw error;
    return {
      ...mapBodyCondition(required(data, 'Parça durumu kaydedilemedi.')),
      conditions: normalizeBodyConditions(conditions),
    };
  }

  async saveExpertise(vehicleId: string, draft: ExpertiseDraft, id?: string) {
    if (draft.attachmentPaths) {
      if (!id) throw new AppError('Ekspertiz raporu kimliği oluşturulamadı.');
      const { data, error } = await getSupabaseClient().rpc(
        'save_expertise_report_with_attachments',
        {
          p_id: id,
          p_vehicle_id: vehicleId,
          p_report_date: draft.reportDate,
          p_company_name: draft.companyName?.trim() || null,
          p_overall_note: draft.overallNote?.trim() || null,
          p_report_number: draft.reportNumber?.trim() || null,
          p_keep_legacy_attachment: draft.keepLegacyAttachment ?? false,
          p_attachment_paths: draft.attachmentPaths,
        },
      );
      if (error) throw error;
      return mapExpertise(required(data, 'Ekspertiz raporu kaydedilemedi.'));
    }
    const { data, error } = await getSupabaseClient().rpc('save_expertise_report_consistent', {
      p_id: id ?? null,
      p_vehicle_id: vehicleId,
      p_report_date: draft.reportDate,
      p_company_name: draft.companyName?.trim() || null,
      p_overall_note: draft.overallNote?.trim() || null,
      p_report_number: draft.reportNumber?.trim() || null,
      p_attachment_path: draft.attachmentPath,
    });
    if (error) throw error;
    return mapExpertise(required(data, 'Ekspertiz raporu kaydedilemedi.'));
  }

  async deleteExpertise(id: string) {
    const { error } = await getSupabaseClient().rpc('delete_expertise_report_consistent', {
      p_id: id,
    });
    if (error) throw error;
    void reconcileAttachments().catch(() => undefined);
  }

  async saveNote(vehicleId: string, draft: NoteDraft, id?: string) {
    const payload = {
      vehicle_id: vehicleId,
      owner_id: await ownerId(),
      title: draft.title.trim(),
      content: draft.content.trim(),
    };
    const query = id
      ? getSupabaseClient().from('vehicle_notes').update(payload).eq('id', id)
      : getSupabaseClient().from('vehicle_notes').insert(payload);
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    return mapNote(required(data, 'Not kaydedilemedi.'));
  }

  async deleteNote(id: string) {
    const { error } = await getSupabaseClient().from('vehicle_notes').delete().eq('id', id);
    if (error) throw error;
  }

  async saveDocument(vehicleId: string, draft: DocumentDraft, id?: string) {
    if (draft.attachmentPaths) {
      if (!id) throw new AppError('Belge kimliği oluşturulamadı.');
      const { data, error } = await getSupabaseClient().rpc(
        'save_vehicle_document_with_attachments',
        {
          p_id: id,
          p_vehicle_id: vehicleId,
          p_document_type: draft.documentType,
          p_title: draft.title.trim(),
          p_document_number: draft.documentNumber?.trim() || null,
          p_issuer_name: draft.issuerName?.trim() || null,
          p_start_date: draft.startDate,
          p_event_date: draft.eventDate,
          p_expiry_date: draft.expiryDate,
          p_note: draft.note?.trim() || null,
          p_keep_legacy_attachment: draft.keepLegacyAttachment ?? false,
          p_attachment_paths: draft.attachmentPaths,
        },
      );
      if (error) throw error;
      return mapDocument(required(data, 'Belge kaydedilemedi.'));
    }
    const { data, error } = await getSupabaseClient().rpc('save_vehicle_document_consistent', {
      p_id: id ?? null,
      p_vehicle_id: vehicleId,
      p_document_type: draft.documentType,
      p_title: draft.title.trim(),
      p_document_number: draft.documentNumber?.trim() || null,
      p_issue_date:
        draft.documentType === 'traffic_insurance' ||
        draft.documentType === 'comprehensive_insurance'
          ? draft.startDate
          : draft.eventDate,
      p_expiry_date: draft.expiryDate,
      p_note: draft.note?.trim() || null,
      p_attachment_path: draft.attachmentPath,
    });
    if (error) throw error;
    return mapDocument(required(data, 'Belge kaydedilemedi.'));
  }

  async deleteDocument(id: string) {
    const { error } = await getSupabaseClient().rpc('delete_vehicle_document_consistent', {
      p_id: id,
    });
    if (error) throw error;
    void reconcileAttachments().catch(() => undefined);
  }

  async clearVehicleSection(
    vehicleId: string,
    section: 'records' | 'reminders' | 'body' | 'documents',
  ) {
    const client = getSupabaseClient();
    if (section === 'reminders') {
      const { data, error: listError } = await client
        .from('reminders')
        .select('id, notification_id')
        .eq('vehicle_id', vehicleId);
      if (listError) throw listError;
      const { error } = await client.from('reminders').delete().eq('vehicle_id', vehicleId);
      if (error) throw error;
      await Promise.all(
        (data ?? []).map((item) => cancelReminderNotification(item.notification_id)),
      );
      await removeNotificationPreferences((data ?? []).map((item) => item.id));
      return;
    }
    if (section === 'documents') {
      const { error } = await client.rpc('clear_vehicle_documents_consistent', {
        p_vehicle_id: vehicleId,
      });
      if (error) throw error;
      void reconcileAttachments().catch(() => undefined);
      return;
    }
    const table = {
      records: 'vehicle_records',
      body: 'body_part_conditions',
    } as const;
    const { error } = await client.from(table[section]).delete().eq('vehicle_id', vehicleId);
    if (error) throw error;
  }
}

export const appRepository = new SupabaseAppRepository();
