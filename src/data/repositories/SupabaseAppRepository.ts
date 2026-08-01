import {
  BodyPartCondition,
  DocumentDraft,
  ExpertiseDraft,
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
  mapNote,
  mapRecord,
  mapReminder,
  mapVehicle,
} from '@/data/mappers/databaseMappers';
import { AppError } from '@/shared/utils/errors';
import {
  cancelReminderNotification,
  scheduleReminderNotification,
} from '@/features/reminders/notifications';
import { isValidPartKey } from '@/features/bodyCondition/schemas';
import { nextVehicleMileage } from '@/shared/utils/repositoryRules';

async function ownerId(): Promise<string> {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error || !data.user)
    throw new AppError('Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.', 'AUTH');
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
      body_type: draft.bodyType,
      color: draft.color?.trim() || null,
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
    const [documents, expertise, reminders] = await Promise.all([
      client.from('vehicle_documents').select('attachment_path').eq('vehicle_id', id),
      client.from('expertise_reports').select('attachment_path').eq('vehicle_id', id),
      client.from('reminders').select('notification_id').eq('vehicle_id', id),
    ]);
    const lookupError = documents.error ?? expertise.error ?? reminders.error;
    if (lookupError) throw lookupError;
    const attachmentPaths = [...(documents.data ?? []), ...(expertise.data ?? [])]
      .map((item) => item.attachment_path)
      .filter((path): path is string => Boolean(path));
    if (attachmentPaths.length) {
      const { error: storageError } = await client.storage
        .from('vehicle-attachments')
        .remove(attachmentPaths);
      if (storageError) throw storageError;
    }
    await Promise.all(
      (reminders.data ?? []).map((item) => cancelReminderNotification(item.notification_id)),
    );
    const { error } = await client.from('vehicles').delete().eq('id', id);
    if (error) throw error;
  }

  async loadVehicleData(vehicleId: string): Promise<VehicleDataBundle> {
    const client = getSupabaseClient();
    const [records, reminders, body, expertise, notes, documents] = await Promise.all([
      client
        .from('vehicle_records')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('record_date', { ascending: false }),
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
      reminders.error ??
      body.error ??
      expertise.error ??
      notes.error ??
      documents.error;
    if (error) throw error;
    return {
      records: (records.data ?? []).map(mapRecord),
      reminders: (reminders.data ?? []).map(mapReminder),
      bodyConditions: (body.data ?? []).map(mapBodyCondition),
      expertiseReports: (expertise.data ?? []).map(mapExpertise),
      notes: (notes.data ?? []).map(mapNote),
      documents: (documents.data ?? []).map(mapDocument),
    };
  }

  async saveRecord(vehicleId: string, draft: RecordDraft, id?: string) {
    const userId = await ownerId();
    const payload = {
      vehicle_id: vehicleId,
      owner_id: userId,
      record_type: draft.recordType,
      category: draft.category.trim(),
      amount: draft.amount,
      record_date: draft.recordDate,
      kilometer: draft.kilometer,
      liters: draft.recordType === 'fuel' ? draft.liters : null,
      description: draft.description?.trim() || null,
    };
    const client = getSupabaseClient();
    const query = id
      ? client.from('vehicle_records').update(payload).eq('id', id)
      : client.from('vehicle_records').insert(payload);
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    const saved = mapRecord(required(data, 'Kayıt kaydedilemedi.'));
    if (saved.kilometer !== null) {
      const { data: vehicle } = await client
        .from('vehicles')
        .select('current_km')
        .eq('id', vehicleId)
        .single();
      const nextMileage = vehicle
        ? nextVehicleMileage(vehicle.current_km, saved.kilometer)
        : saved.kilometer;
      if (vehicle && nextMileage > vehicle.current_km) {
        const { error: mileageError } = await client
          .from('vehicles')
          .update({ current_km: nextMileage })
          .eq('id', vehicleId);
        if (mileageError) throw mileageError;
      }
    }
    return saved;
  }

  async deleteRecord(id: string) {
    const { error } = await getSupabaseClient().from('vehicle_records').delete().eq('id', id);
    if (error) throw error;
  }

  async saveReminder(vehicleId: string, draft: ReminderDraft, id?: string) {
    const client = getSupabaseClient();
    let previous: Reminder | null = null;
    if (id) {
      const result = await client.from('reminders').select('*').eq('id', id).single();
      if (result.error) throw result.error;
      previous = mapReminder(required(result.data, 'Hatırlatıcı bulunamadı.'));
      await cancelReminderNotification(previous.notificationId);
    }
    const notificationId = await scheduleReminderNotification(draft.title, draft.dueDate);
    const payload = {
      vehicle_id: vehicleId,
      owner_id: await ownerId(),
      title: draft.title.trim(),
      reminder_type: draft.reminderType,
      due_date: draft.dueDate,
      due_kilometer: draft.dueKilometer,
      notification_id: notificationId,
      completed: previous?.completed ?? false,
      completed_at: previous?.completedAt ?? null,
    };
    const query = id
      ? client.from('reminders').update(payload).eq('id', id)
      : client.from('reminders').insert(payload);
    const { data, error } = await query.select('*').single();
    if (error) {
      await cancelReminderNotification(notificationId);
      throw error;
    }
    return mapReminder(required(data, 'Hatırlatıcı kaydedilemedi.'));
  }

  async setReminderCompleted(reminder: Reminder, completed: boolean) {
    if (completed) await cancelReminderNotification(reminder.notificationId);
    const notificationId = completed
      ? null
      : await scheduleReminderNotification(reminder.title, reminder.dueDate);
    const { data, error } = await getSupabaseClient()
      .from('reminders')
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        notification_id: notificationId,
      })
      .eq('id', reminder.id)
      .select('*')
      .single();
    if (error) throw error;
    return mapReminder(required(data, 'Hatırlatıcı güncellenemedi.'));
  }

  async deleteReminder(id: string) {
    const client = getSupabaseClient();
    const result = await client.from('reminders').select('notification_id').eq('id', id).single();
    if (result.data) await cancelReminderNotification(result.data.notification_id);
    const { error } = await client.from('reminders').delete().eq('id', id);
    if (error) throw error;
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
          schema_type: vehicle.bodyType,
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
    const payload = {
      vehicle_id: vehicleId,
      owner_id: await ownerId(),
      report_date: draft.reportDate,
      company_name: draft.companyName?.trim() || null,
      overall_note: draft.overallNote?.trim() || null,
      report_number: draft.reportNumber?.trim() || null,
      attachment_path: draft.attachmentPath,
    };
    const query = id
      ? getSupabaseClient().from('expertise_reports').update(payload).eq('id', id)
      : getSupabaseClient().from('expertise_reports').insert(payload);
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    return mapExpertise(required(data, 'Ekspertiz raporu kaydedilemedi.'));
  }

  async deleteExpertise(id: string) {
    const client = getSupabaseClient();
    const { data, error: lookupError } = await client
      .from('expertise_reports')
      .select('attachment_path')
      .eq('id', id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (data?.attachment_path) {
      const { error: storageError } = await client.storage
        .from('vehicle-attachments')
        .remove([data.attachment_path]);
      if (storageError) throw storageError;
    }
    const { error } = await client.from('expertise_reports').delete().eq('id', id);
    if (error) throw error;
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
    const payload = {
      vehicle_id: vehicleId,
      owner_id: await ownerId(),
      document_type: draft.documentType,
      title: draft.title.trim(),
      document_number: draft.documentNumber?.trim() || null,
      issue_date: draft.issueDate,
      expiry_date: draft.expiryDate,
      note: draft.note?.trim() || null,
      attachment_path: draft.attachmentPath,
    };
    const query = id
      ? getSupabaseClient().from('vehicle_documents').update(payload).eq('id', id)
      : getSupabaseClient().from('vehicle_documents').insert(payload);
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    return mapDocument(required(data, 'Belge kaydedilemedi.'));
  }

  async deleteDocument(id: string) {
    const client = getSupabaseClient();
    const { data, error: lookupError } = await client
      .from('vehicle_documents')
      .select('attachment_path')
      .eq('id', id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (data?.attachment_path) {
      const { error: storageError } = await client.storage
        .from('vehicle-attachments')
        .remove([data.attachment_path]);
      if (storageError) throw storageError;
    }
    const { error } = await client.from('vehicle_documents').delete().eq('id', id);
    if (error) throw error;
  }

  async clearVehicleSection(
    vehicleId: string,
    section: 'records' | 'reminders' | 'body' | 'documents',
  ) {
    const client = getSupabaseClient();
    if (section === 'reminders') {
      const { data, error: listError } = await client
        .from('reminders')
        .select('notification_id')
        .eq('vehicle_id', vehicleId);
      if (listError) throw listError;
      await Promise.all(
        (data ?? []).map((item) => cancelReminderNotification(item.notification_id)),
      );
    }
    if (section === 'documents') {
      const { data, error: listError } = await client
        .from('vehicle_documents')
        .select('attachment_path')
        .eq('vehicle_id', vehicleId);
      if (listError) throw listError;
      const paths = (data ?? [])
        .map((item) => item.attachment_path)
        .filter((path): path is string => Boolean(path));
      if (paths.length) {
        const { error: storageError } = await client.storage
          .from('vehicle-attachments')
          .remove(paths);
        if (storageError) throw storageError;
      }
    }
    const table = {
      records: 'vehicle_records',
      reminders: 'reminders',
      body: 'body_part_conditions',
      documents: 'vehicle_documents',
    } as const;
    const { error } = await client.from(table[section]).delete().eq('vehicle_id', vehicleId);
    if (error) throw error;
  }
}

export const appRepository = new SupabaseAppRepository();
