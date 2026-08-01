import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function parseEnvFile(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [
          line.slice(0, index).trim(),
          line
            .slice(index + 1)
            .trim()
            .replace(/^(['"])(.*)\1$/, '$2'),
        ];
      }),
  );
}

if (process.env.QA_REMOTE_CONFIRM !== 'ARACIM_CEPTE_REMOTE_QA') {
  throw new Error('QA_REMOTE_CONFIRM must exactly equal ARACIM_CEPTE_REMOTE_QA.');
}
if (!process.env.QA_TEST_EMAIL || !process.env.QA_TEST_PASSWORD) {
  throw new Error('Dedicated QA_TEST_EMAIL and QA_TEST_PASSWORD are required.');
}

const root = resolve(import.meta.dirname, '..');
const env = parseEnvFile(await readFile(resolve(root, '.env'), 'utf8'));
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error('Supabase public environment is missing.');

const client = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const result = {};
let vehicleId = null;
let attachmentPath = null;

async function completeChildCrud(table, id, update) {
  const read = await client.from(table).select('id').eq('id', id).single();
  const changed = await client.from(table).update(update).eq('id', id).select('id').single();
  const removed = await client.from(table).delete().eq('id', id);
  return !read.error && !changed.error && !removed.error;
}

try {
  const signIn = await client.auth.signInWithPassword({
    email: process.env.QA_TEST_EMAIL.trim().toLowerCase(),
    password: process.env.QA_TEST_PASSWORD,
  });
  if (signIn.error || !signIn.data.user) throw new Error('Dedicated QA user sign-in failed.');
  const userId = signIn.data.user.id;
  result.login = true;
  result.sessionRestoration = Boolean((await client.auth.getSession()).data.session);
  result.profileRead = !(await client.from('profiles').select('id').eq('id', userId).single())
    .error;

  const vehicle = await client
    .from('vehicles')
    .insert({
      owner_id: userId,
      brand: 'Kia',
      model: 'Sportage [REMOTE QA]',
      year: 2018,
      plate: '34 RQA 01',
      current_km: 50_000,
      fuel_type: 'diesel',
      body_type: 'suv_crossover',
      color: 'Beyaz',
    })
    .select('id')
    .single();
  if (vehicle.error || !vehicle.data) throw new Error('Remote QA vehicle insert failed.');
  vehicleId = vehicle.data.id;
  const vehicleUpdate = await client
    .from('vehicles')
    .update({ current_km: 50_100 })
    .eq('id', vehicleId)
    .select('id')
    .single();
  result.vehicleCrud = !vehicleUpdate.error;

  const record = await client
    .from('vehicle_records')
    .insert({
      owner_id: userId,
      vehicle_id: vehicleId,
      record_type: 'fuel',
      category: 'Yakıt [REMOTE QA]',
      amount: 100.5,
      record_date: '2026-07-15',
      kilometer: 50_100,
      liters: 2.5,
      description: 'Geçici entegrasyon kaydı',
    })
    .select('id')
    .single();
  if (record.error || !record.data) throw new Error('Remote QA record insert failed.');
  const recordUpdate = await client
    .from('vehicle_records')
    .update({ amount: 101.25 })
    .eq('id', record.data.id)
    .select('amount')
    .single();
  const recordDelete = await client.from('vehicle_records').delete().eq('id', record.data.id);
  result.recordCrud = !recordUpdate.error && !recordDelete.error;

  const inserts = [
    client
      .from('reminders')
      .insert({
        owner_id: userId,
        vehicle_id: vehicleId,
        title: 'Hatırlatıcı [REMOTE QA]',
        reminder_type: 'custom',
        due_date: '2026-08-15',
        completed: false,
      })
      .select('id')
      .single(),
    client
      .from('body_part_conditions')
      .insert({
        owner_id: userId,
        vehicle_id: vehicleId,
        schema_type: 'suv_crossover',
        part_key: 'hood',
        condition: 'original',
        note: 'REMOTE QA',
      })
      .select('id')
      .single(),
    client
      .from('expertise_reports')
      .insert({
        owner_id: userId,
        vehicle_id: vehicleId,
        report_date: '2026-07-15',
        company_name: 'REMOTE QA',
      })
      .select('id')
      .single(),
    client
      .from('vehicle_notes')
      .insert({
        owner_id: userId,
        vehicle_id: vehicleId,
        title: 'Not [REMOTE QA]',
        content: 'Geçici entegrasyon notu',
      })
      .select('id')
      .single(),
    client
      .from('vehicle_documents')
      .insert({
        owner_id: userId,
        vehicle_id: vehicleId,
        document_type: 'custom',
        title: 'Belge [REMOTE QA]',
      })
      .select('id')
      .single(),
  ];
  const [reminder, body, expertise, note, document] = await Promise.all(inserts);
  if (reminder.error || body.error || expertise.error || note.error || document.error) {
    throw new Error('One or more child CRUD inserts failed.');
  }
  result.reminderCrud = await completeChildCrud('reminders', reminder.data.id, {
    title: 'Hatırlatıcı güncel [REMOTE QA]',
  });
  result.bodyConditionCrud = await completeChildCrud('body_part_conditions', body.data.id, {
    condition: 'painted',
  });
  result.expertiseCrud = await completeChildCrud('expertise_reports', expertise.data.id, {
    overall_note: 'Güncellendi [REMOTE QA]',
  });
  result.noteCrud = await completeChildCrud('vehicle_notes', note.data.id, {
    content: 'Güncellendi [REMOTE QA]',
  });
  result.documentCrud = await completeChildCrud('vehicle_documents', document.data.id, {
    note: 'Güncellendi [REMOTE QA]',
  });

  attachmentPath = `${userId}/${vehicleId}/${randomUUID()}.png`;
  const onePixelPng = Uint8Array.from(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  const upload = await client.storage
    .from('vehicle-attachments')
    .upload(attachmentPath, onePixelPng, {
      contentType: 'image/png',
      upsert: false,
    });
  if (upload.error) throw new Error('Remote QA attachment upload failed.');
  const signed = await client.storage
    .from('vehicle-attachments')
    .createSignedUrl(attachmentPath, 1);
  const signedFetch = signed.data?.signedUrl
    ? await fetch(signed.data.signedUrl, { redirect: 'manual' })
    : null;
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 2100));
  const expiredFetch = signed.data?.signedUrl
    ? await fetch(signed.data.signedUrl, { redirect: 'manual' })
    : null;
  const publicFetch = await fetch(
    `${url}/storage/v1/object/public/vehicle-attachments/${attachmentPath}`,
    { redirect: 'manual' },
  );
  result.attachmentUpload = true;
  result.signedUrlImmediateAccess = Boolean(signedFetch?.ok);
  result.signedUrlExpires = Boolean(expiredFetch && !expiredFetch.ok);
  result.privateBucketRejectsPublic = !publicFetch.ok;
  const attachmentDelete = await client.storage
    .from('vehicle-attachments')
    .remove([attachmentPath]);
  result.attachmentDelete = !attachmentDelete.error;
  attachmentPath = null;

  const vehicleDelete = await client.from('vehicles').delete().eq('id', vehicleId);
  if (vehicleDelete.error) throw new Error('Remote QA cleanup failed.');
  vehicleId = null;
  result.cascadeCleanup = true;

  if (process.env.QA_SEND_RESET === 'true') {
    const reset = await client.auth.resetPasswordForEmail(process.env.QA_TEST_EMAIL, {
      redirectTo: 'http://localhost:8082/auth/reset-password',
    });
    result.passwordResetRequest = !reset.error;
  } else {
    result.passwordResetRequest = 'manual-opt-in';
  }

  const logout = await client.auth.signOut({ scope: 'local' });
  result.logout = !logout.error && !(await client.auth.getSession()).data.session;
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (attachmentPath) await client.storage.from('vehicle-attachments').remove([attachmentPath]);
  if (vehicleId) await client.from('vehicles').delete().eq('id', vehicleId);
  await client.auth.signOut({ scope: 'local' });
}
