import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const expectedProjectRef = 'eiqxvvnqkbzbhzpthcwo';
const bucketName = 'vehicle-attachments';
const maxFileBytes = 5 * 1024 * 1024;

class QaFailure extends Error {}

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

function requireCondition(results, name, condition) {
  results[name] = Boolean(condition);
  if (!condition) throw new QaFailure(`${name} failed`);
}

function createPublicClient(url, anonKey) {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function paddedFile(prefix, size) {
  const bytes = new Uint8Array(size);
  bytes.set(prefix);
  return bytes;
}

async function signIn(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) throw new QaFailure('syntheticUserSignIn failed');
  return data;
}

async function invokeUpload({
  url,
  anonKey,
  accessToken,
  vehicleId,
  bytes,
  mimeType,
  declaredSize = bytes.byteLength,
}) {
  const response = await fetch(`${url}/functions/v1/upload-attachment`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${accessToken}`,
      'content-type': mimeType,
      'x-vehicle-id': vehicleId,
      'x-file-size': String(declaredSize),
    },
    body: bytes,
  });
  const payload = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    code: typeof payload.code === 'string' ? payload.code : null,
    path: typeof payload.path === 'string' ? payload.path : null,
  };
}

async function invokeDeleteAccount({ url, anonKey, accessToken }) {
  const response = await fetch(`${url}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: '{}',
  });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, deleted: payload.deleted === true };
}

async function diagnoseReservedStorageUpload({
  adminClient,
  userClient,
  ownerId,
  vehicleId,
  bytes,
  mimeType,
}) {
  const reservation = await adminClient.rpc('reserve_attachment_upload', {
    p_owner_id: ownerId,
    p_vehicle_id: vehicleId,
    p_size_bytes: bytes.byteLength,
    p_mime_type: mimeType,
  });
  if (reservation.error || !reservation.data?.[0]) {
    return {
      reservationRpc: false,
      reservationPolicyHelper: 'NOT_ATTEMPTED',
      storageUpload: 'NOT_ATTEMPTED',
    };
  }

  const reserved = reservation.data[0];
  const reservationRow = await adminClient
    .from('attachment_upload_reservations')
    .select('owner_id, vehicle_id, object_path, expected_size, expected_mime, expires_at')
    .eq('id', reserved.reservation_id)
    .single();
  const policyHelper = await userClient.rpc('is_valid_attachment_reservation', {
    p_object_path: reserved.object_path,
    p_metadata: { size: bytes.byteLength, mimetype: mimeType },
  });
  const storageUpload = await userClient.storage
    .from(bucketName)
    .upload(reserved.object_path, bytes, {
      contentType: mimeType,
      upsert: false,
    });
  await adminClient
    .from('attachment_upload_reservations')
    .delete()
    .eq('id', reserved.reservation_id)
    .eq('owner_id', ownerId);

  if (!storageUpload.error) {
    await userClient.storage.from(bucketName).remove([reserved.object_path]);
    return {
      reservationRpc: true,
      reservationRowMatches:
        !reservationRow.error &&
        reservationRow.data.owner_id === ownerId &&
        reservationRow.data.vehicle_id === vehicleId &&
        reservationRow.data.object_path === reserved.object_path &&
        Number(reservationRow.data.expected_size) === bytes.byteLength &&
        reservationRow.data.expected_mime === mimeType &&
        new Date(reservationRow.data.expires_at).getTime() > Date.now(),
      reservationPolicyHelper: !policyHelper.error && policyHelper.data === true,
      reservationPolicyHelperDiagnostic: policyHelper.error
        ? `ERROR:${policyHelper.error.code ?? 'UNKNOWN'}`
        : String(policyHelper.data),
      storageUpload: 'SUCCEEDED',
    };
  }

  const safeStatus = String(storageUpload.error.statusCode ?? 'UNKNOWN').replace(
    /[^A-Za-z0-9_-]/g,
    '_',
  );
  const safeCode = String(storageUpload.error.error ?? 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '_');
  const message = String(storageUpload.error.message ?? '');
  const safeCategory = /row.level security/i.test(message)
    ? 'RLS'
    : /database/i.test(message)
      ? 'DATABASE'
      : /mime|content.type/i.test(message)
        ? 'CONTENT_TYPE'
        : 'UNKNOWN';
  return {
    reservationRpc: true,
    reservationRowMatches:
      !reservationRow.error &&
      reservationRow.data.owner_id === ownerId &&
      reservationRow.data.vehicle_id === vehicleId &&
      reservationRow.data.object_path === reserved.object_path &&
      Number(reservationRow.data.expected_size) === bytes.byteLength &&
      reservationRow.data.expected_mime === mimeType &&
      new Date(reservationRow.data.expires_at).getTime() > Date.now(),
    reservationPolicyHelper: !policyHelper.error && policyHelper.data === true,
    reservationPolicyHelperDiagnostic: policyHelper.error
      ? `ERROR:${policyHelper.error.code ?? 'UNKNOWN'}`
      : String(policyHelper.data),
    storageUpload: `${safeStatus}:${safeCode}:${safeCategory}`,
  };
}

async function listOwnerPaths(adminClient, ownerId) {
  const bucket = adminClient.storage.from(bucketName);
  const paths = [];

  async function visit(prefix) {
    let offset = 0;
    while (true) {
      const { data, error } = await bucket.list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw new QaFailure('adminStorageList failed');
      for (const item of data ?? []) {
        const childPath = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id) paths.push(childPath);
        else await visit(childPath);
      }
      if (!data || data.length < 100) break;
      offset += data.length;
    }
  }

  await visit(ownerId);
  return paths;
}

async function removeOwnerPaths(adminClient, ownerId) {
  const paths = await listOwnerPaths(adminClient, ownerId);
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await adminClient.storage
      .from(bucketName)
      .remove(paths.slice(index, index + 100));
    if (error) throw new QaFailure('adminStorageCleanup failed');
  }
  return paths.length;
}

async function authUserExists(adminClient, userId) {
  const { data, error } = await adminClient.auth.admin.getUserById(userId);
  return !error && Boolean(data.user);
}

async function cleanupSyntheticUser(adminClient, userId) {
  if (!userId) return;
  await removeOwnerPaths(adminClient, userId);
  if (await authUserExists(adminClient, userId)) {
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) throw new QaFailure('adminAuthCleanup failed');
  }
}

if (process.env.QA_REMOTE_CONFIRM !== 'ARACIM_CEPTE_REMOTE_QA') {
  throw new Error('QA_REMOTE_CONFIRM must exactly equal ARACIM_CEPTE_REMOTE_QA.');
}
if (process.env.QA_EXPECTED_PROJECT_REF !== expectedProjectRef) {
  throw new Error(`QA_EXPECTED_PROJECT_REF must exactly equal ${expectedProjectRef}.`);
}
if (!process.env.QA_SUPABASE_SECRET_KEY) {
  throw new Error('QA_SUPABASE_SECRET_KEY is required and must not be written to a file.');
}

const root = resolve(import.meta.dirname, '..');
const env = parseEnvFile(await readFile(resolve(root, '.env'), 'utf8'));
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error('Supabase public environment is missing.');
if (new URL(url).hostname.split('.')[0] !== expectedProjectRef) {
  throw new Error('Public Supabase endpoint does not match the approved project ref.');
}

const adminClient = createClient(url, process.env.QA_SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const userAClient = createPublicClient(url, anonKey);
const userBClient = createPublicClient(url, anonKey);
const targetedUploadMode = process.env.QA_UPLOAD_TARGETED_ONLY === 'true';
const results = {};
const cleanup = { userA: false, userB: false, storageEmpty: false };
const runId = randomUUID();
const passwordA = `Qa-A-${randomUUID()}!a9`;
const passwordB = `Qa-B-${randomUUID()}!b9`;
const emailA = `qa-task004-a-${runId}@example.com`;
const emailB = `qa-task004-b-${runId}@example.com`;
let userAId = null;
let userBId = null;
let userADeletedByFunction = false;
let userBDeletedByFunction = false;
let failure = null;

const pdfBytes = new TextEncoder().encode('%PDF-1.4\n% TASK-004 synthetic PDF\n%%EOF');
const jpegBytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const pngBytes = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  ),
);
const webpBytes = new TextEncoder().encode('RIFF0000WEBPVP8 TASK-004');

try {
  const createdA = await adminClient.auth.admin.createUser({
    email: emailA,
    password: passwordA,
    email_confirm: true,
    user_metadata: { display_name: 'TASK-004 QA A' },
  });
  const createdB = await adminClient.auth.admin.createUser({
    email: emailB,
    password: passwordB,
    email_confirm: true,
    user_metadata: { display_name: 'TASK-004 QA B' },
  });
  requireCondition(results, 'syntheticUsersCreated', !createdA.error && !createdB.error);
  userAId = createdA.data.user?.id ?? null;
  userBId = createdB.data.user?.id ?? null;
  if (!userAId || !userBId) throw new QaFailure('syntheticUserIds failed');

  const authA = await signIn(userAClient, emailA, passwordA);
  const authB = await signIn(userBClient, emailB, passwordB);
  requireCondition(results, 'syntheticUsersAuthenticated', true);

  const vehicle = await userAClient
    .from('vehicles')
    .insert({
      owner_id: userAId,
      brand: 'QA',
      model: 'TASK-004',
      year: 2020,
      current_km: 1000,
      fuel_type: 'gasoline',
      body_type: 'sedan_hatchback',
    })
    .select('id')
    .single();
  requireCondition(results, 'userACreatesVehicle', !vehicle.error && Boolean(vehicle.data?.id));
  const vehicleId = vehicle.data.id;

  const userBVehicleRead = await userBClient.from('vehicles').select('id').eq('id', vehicleId);
  const userBVehicleUpdate = await userBClient
    .from('vehicles')
    .update({ current_km: 999999 })
    .eq('id', vehicleId)
    .select('id');
  const userBCrossOwnerInsert = await userBClient.from('vehicle_documents').insert({
    owner_id: userAId,
    vehicle_id: vehicleId,
    document_type: 'custom',
    title: 'TASK-004 forbidden',
  });
  requireCondition(
    results,
    'crossUserDatabaseDenied',
    !userBVehicleRead.error &&
      userBVehicleRead.data.length === 0 &&
      !userBVehicleUpdate.error &&
      userBVehicleUpdate.data.length === 0 &&
      Boolean(userBCrossOwnerInsert.error),
  );

  const unauthenticatedUpload = await fetch(`${url}/functions/v1/upload-attachment`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'content-type': 'image/png',
      'x-vehicle-id': vehicleId,
      'x-file-size': String(pngBytes.byteLength),
    },
    body: pngBytes,
  });
  requireCondition(results, 'uploadFunctionRequiresUserAuth', unauthenticatedUpload.status === 401);

  if (process.env.QA_RESERVATION_DIAGNOSTIC_ONLY === 'true') {
    results.reservationDiagnostic = await diagnoseReservedStorageUpload({
      adminClient,
      userClient: userAClient,
      ownerId: userAId,
      vehicleId,
      bytes: pdfBytes,
      mimeType: 'application/pdf',
    });
    throw new QaFailure('reservationDiagnosticOnly');
  }

  const webp = await invokeUpload({
    url,
    anonKey,
    accessToken: authA.session.access_token,
    vehicleId,
    bytes: webpBytes,
    mimeType: 'image/webp',
  });
  results.webpDiagnostic = `${webp.status}:${webp.code ?? 'NO_CODE'}`;
  results.webpRejected = webp.status === 400 && webp.code === 'ATTACHMENT_TYPE_NOT_ALLOWED';

  const fakeMime = await invokeUpload({
    url,
    anonKey,
    accessToken: authA.session.access_token,
    vehicleId,
    bytes: pngBytes,
    mimeType: 'application/pdf',
  });
  results.fakeMimeDiagnostic = `${fakeMime.status}:${fakeMime.code ?? 'NO_CODE'}`;
  results.fakeMimeRejected =
    fakeMime.status === 400 && fakeMime.code === 'ATTACHMENT_CONTENT_MISMATCH';

  if (!targetedUploadMode) {
    try {
      const vehicleB = await userBClient
        .from('vehicles')
        .insert({
          owner_id: userBId,
          brand: 'QA',
          model: 'TASK-004',
          year: 2020,
          current_km: 2000,
          fuel_type: 'gasoline',
          body_type: 'sedan_hatchback',
        })
        .select('id')
        .single();
      if (vehicleB.error || !vehicleB.data?.id) throw new QaFailure('accountDeleteVehicleSetup');

      const accountPath = `${userBId}/${vehicleB.data.id}/${randomUUID()}.png`;
      const adminUpload = await adminClient.storage.from(bucketName).upload(accountPath, pngBytes, {
        contentType: 'image/png',
        upsert: false,
      });
      if (adminUpload.error) throw new QaFailure('accountDeleteStorageSetup');

      const accountDocument = await userBClient.from('vehicle_documents').insert({
        owner_id: userBId,
        vehicle_id: vehicleB.data.id,
        document_type: 'custom',
        title: 'TASK-004 account deletion document',
        attachment_path: accountPath,
      });
      if (accountDocument.error) throw new QaFailure('accountDeleteDocumentSetup');

      const expiring = await adminClient.storage.from(bucketName).createSignedUrl(accountPath, 60);
      if (expiring.error || !expiring.data?.signedUrl) throw new QaFailure('signedUrlSetup');
      const immediateFetch = await fetch(expiring.data.signedUrl, { redirect: 'manual' });
      requireCondition(results, 'signedUrlImmediateAccess', immediateFetch.ok);
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 65_000));
      const expiredFetch = await fetch(expiring.data.signedUrl, { redirect: 'manual' });
      requireCondition(results, 'signedUrlExpiresAfterApproximately60Seconds', !expiredFetch.ok);

      const deletionUrl = await adminClient.storage
        .from(bucketName)
        .createSignedUrl(accountPath, 60);
      if (deletionUrl.error || !deletionUrl.data?.signedUrl) {
        throw new QaFailure('accountDeleteSignedUrlSetup');
      }
      const accountDelete = await invokeDeleteAccount({
        url,
        anonKey,
        accessToken: authB.session.access_token,
      });
      requireCondition(
        results,
        'deleteAccountFunctionSucceeds',
        accountDelete.ok && accountDelete.status === 200 && accountDelete.deleted,
      );
      userBDeletedByFunction = true;

      const userBStillExists = await authUserExists(adminClient, userBId);
      const remainingObjects = await listOwnerPaths(adminClient, userBId);
      requireCondition(
        results,
        'accountDeletionRemovesAuthAndStorage',
        !userBStillExists && remainingObjects.length === 0,
      );
      results.accountDeletionDatabaseCascade = 'REQUIRES_LINKED_SQL_AUDIT';

      const oldSessionUser = await userBClient.auth.getUser(authB.session.access_token);
      const deletedSignedFetch = await fetch(deletionUrl.data.signedUrl, { redirect: 'manual' });
      requireCondition(
        results,
        'oldSessionAndSignedUrlCannotAccessDeletedData',
        Boolean(oldSessionUser.error) && !deletedSignedFetch.ok,
      );
    } catch (error) {
      results.independentAccountDeletionE2e = false;
      results.independentAccountDeletionDiagnostic =
        error instanceof QaFailure ? error.message : 'unexpectedFailure';
    }
  }

  const publicHelperCall = await userAClient.rpc('is_valid_attachment_reservation', {
    p_object_path: 'not-a-real-object',
    p_metadata: {},
  });
  requireCondition(results, 'publicReservationHelperUnavailable', Boolean(publicHelperCall.error));

  const allowedUploads = [];
  for (const [mimeType, bytes] of [
    ['application/pdf', pdfBytes],
    ['image/jpeg', jpegBytes],
    ['image/png', pngBytes],
  ]) {
    const upload = await invokeUpload({
      url,
      anonKey,
      accessToken: authA.session.access_token,
      vehicleId,
      bytes,
      mimeType,
    });
    if (!upload.ok || upload.status !== 201 || !upload.path) {
      results.allowedMimeDiagnostic = await diagnoseReservedStorageUpload({
        adminClient,
        userClient: userAClient,
        ownerId: userAId,
        vehicleId,
        bytes,
        mimeType,
      });
      throw new QaFailure(
        `allowedMimeUpload:${mimeType}:${upload.status}:${upload.code ?? 'NO_CODE'} failed`,
      );
    }
    allowedUploads.push(upload.path);
  }
  requireCondition(results, 'pdfJpegPngAccepted', allowedUploads.length === 3);
  requireCondition(
    results,
    'ownerScopedRandomPaths',
    allowedUploads.every((objectPath) => {
      const escapedOwner = userAId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedVehicle = vehicleId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`^${escapedOwner}/${escapedVehicle}/[0-9a-f-]{36}\\.(pdf|jpg|png)$`).test(
        objectPath,
      );
    }),
  );

  const protectedPath = allowedUploads[0];
  const userBDownload = await userBClient.storage.from(bucketName).download(protectedPath);
  const userBSigned = await userBClient.storage.from(bucketName).createSignedUrl(protectedPath, 60);
  const userBList = await userBClient.storage
    .from(bucketName)
    .list(`${userAId}/${vehicleId}`, { limit: 100 });
  const userBRemove = await userBClient.storage.from(bucketName).remove([protectedPath]);
  const ownerStillReads = await userAClient.storage
    .from(bucketName)
    .createSignedUrl(protectedPath, 60);
  requireCondition(
    results,
    'crossUserStorageDenied',
    Boolean(userBDownload.error) &&
      Boolean(userBSigned.error) &&
      (!userBList.error ? (userBList.data?.length ?? 0) === 0 : true) &&
      !userBRemove.error &&
      !ownerStillReads.error,
  );
  const publicResponse = await fetch(
    `${url}/storage/v1/object/public/${bucketName}/${protectedPath}`,
    { redirect: 'manual' },
  );
  requireCondition(results, 'privateBucketRejectsPublicUrl', !publicResponse.ok);

  const directPath = `${userAId}/${vehicleId}/${randomUUID()}.png`;
  const directUpload = await userAClient.storage.from(bucketName).upload(directPath, pngBytes, {
    contentType: 'image/png',
    upsert: false,
  });
  requireCondition(
    results,
    'directStorageUploadWithoutReservationDenied',
    Boolean(directUpload.error),
  );

  const allowedCleanup = await userAClient.storage.from(bucketName).remove(allowedUploads);
  if (allowedCleanup.error) throw new QaFailure('allowedMimeCleanup failed');

  const countPaths = [];
  for (let index = 0; index < 10; index += 1) {
    const objectPath = `${userAId}/${vehicleId}/${randomUUID()}.png`;
    const upload = await adminClient.storage.from(bucketName).upload(objectPath, pngBytes, {
      contentType: 'image/png',
      upsert: false,
    });
    if (upload.error) throw new QaFailure('tenDocumentSetup failed');
    countPaths.push(objectPath);
  }
  const eleventh = await invokeUpload({
    url,
    anonKey,
    accessToken: authA.session.access_token,
    vehicleId,
    bytes: pngBytes,
    mimeType: 'image/png',
  });
  requireCondition(
    results,
    'eleventhDocumentRejected',
    eleventh.status === 400 && eleventh.code === 'ATTACHMENT_COUNT_QUOTA_EXCEEDED',
  );
  const countCleanup = await adminClient.storage.from(bucketName).remove(countPaths);
  if (countCleanup.error) throw new QaFailure('countQuotaCleanup failed');

  const fiveMbPdf = paddedFile(pdfBytes, maxFileBytes);
  const byteQuotaPaths = [];
  for (let index = 0; index < 5; index += 1) {
    const objectPath = `${userAId}/${vehicleId}/${randomUUID()}.pdf`;
    const upload = await adminClient.storage.from(bucketName).upload(objectPath, fiveMbPdf, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (upload.error) throw new QaFailure('twentyFiveMbSetup failed');
    byteQuotaPaths.push(objectPath);
  }
  const overTotal = await invokeUpload({
    url,
    anonKey,
    accessToken: authA.session.access_token,
    vehicleId,
    bytes: pngBytes,
    mimeType: 'image/png',
  });
  requireCondition(
    results,
    'totalOver25MbRejected',
    overTotal.status === 400 && overTotal.code === 'ATTACHMENT_BYTES_QUOTA_EXCEEDED',
  );
  const byteCleanup = await adminClient.storage.from(bucketName).remove(byteQuotaPaths);
  if (byteCleanup.error) throw new QaFailure('byteQuotaCleanup failed');

  const documentUpload = await invokeUpload({
    url,
    anonKey,
    accessToken: authA.session.access_token,
    vehicleId,
    bytes: pdfBytes,
    mimeType: 'application/pdf',
  });
  if (!documentUpload.ok || !documentUpload.path) throw new QaFailure('documentDeleteSetup failed');
  const document = await userAClient
    .from('vehicle_documents')
    .insert({
      owner_id: userAId,
      vehicle_id: vehicleId,
      document_type: 'custom',
      title: 'TASK-004 synthetic document',
      attachment_path: documentUpload.path,
    })
    .select('id')
    .single();
  requireCondition(results, 'userACreatesDocument', !document.error && Boolean(document.data?.id));

  if (!targetedUploadMode) {
    const expiring = await userAClient.storage
      .from(bucketName)
      .createSignedUrl(documentUpload.path, 60);
    if (expiring.error || !expiring.data?.signedUrl)
      throw new QaFailure('signedUrlCreation failed');
    const immediateFetch = await fetch(expiring.data.signedUrl, { redirect: 'manual' });
    requireCondition(results, 'signedUrlImmediateAccess', immediateFetch.ok);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 65_000));
    const expiredFetch = await fetch(expiring.data.signedUrl, { redirect: 'manual' });
    requireCondition(results, 'signedUrlExpiresAfterApproximately60Seconds', !expiredFetch.ok);
  }

  const documentObjectDelete = await userAClient.storage
    .from(bucketName)
    .remove([documentUpload.path]);
  const documentRowDelete = await userAClient
    .from('vehicle_documents')
    .delete()
    .eq('id', document.data.id);
  const deletedRow = await userAClient
    .from('vehicle_documents')
    .select('id')
    .eq('id', document.data.id);
  const deletedObject = await userAClient.storage
    .from(bucketName)
    .createSignedUrl(documentUpload.path, 60);
  requireCondition(
    results,
    'documentDeletionRemovesDbAndStorage',
    !documentObjectDelete.error &&
      !documentRowDelete.error &&
      !deletedRow.error &&
      deletedRow.data.length === 0 &&
      Boolean(deletedObject.error),
  );

  if (process.env.QA_SKIP_LARGE_FILE === 'true') {
    results.fileOver5MbRejected = 'SKIPPED_BY_EXPLICIT_QA_FLAG';
  } else {
    const oversizedPreflight = await invokeUpload({
      url,
      anonKey,
      accessToken: authA.session.access_token,
      vehicleId,
      bytes: pdfBytes,
      mimeType: 'application/pdf',
      declaredSize: maxFileBytes + 1,
    });
    results.fileOver5MbDiagnostic = `${oversizedPreflight.status}:${oversizedPreflight.code ?? 'NO_CODE'}`;
    results.fileOver5MbRejected =
      oversizedPreflight.status === 413 && oversizedPreflight.code === 'ATTACHMENT_FILE_TOO_LARGE';

    const oversizedPath = `${userAId}/${vehicleId}/${randomUUID()}.pdf`;
    const oversizedStorage = await adminClient.storage
      .from(bucketName)
      .upload(oversizedPath, paddedFile(pdfBytes, maxFileBytes + 1), {
        contentType: 'application/pdf',
        upsert: false,
      });
    results.bucketRejectsActualOversize = Boolean(oversizedStorage.error);
    if (!oversizedStorage.error) {
      await adminClient.storage.from(bucketName).remove([oversizedPath]);
    }
  }

  if (
    process.env.QA_SKIP_LARGE_FILE !== 'true' &&
    (results.fileOver5MbRejected !== true || results.bucketRejectsActualOversize !== true)
  ) {
    throw new QaFailure('fileOver5MbRejected failed');
  }
  if (results.webpRejected !== true || results.fakeMimeRejected !== true) {
    throw new QaFailure('mimeRejectionChecks failed');
  }

  if (!targetedUploadMode) {
    const accountUpload = await invokeUpload({
      url,
      anonKey,
      accessToken: authA.session.access_token,
      vehicleId,
      bytes: pngBytes,
      mimeType: 'image/png',
    });
    if (!accountUpload.ok || !accountUpload.path) throw new QaFailure('accountDeleteSetup failed');
    const accountDocument = await userAClient.from('vehicle_documents').insert({
      owner_id: userAId,
      vehicle_id: vehicleId,
      document_type: 'custom',
      title: 'TASK-004 account deletion document',
      attachment_path: accountUpload.path,
    });
    if (accountDocument.error) throw new QaFailure('accountDeleteDocumentSetup failed');
    const preDeleteSigned = await userAClient.storage
      .from(bucketName)
      .createSignedUrl(accountUpload.path, 60);
    if (preDeleteSigned.error || !preDeleteSigned.data?.signedUrl) {
      throw new QaFailure('accountDeleteSignedUrlSetup failed');
    }
    const accountDelete = await invokeDeleteAccount({
      url,
      anonKey,
      accessToken: authA.session.access_token,
    });
    requireCondition(
      results,
      'deleteAccountFunctionSucceeds',
      accountDelete.ok && accountDelete.status === 200 && accountDelete.deleted,
    );
    userADeletedByFunction = true;

    const userAStillExists = await authUserExists(adminClient, userAId);
    const remainingObjects = await listOwnerPaths(adminClient, userAId);
    requireCondition(
      results,
      'accountDeletionRemovesAuthAndStorage',
      !userAStillExists && remainingObjects.length === 0,
    );
    results.accountDeletionDatabaseCascade = 'REQUIRES_LINKED_SQL_AUDIT';

    const oldSessionUser = await userAClient.auth.getUser(authA.session.access_token);
    const oldSessionRead = await userAClient.from('vehicles').select('id').eq('owner_id', userAId);
    const deletedSignedFetch = await fetch(preDeleteSigned.data.signedUrl, { redirect: 'manual' });
    requireCondition(
      results,
      'oldSessionAndSignedUrlCannotAccessDeletedData',
      Boolean(oldSessionUser.error) &&
        !oldSessionRead.error &&
        oldSessionRead.data.length === 0 &&
        !deletedSignedFetch.ok,
    );
  }
} catch (error) {
  failure = error instanceof QaFailure ? error.message : 'unexpectedRemoteQaFailure';
} finally {
  await userAClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
  await userBClient.auth.signOut({ scope: 'local' }).catch(() => undefined);

  try {
    if (userAId && !userADeletedByFunction) await cleanupSyntheticUser(adminClient, userAId);
    if (userBId && !userBDeletedByFunction) await cleanupSyntheticUser(adminClient, userBId);

    cleanup.userA = userAId ? !(await authUserExists(adminClient, userAId)) : true;
    cleanup.userB = userBId ? !(await authUserExists(adminClient, userBId)) : true;
    const storageA = userAId ? await listOwnerPaths(adminClient, userAId) : [];
    const storageB = userBId ? await listOwnerPaths(adminClient, userBId) : [];
    cleanup.storageEmpty = storageA.length === 0 && storageB.length === 0;
  } catch (error) {
    cleanup.verificationError =
      error instanceof QaFailure ? error.message : 'cleanupVerification failed';
    if (!failure) failure = 'syntheticQaCleanup failed';
  }
}

console.log(
  JSON.stringify(
    {
      projectRef: expectedProjectRef,
      tests: results,
      cleanup,
      databaseCleanupVerification: 'REQUIRES_LINKED_SQL_AUDIT',
      failure,
    },
    null,
    2,
  ),
);

if (failure || Object.values(cleanup).some((value) => value !== true)) process.exitCode = 1;
