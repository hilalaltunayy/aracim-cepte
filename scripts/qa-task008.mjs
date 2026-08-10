import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const projectRef = 'eiqxvvnqkbzbhzpthcwo';
const bucketName = 'vehicle-attachments';
const root = resolve(import.meta.dirname, '..');
const supabaseCli = resolve(root, 'node_modules', 'supabase', 'dist', 'supabase.js');

function parseEnv(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, '$2')];
      }),
  );
}

class QaFailure extends Error {}

function assert(results, name, condition) {
  results[name] = Boolean(condition);
  if (!condition) throw new QaFailure(`${name} failed`);
}

function sqlLiteral(value) {
  if (!/^[0-9a-z@._/%-]+$/i.test(value)) throw new QaFailure('unsafe synthetic SQL literal');
  return `'${value}'`;
}

function runLinkedSql(sql) {
  const output = execFileSync(process.execPath, [supabaseCli, 'db', 'query', '--linked', sql], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(output).rows ?? [];
}

async function signIn(client, email, password) {
  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session) throw new QaFailure('synthetic sign-in failed');
  return result.data.session;
}

async function upload({ url, anonKey, token, vehicleId, bytes, mimeType, requestId }) {
  const response = await fetch(`${url}/functions/v1/upload-attachment`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
      'content-type': mimeType,
      'x-file-size': String(bytes.byteLength),
      'x-vehicle-id': vehicleId,
      'x-upload-request-id': requestId,
    },
    body: bytes,
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, path: body.path ?? null, code: body.code ?? null };
}

async function reconcile({ url, anonKey, token }) {
  const response = await fetch(`${url}/functions/v1/reconcile-attachments`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: '{}',
  });
  return { ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) };
}

async function listOwnerPaths(client, ownerId) {
  const paths = [];
  async function visit(prefix) {
    let offset = 0;
    while (true) {
      const result = await client.storage.from(bucketName).list(prefix, { limit: 100, offset });
      if (result.error) throw new QaFailure('storage list failed');
      for (const item of result.data ?? []) {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id) paths.push(path);
        else await visit(path);
      }
      if (!result.data || result.data.length < 100) break;
      offset += result.data.length;
    }
  }
  await visit(ownerId);
  return paths;
}

async function removeOwnerPaths(client, ownerId) {
  const paths = await listOwnerPaths(client, ownerId);
  for (let index = 0; index < paths.length; index += 100) {
    const removed = await client.storage.from(bucketName).remove(paths.slice(index, index + 100));
    if (removed.error) throw new QaFailure('storage cleanup failed');
  }
}

if (process.env.QA_REMOTE_CONFIRM !== 'ARACIM_CEPTE_REMOTE_QA') {
  throw new Error('QA_REMOTE_CONFIRM must exactly equal ARACIM_CEPTE_REMOTE_QA.');
}
if (process.env.QA_EXPECTED_PROJECT_REF !== projectRef) {
  throw new Error(`QA_EXPECTED_PROJECT_REF must exactly equal ${projectRef}.`);
}

const env = parseEnv(await readFile(resolve(root, '.env'), 'utf8'));
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey || new URL(url).hostname.split('.')[0] !== projectRef) {
  throw new Error('Approved Supabase public configuration is missing or mismatched.');
}

const clientA = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const clientB = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const results = {};
const cleanup = { userA: false, userB: false, storageEmpty: false };
let userAId = randomUUID();
let userBId = randomUUID();
let failure = null;
const runId = randomUUID();
const emailA = `qa-task008-a-${runId}@example.com`;
const emailB = `qa-task008-b-${runId}@example.com`;
const passwordA = `Qa8A${randomUUID().replaceAll('-', '')}`;
const passwordB = `Qa8B${randomUUID().replaceAll('-', '')}`;
const pdf = new TextEncoder().encode('%PDF-1.4\n% TASK-008 synthetic\n%%EOF');

try {
  runLinkedSql(`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values
      (
        '00000000-0000-0000-0000-000000000000', ${sqlLiteral(userAId)}::uuid,
        'authenticated', 'authenticated', ${sqlLiteral(emailA)},
        extensions.crypt(${sqlLiteral(passwordA)}, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        now(), now(), '', '', '', ''
      ),
      (
        '00000000-0000-0000-0000-000000000000', ${sqlLiteral(userBId)}::uuid,
        'authenticated', 'authenticated', ${sqlLiteral(emailB)},
        extensions.crypt(${sqlLiteral(passwordB)}, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        now(), now(), '', '', '', ''
      );

    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values
      (
        ${sqlLiteral(userAId)}, ${sqlLiteral(userAId)}::uuid,
        jsonb_build_object('sub', ${sqlLiteral(userAId)}, 'email', ${sqlLiteral(emailA)}),
        'email', now(), now(), now()
      ),
      (
        ${sqlLiteral(userBId)}, ${sqlLiteral(userBId)}::uuid,
        jsonb_build_object('sub', ${sqlLiteral(userBId)}, 'email', ${sqlLiteral(emailB)}),
        'email', now(), now(), now()
      );
  `);
  const createdRows = runLinkedSql(`
    select count(*)::integer as count from auth.users
    where id in (${sqlLiteral(userAId)}::uuid, ${sqlLiteral(userBId)}::uuid)
      and email in (${sqlLiteral(emailA)}, ${sqlLiteral(emailB)});
  `);
  assert(results, 'syntheticUsersCreated', createdRows[0]?.count === 2);

  const sessionA = await signIn(clientA, emailA, passwordA);
  await signIn(clientB, emailB, passwordB);

  const vehicleResult = await clientA
    .from('vehicles')
    .insert({
      owner_id: userAId,
      brand: 'QA',
      model: 'TASK-008',
      current_km: 1000,
      fuel_type: 'gasoline',
      body_type: 'sedan_hatchback',
    })
    .select('id')
    .single();
  if (vehicleResult.error || !vehicleResult.data) throw new QaFailure('vehicle setup failed');
  const vehicleId = vehicleResult.data.id;

  const recordRequestId = randomUUID();
  const recordArgs = {
    p_request_id: recordRequestId,
    p_vehicle_id: vehicleId,
    p_record_id: null,
    p_record_type: 'fuel',
    p_category: 'Yakıt alımı',
    p_amount: 100,
    p_record_date: '2026-08-01',
    p_kilometer: 1100,
    p_liters: 5,
    p_description: 'TASK-008 sentetik',
  };
  const recordFirst = await clientA.rpc('save_vehicle_record_atomic', recordArgs);
  const vehicleAfter = await clientA.from('vehicles').select('current_km').eq('id', vehicleId).single();
  assert(results, 'd11AtomicRecordAndMileage', !recordFirst.error && vehicleAfter.data?.current_km === 1100);

  const recordRetry = await clientA.rpc('save_vehicle_record_atomic', recordArgs);
  const recordCount = await clientA.from('vehicle_records').select('id', { count: 'exact' }).eq('vehicle_id', vehicleId);
  assert(results, 'd11IdempotentRetry', !recordRetry.error && recordRetry.data?.id === recordFirst.data?.id && recordCount.count === 1);

  const lower = await clientA.rpc('save_vehicle_record_atomic', {
    ...recordArgs,
    p_request_id: randomUUID(),
    p_kilometer: 900,
  });
  const countAfterLower = await clientA.from('vehicle_records').select('id', { count: 'exact' }).eq('vehicle_id', vehicleId);
  const vehicleAfterLower = await clientA.from('vehicles').select('current_km').eq('id', vehicleId).single();
  assert(
    results,
    'd11HistoricalMileageAcceptedWithoutCurrentRegression',
    !lower.error && countAfterLower.count === 2 && vehicleAfterLower.data?.current_km === 1100,
  );

  const crossUser = await clientB.rpc('save_vehicle_record_atomic', {
    ...recordArgs,
    p_request_id: randomUUID(),
    p_kilometer: 1200,
  });
  assert(results, 'd11CrossUserDenied', Boolean(crossUser.error));

  const uploadRequestId = randomUUID();
  const firstUpload = await upload({ url, anonKey, token: sessionA.access_token, vehicleId, bytes: pdf, mimeType: 'application/pdf', requestId: uploadRequestId });
  const retryUpload = await upload({ url, anonKey, token: sessionA.access_token, vehicleId, bytes: pdf, mimeType: 'application/pdf', requestId: uploadRequestId });
  assert(results, 'd13IdempotentUpload', firstUpload.ok && retryUpload.ok && firstUpload.path === retryUpload.path);

  const userBRead = await clientB.storage.from(bucketName).download(firstUpload.path);
  assert(results, 'd13CrossUserStorageDenied', Boolean(userBRead.error));

  const invalidMetadata = await clientA.rpc('save_vehicle_document_consistent', {
    p_id: null,
    p_vehicle_id: vehicleId,
    p_document_type: 'custom',
    p_title: null,
    p_document_number: null,
    p_issue_date: null,
    p_expiry_date: null,
    p_note: null,
    p_attachment_path: firstUpload.path,
  });
  assert(results, 'd13StorageSuccessMetadataFailure', Boolean(invalidMetadata.error));
  const cleanupRequest = await clientA.rpc('request_attachment_cleanup', {
    p_object_path: firstUpload.path,
  });
  const cleanupAfterMetadataFailure = await reconcile({ url, anonKey, token: sessionA.access_token });
  const cleanedFailedObject = await clientA.storage.from(bucketName).download(firstUpload.path);
  results.d13MetadataFailureCleanupDiagnostic = {
    cleanupQueued: !cleanupRequest.error && cleanupRequest.data === true,
    reconciliationStatus: cleanupAfterMetadataFailure.status,
    reconciliationCode: cleanupAfterMetadataFailure.body?.code ?? null,
    objectUnavailable: Boolean(cleanedFailedObject.error),
  };
  assert(results, 'd13MetadataFailureCleanup', cleanupAfterMetadataFailure.ok && Boolean(cleanedFailedObject.error));

  const missingUpload = await upload({ url, anonKey, token: sessionA.access_token, vehicleId, bytes: pdf, mimeType: 'application/pdf', requestId: randomUUID() });
  if (!missingUpload.ok) throw new QaFailure('missing object setup upload failed');
  const missingDocument = await clientA.rpc('save_vehicle_document_consistent', {
    p_id: null,
    p_vehicle_id: vehicleId,
    p_document_type: 'custom',
    p_title: 'TASK-008 missing object',
    p_document_number: null,
    p_issue_date: null,
    p_expiry_date: null,
    p_note: null,
    p_attachment_path: missingUpload.path,
  });
  if (missingDocument.error || !missingDocument.data) throw new QaFailure('missing metadata setup failed');
  await clientA.storage.from(bucketName).remove([missingUpload.path]);
  const metadataRepair = await clientA.rpc('reconcile_my_attachment_metadata');
  const repairedDocument = await clientA.from('vehicle_documents').select('attachment_path').eq('id', missingDocument.data.id).single();
  assert(results, 'd13MissingObjectNotShownAsValid', !metadataRepair.error && repairedDocument.data?.attachment_path === null);

  const deleteUpload = await upload({ url, anonKey, token: sessionA.access_token, vehicleId, bytes: pdf, mimeType: 'application/pdf', requestId: randomUUID() });
  const deleteDocument = await clientA.rpc('save_vehicle_document_consistent', {
    p_id: null,
    p_vehicle_id: vehicleId,
    p_document_type: 'custom',
    p_title: 'TASK-008 delete',
    p_document_number: null,
    p_issue_date: null,
    p_expiry_date: null,
    p_note: null,
    p_attachment_path: deleteUpload.path,
  });
  if (deleteDocument.error || !deleteDocument.data) throw new QaFailure('delete setup failed');
  const firstDelete = await clientA.rpc('delete_vehicle_document_consistent', { p_id: deleteDocument.data.id });
  const secondDelete = await clientA.rpc('delete_vehicle_document_consistent', { p_id: deleteDocument.data.id });
  await reconcile({ url, anonKey, token: sessionA.access_token });
  const deletedObject = await clientA.storage.from(bucketName).download(deleteUpload.path);
  assert(results, 'd13IdempotentDeleteAndStorageCleanup', firstDelete.data === true && secondDelete.data === false && Boolean(deletedObject.error));

  const interruptedRequestId = randomUUID();
  const interruptedRows = runLinkedSql(`
    select * from public.reserve_attachment_upload(
      ${sqlLiteral(userAId)}::uuid, ${sqlLiteral(vehicleId)}::uuid,
      ${pdf.byteLength}::bigint, 'application/pdf', ${sqlLiteral(interruptedRequestId)}::uuid
    );
  `);
  const interruptedId = interruptedRows[0]?.reservation_id;
  if (!interruptedId) throw new QaFailure('interrupted setup failed');
  runLinkedSql(`
    update public.attachment_upload_reservations
    set expires_at = now() - interval '1 minute'
    where id = ${sqlLiteral(interruptedId)}::uuid and owner_id = ${sqlLiteral(userAId)}::uuid;
    select * from public.reserve_attachment_upload(
      ${sqlLiteral(userAId)}::uuid, ${sqlLiteral(vehicleId)}::uuid,
      ${pdf.byteLength}::bigint, 'application/pdf', ${sqlLiteral(randomUUID())}::uuid
    );
  `);
  const interruptedState = runLinkedSql(`
    select status from public.attachment_upload_reservations
    where id = ${sqlLiteral(interruptedId)}::uuid and owner_id = ${sqlLiteral(userAId)}::uuid;
  `);
  assert(results, 'd13InterruptedReservationReleased', interruptedState[0]?.status === 'failed');

  const orphanUpload = await upload({ url, anonKey, token: sessionA.access_token, vehicleId, bytes: pdf, mimeType: 'application/pdf', requestId: randomUUID() });
  if (!orphanUpload.ok) throw new QaFailure('orphan setup failed');
  runLinkedSql(`
    update public.attachment_upload_reservations
    set updated_at = now() - interval '11 minutes'
    where owner_id = ${sqlLiteral(userAId)}::uuid and object_path = ${sqlLiteral(orphanUpload.path)};
  `);
  const orphanRecovery = await reconcile({ url, anonKey, token: sessionA.access_token });
  const orphanRead = await clientA.storage.from(bucketName).download(orphanUpload.path);
  assert(results, 'd13OrphanReconciliation', orphanRecovery.ok && Boolean(orphanRead.error));

  const clearUpload = await upload({ url, anonKey, token: sessionA.access_token, vehicleId, bytes: pdf, mimeType: 'application/pdf', requestId: randomUUID() });
  if (!clearUpload.ok) throw new QaFailure('bulk document cleanup upload failed');
  const clearDocument = await clientA.rpc('save_vehicle_document_consistent', {
    p_id: null,
    p_vehicle_id: vehicleId,
    p_document_type: 'custom',
    p_title: 'TASK-008 bulk clear',
    p_document_number: null,
    p_issue_date: null,
    p_expiry_date: null,
    p_note: null,
    p_attachment_path: clearUpload.path,
  });
  if (clearDocument.error || !clearDocument.data) throw new QaFailure('bulk document cleanup metadata failed');
  const clearedDocuments = await clientA.rpc('clear_vehicle_documents_consistent', { p_vehicle_id: vehicleId });
  const clearRecovery = await reconcile({ url, anonKey, token: sessionA.access_token });
  const clearedObject = await clientA.storage.from(bucketName).download(clearUpload.path);
  const remainingDocuments = await clientA.from('vehicle_documents').select('id', { count: 'exact' }).eq('vehicle_id', vehicleId);
  assert(
    results,
    'd13BulkDocumentClearAndStorageCleanup',
    !clearedDocuments.error && clearedDocuments.data >= 1 && clearRecovery.ok && Boolean(clearedObject.error) && remainingDocuments.count === 0,
  );

  const deleteVehicleResult = await clientA
    .from('vehicles')
    .insert({
      owner_id: userAId,
      brand: 'QA',
      model: 'TASK-008-DELETE',
      current_km: 2000,
      fuel_type: 'gasoline',
      body_type: 'sedan_hatchback',
    })
    .select('id')
    .single();
  if (deleteVehicleResult.error || !deleteVehicleResult.data) throw new QaFailure('vehicle cascade cleanup setup failed');
  const deleteVehicleId = deleteVehicleResult.data.id;
  const vehicleUpload = await upload({ url, anonKey, token: sessionA.access_token, vehicleId: deleteVehicleId, bytes: pdf, mimeType: 'application/pdf', requestId: randomUUID() });
  if (!vehicleUpload.ok) throw new QaFailure('vehicle cascade cleanup upload failed');
  const vehicleDocument = await clientA.rpc('save_vehicle_document_consistent', {
    p_id: null,
    p_vehicle_id: deleteVehicleId,
    p_document_type: 'custom',
    p_title: 'TASK-008 vehicle delete',
    p_document_number: null,
    p_issue_date: null,
    p_expiry_date: null,
    p_note: null,
    p_attachment_path: vehicleUpload.path,
  });
  if (vehicleDocument.error || !vehicleDocument.data) throw new QaFailure('vehicle cascade cleanup metadata failed');
  const firstVehicleDelete = await clientA.rpc('delete_vehicle_consistent', { p_vehicle_id: deleteVehicleId });
  const secondVehicleDelete = await clientA.rpc('delete_vehicle_consistent', { p_vehicle_id: deleteVehicleId });
  const vehicleDeleteRecovery = await reconcile({ url, anonKey, token: sessionA.access_token });
  const deletedVehicleObject = await clientA.storage.from(bucketName).download(vehicleUpload.path);
  const deletedVehicle = await clientA.from('vehicles').select('id').eq('id', deleteVehicleId).maybeSingle();
  assert(
    results,
    'd13VehicleCascadeAndStorageCleanup',
    firstVehicleDelete.data === true && secondVehicleDelete.data === false && vehicleDeleteRecovery.ok && Boolean(deletedVehicleObject.error) && deletedVehicle.data === null,
  );
} catch (error) {
  failure = error instanceof QaFailure ? error.message : 'unexpected TASK-008 remote QA failure';
} finally {
  try {
    if (userAId) await removeOwnerPaths(clientA, userAId);
    if (userBId) await removeOwnerPaths(clientB, userBId);
  } catch {
    failure ??= 'synthetic storage cleanup failed';
  }
  await clientA.auth.signOut({ scope: 'local' }).catch(() => undefined);
  await clientB.auth.signOut({ scope: 'local' }).catch(() => undefined);
  try {
    if (userAId || userBId) {
      runLinkedSql(`
        delete from auth.users
        where (id = ${sqlLiteral(userAId ?? randomUUID())}::uuid and email = ${sqlLiteral(emailA)})
           or (id = ${sqlLiteral(userBId ?? randomUUID())}::uuid and email = ${sqlLiteral(emailB)});
      `);
    }
    const remaining = runLinkedSql(`
      select count(*)::integer as count from auth.users
      where email in (${sqlLiteral(emailA)}, ${sqlLiteral(emailB)});
    `);
    cleanup.userA = remaining[0]?.count === 0;
    cleanup.userB = remaining[0]?.count === 0;
    const storageRows = runLinkedSql(`
      select count(*)::integer as count from storage.objects
      where bucket_id = '${bucketName}'
        and (name like ${sqlLiteral(`${userAId ?? randomUUID()}/%`)}
          or name like ${sqlLiteral(`${userBId ?? randomUUID()}/%`)});
    `);
    cleanup.storageEmpty = storageRows[0]?.count === 0;
  } catch {
    failure ??= 'synthetic database cleanup failed';
  }
}

console.log(JSON.stringify({ projectRef, tests: results, cleanup, failure }, null, 2));
if (failure || Object.values(cleanup).some((value) => value !== true)) process.exitCode = 1;
