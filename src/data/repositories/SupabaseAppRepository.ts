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
} from '@/domain/entities';
import { AppRepository, VehicleDataBundle } from '@/domain/repositories/AppRepository';
import { getSupabaseClient } from '@/data/supabase/client';
import {
  mapBodyCondition,
  mapDocument,
  mapExpertise,
  mapMaintenanceItem,
  mapMaintenanceTemplate,
  mapNote,
  mapRecord,
  mapReminder,
  mapVehicle,
} from '@/data/mappers/databaseMappers';
import { AppError } from '@/shared/utils/errors';
import {
  cancelReminderNotification,
  cancelUnknownReminderNotifications,
  reconcileReminderNotification,
} from '@/features/reminders/notifications';
import { isValidPartKey } from '@/features/bodyCondition/schemas';
import { getBodySchemaType } from '@/features/vehicles/config/bodyTypes';
import { getVehicleTaxonomyPersistenceFields } from '@/features/vehicles/services/vehiclePersistence';
import { createRequestId } from '@/shared/utils/requestId';
import { reconcileAttachments } from '@/data/storage/attachments';
import {
  removeNotificationPreferences,
  setNotificationLeadDays,
} from '@/features/reminders/notificationPreferences';

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
    const { data, error } = await getSupabaseClient()
      .from('vehicles')
      .select('*')
      .is('archived_at', null)
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map(mapVehicle);
  }

  async saveVehicle(draft: VehicleDraft, id?: string) {
    const payload = {
      owner_id: await ownerId(),
      brand: draft.brand.trim(),
      model: draft.model.trim(),
      year: draft.year,
      plate: draft.plate?.trim().toLocaleUpperCase('tr-TR') || null,
      current_km: draft.currentKm,
      fuel_type: draft.fuelType,
      ...getVehicleTaxonomyPersistenceFields(draft),
      archived_at: null,
    };
    const query = id
      ? getSupabaseClient().from('vehicles').update(payload).eq('id', id)
      : getSupabaseClient().from('vehicles').insert(payload);
    const { data, error } = await query.select('*').single();
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

  async loadVehicleData(vehicleId: string): Promise<VehicleDataBundle> {
    const client = getSupabaseClient();
    const [records, maintenanceItems, maintenanceTemplates, reminders, body, expertise, notes, documents] = await Promise.all([
      client
        .from('vehicle_records')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('record_date', { ascending: false }),
      client.from('maintenance_items').select('*').eq('vehicle_id', vehicleId),
      client.from('maintenance_templates').select('*').order('updated_at', { ascending: false }),
      client.from('reminders').select('*').eq('vehicle_id', vehicleId).order('due_date'),
      client.from('body_part_conditions').select('*').eq('vehicle_id', vehicleId),
      client
        .from('expertise_reports')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('report_date', { ascending: false }),
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
      expertise.error ??
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
    return {
      records: (records.data ?? []).map((row) => mapRecord(row, itemsByRecord.get(row.id) ?? [])),
      reminders: mappedReminders,
      bodyConditions: (body.data ?? []).map(mapBodyCondition),
      expertiseReports: (expertise.data ?? []).map(mapExpertise),
      notes: (notes.data ?? []).map(mapNote),
      documents: (documents.data ?? []).map(mapDocument),
      maintenanceTemplates: (maintenanceTemplates.data ?? []).map(mapMaintenanceTemplate),
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
      await cancelUnknownReminderNotifications(new Set((allReminderIds.data ?? []).map((item) => item.id)));
    }
    const [expertise, documents] = await Promise.all([
      client
        .from('expertise_reports')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('report_date', { ascending: false }),
      client.from('vehicle_documents').select('*').eq('vehicle_id', vehicleId).order('expiry_date'),
    ]);
    if (expertise.error) throw expertise.error;
    if (documents.error) throw documents.error;
    return {
      reminders: reconciledReminders,
      expertiseReports: (expertise.data ?? []).map(mapExpertise),
      documents: (documents.data ?? []).map(mapDocument),
    };
  }

  async saveRecord(vehicleId: string, draft: RecordDraft, id?: string, requestId?: string) {
    const client = getSupabaseClient();
    if (draft.recordType === 'maintenance') {
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
    const { data, error } = await client.rpc('save_vehicle_record_atomic', {
      p_request_id: requestId ?? createRequestId(),
      p_vehicle_id: vehicleId,
      p_record_id: id ?? null,
      p_record_type: draft.recordType,
      p_category: draft.category.trim(),
      p_amount: draft.amount,
      p_record_date: draft.recordDate,
      p_kilometer: draft.kilometer,
      p_liters: draft.recordType === 'fuel' ? draft.liters : null,
      p_description: draft.description?.trim() || null,
    });
    if (error) throw error;
    return mapRecord(required(data, 'Kayıt kaydedilemedi.'));
  }

  async deleteRecord(id: string) {
    const { error } = await getSupabaseClient().from('vehicle_records').delete().eq('id', id);
    if (error) throw error;
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
    const { error } = await getSupabaseClient()
      .from('maintenance_templates')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async saveReminder(vehicleId: string, draft: ReminderDraft, id?: string) {
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
    condition: BodyPartCondition['condition'],
    note: string | null,
  ) {
    if (!isValidPartKey(vehicle.bodyType, partKey))
      throw new AppError('Bu parça araç gövde şemasında bulunmuyor.');
    const { data, error } = await getSupabaseClient()
      .from('body_part_conditions')
      .upsert(
        {
          vehicle_id: vehicle.id,
          owner_id: await ownerId(),
          schema_type: getBodySchemaType(vehicle.bodyType),
          part_key: partKey,
          condition,
          note: note?.trim() || null,
        },
        { onConflict: 'vehicle_id,schema_type,part_key' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return mapBodyCondition(required(data, 'Parça durumu kaydedilemedi.'));
  }

  async saveExpertise(vehicleId: string, draft: ExpertiseDraft, id?: string) {
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
    const { data, error } = await getSupabaseClient().rpc('save_vehicle_document_consistent', {
      p_id: id ?? null,
      p_vehicle_id: vehicleId,
      p_document_type: draft.documentType,
      p_title: draft.title.trim(),
      p_document_number: draft.documentNumber?.trim() || null,
      p_issue_date: draft.issueDate,
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
      await Promise.all((data ?? []).map((item) => cancelReminderNotification(item.notification_id)));
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
