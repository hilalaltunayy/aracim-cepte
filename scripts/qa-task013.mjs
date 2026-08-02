import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const projectRef = 'eiqxvvnqkbzbhzpthcwo';
const bucketName = 'vehicle-attachments';
const maxFileBytes = 5 * 1024 * 1024;
const totalQuotaBytes = 25 * 1024 * 1024;
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

function sqlLiteral(value) {
  if (!/^[0-9a-z@._/%:-]+$/i.test(value)) throw new Error('Unsafe synthetic SQL literal.');
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

function publicClient(url, anonKey) {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function timedFetch(input, init = {}, timeoutMs = 120_000) {
  return fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

async function createSyntheticUser(id, email, password) {
  runLinkedSql(`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', ${sqlLiteral(id)}::uuid,
      'authenticated', 'authenticated', ${sqlLiteral(email)},
      extensions.crypt(${sqlLiteral(password)}, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      ${sqlLiteral(id)}::uuid, ${sqlLiteral(id)}, ${sqlLiteral(id)}::uuid,
      jsonb_build_object('sub', ${sqlLiteral(id)}, 'email', ${sqlLiteral(email)}),
      'email', now(), now(), now()
    );
  `);
}

async function signIn(client, email, password) {
  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session) throw new Error('Synthetic sign-in failed.');
  return result.data.session;
}

async function invokeUpload({
  url,
  anonKey,
  token,
  vehicleId,
  bytes,
  mimeType,
  requestId = randomUUID(),
  declaredSize = bytes.byteLength,
}) {
  const response = await timedFetch(`${url}/functions/v1/upload-attachment`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
      'content-type': mimeType,
      'x-file-size': String(declaredSize),
      'x-vehicle-id': vehicleId,
      'x-upload-request-id': requestId,
      connection: 'close',
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

async function invokeReconcile({ url, anonKey, token }) {
  const response = await timedFetch(`${url}/functions/v1/reconcile-attachments`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: '{}',
  });
  return response.ok;
}

async function invokeDeleteAccount({ url, anonKey, token }) {
  const response = await timedFetch(`${url}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: '{}',
  });
  const payload = await response.json().catch(() => ({}));
  return response.ok && payload.deleted === true;
}

async function listOwnerPaths(client, ownerId) {
  const paths = [];
  async function visit(prefix) {
    let offset = 0;
    while (true) {
      const result = await client.storage.from(bucketName).list(prefix, { limit: 100, offset });
      if (result.error) throw new Error('Synthetic Storage list failed.');
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
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const paths = await listOwnerPaths(client, ownerId);
    if (paths.length === 0) return;
    for (let index = 0; index < paths.length; index += 100) {
      const removed = await client.storage.from(bucketName).remove(paths.slice(index, index + 100));
      if (removed.error) throw new Error('Synthetic Storage cleanup failed.');
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error('Synthetic Storage cleanup verification failed.');
}

async function rowExists(client, table, id) {
  const result = await client.from(table).select('id').eq('id', id);
  return !result.error && result.data.length === 1;
}

async function foreignRowIsHidden(client, table, id) {
  const read = await client.from(table).select('id').eq('id', id);
  const update = await client
    .from(table)
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');
  const remove = await client.from(table).delete().eq('id', id).select('id');
  return (
    !read.error &&
    read.data.length === 0 &&
    !update.error &&
    update.data.length === 0 &&
    !remove.error &&
    remove.data.length === 0
  );
}

if (process.env.QA_REMOTE_CONFIRM !== 'ARACIM_CEPTE_REMOTE_QA') {
  throw new Error('QA_REMOTE_CONFIRM must exactly equal ARACIM_CEPTE_REMOTE_QA.');
}
if (process.env.QA_EXPECTED_PROJECT_REF !== projectRef) {
  throw new Error(`QA_EXPECTED_PROJECT_REF must exactly equal ${projectRef}.`);
}

const linkedRef = (await readFile(resolve(root, 'supabase/.temp/project-ref'), 'utf8')).trim();
const env = parseEnv(await readFile(resolve(root, '.env'), 'utf8'));
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (
  linkedRef !== projectRef ||
  !url ||
  !anonKey ||
  new URL(url).hostname.split('.')[0] !== projectRef
) {
  throw new Error('Linked/public Supabase project ref mismatch.');
}

const results = {};
const cleanup = { auth: false, database: false, storage: false };
const check = (name, value) => {
  results[name] = Boolean(value);
};
const runId = randomUUID();
const userA = {
  id: randomUUID(),
  email: `qa-task013-a-${runId}@example.com`,
  password: `Qa13A${randomUUID().replaceAll('-', '')}`,
};
const userB = {
  id: randomUUID(),
  email: `qa-task013-b-${runId}@example.com`,
  password: `Qa13B${randomUUID().replaceAll('-', '')}`,
};
const replacementUserId = randomUUID();
const clientA = publicClient(url, anonKey);
const clientB = publicClient(url, anonKey);
const anonClient = publicClient(url, anonKey);
const pdf = new TextEncoder().encode('%PDF-1.4\n% TASK-013 synthetic\n%%EOF');
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const png = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  ),
);
const webp = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x08, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
let sessionA;
let sessionB;
let vehicleAId;
let vehicleBId;
let expiryUrl = null;
let expiryCreatedAt = 0;
let failure = null;
let phase = 'preflight';

async function cleanupPreviousTask013Users() {
  const previous = runLinkedSql(`
    select id::text, email from auth.users
    where email like 'qa-task013-%@example.com';
  `);
  for (const row of previous) {
    const password = `Qa13Cleanup${randomUUID().replaceAll('-', '')}`;
    runLinkedSql(`
      update auth.users set encrypted_password = extensions.crypt(${sqlLiteral(password)}, extensions.gen_salt('bf'))
      where id = ${sqlLiteral(row.id)}::uuid and email = ${sqlLiteral(row.email)};
    `);
    const client = publicClient(url, anonKey);
    const session = await signIn(client, row.email, password);
    await removeOwnerPaths(client, row.id);
    const deleted = await invokeDeleteAccount({ url, anonKey, token: session.access_token });
    await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
    if (!deleted) {
      runLinkedSql(
        `delete from auth.users where id = ${sqlLiteral(row.id)}::uuid and email = ${sqlLiteral(row.email)};`,
      );
    }
  }
  const remaining = runLinkedSql(`
    select
      (select count(*) from auth.users where email like 'qa-task013-%@example.com')::integer as auth_count,
      (select count(*) from storage.objects where bucket_id = 'vehicle-attachments' and (storage.foldername(name))[1] in (
        select id::text from auth.users where email like 'qa-task013-%@example.com'
      ))::integer as storage_count;
  `)[0];
  return previous.length === 0 || (remaining.auth_count === 0 && remaining.storage_count === 0);
}

function bytesEqual(left, right) {
  return (
    left.byteLength === right.byteLength && left.every((value, index) => value === right[index])
  );
}

async function recoverVerifiedSyntheticOrphans() {
  const candidates = runLinkedSql(`
    select distinct o.owner_id::text
    from storage.objects o
    where o.bucket_id = 'vehicle-attachments'
      and o.created_at > pg_catalog.now() - interval '30 minutes'
      and o.owner_id is not null
      and not exists (select 1 from auth.users u where u.id::text = o.owner_id)
      and case when o.metadata->>'size' ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else 0 end
        in (${pdf.byteLength}, ${jpeg.byteLength}, ${png.byteLength});
  `);
  let recovered = 0;
  for (const candidate of candidates) {
    const recoveryEmail = `qa-task013-recovery-${candidate.owner_id}@example.com`;
    const recoveryPassword = `Qa13Recovery${randomUUID().replaceAll('-', '')}`;
    await createSyntheticUser(candidate.owner_id, recoveryEmail, recoveryPassword);
    const client = publicClient(url, anonKey);
    const session = await signIn(client, recoveryEmail, recoveryPassword);
    const paths = await listOwnerPaths(client, candidate.owner_id);
    const verified = [];
    for (const path of paths) {
      const downloaded = await client.storage.from(bucketName).download(path);
      if (downloaded.error || !downloaded.data) continue;
      const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
      if ([pdf, jpeg, png].some((fixture) => bytesEqual(bytes, fixture))) verified.push(path);
    }
    if (verified.length) {
      const removed = await client.storage.from(bucketName).remove(verified);
      if (removed.error) throw new Error('Verified synthetic orphan cleanup failed.');
      recovered += verified.length;
    }
    await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
    runLinkedSql(
      `delete from auth.users where id = ${sqlLiteral(candidate.owner_id)}::uuid and email = ${sqlLiteral(recoveryEmail)};`,
    );
    void session;
  }
  return recovered;
}

try {
  check('preflightSyntheticCleanup', await cleanupPreviousTask013Users());
  const recoveredOrphans = await recoverVerifiedSyntheticOrphans();
  check('preflightVerifiedOrphanCleanup', recoveredOrphans >= 0);
  phase = 'synthetic-user-setup';
  await createSyntheticUser(userA.id, userA.email, userA.password);
  await createSyntheticUser(userB.id, userB.email, userB.password);
  sessionA = await signIn(clientA, userA.email, userA.password);
  sessionB = await signIn(clientB, userB.email, userB.password);
  check('projectRefMatched', linkedRef === projectRef);
  check('syntheticUsersAuthenticated', Boolean(sessionA && sessionB));

  const vehicleA = await clientA
    .from('vehicles')
    .insert({
      owner_id: userA.id,
      brand: 'QA-A',
      model: 'Synthetic',
      current_km: 1000,
      fuel_type: 'gasoline',
      body_type: 'sedan_hatchback',
    })
    .select('id')
    .single();
  const vehicleB = await clientB
    .from('vehicles')
    .insert({
      owner_id: userB.id,
      brand: 'QA-B',
      model: 'Synthetic',
      current_km: 2000,
      fuel_type: 'diesel',
      body_type: 'suv_crossover',
    })
    .select('id')
    .single();
  if (vehicleA.error || vehicleB.error) throw new Error('Synthetic vehicle setup failed.');
  vehicleAId = vehicleA.data.id;
  vehicleBId = vehicleB.data.id;

  const recordRows = await clientB
    .from('vehicle_records')
    .insert([
      {
        owner_id: userB.id,
        vehicle_id: vehicleBId,
        record_type: 'fuel',
        category: 'Synthetic fuel',
        amount: 100,
        record_date: '2026-08-02',
        kilometer: 2000,
        liters: 10,
      },
      {
        owner_id: userB.id,
        vehicle_id: vehicleBId,
        record_type: 'maintenance',
        category: 'Synthetic maintenance',
        amount: 200,
        record_date: '2026-08-02',
      },
      {
        owner_id: userB.id,
        vehicle_id: vehicleBId,
        record_type: 'expense',
        category: 'Synthetic expense',
        amount: 50,
        record_date: '2026-08-02',
      },
    ])
    .select('id');
  const reminder = await clientB
    .from('reminders')
    .insert({
      owner_id: userB.id,
      vehicle_id: vehicleBId,
      title: 'Synthetic reminder',
      reminder_type: 'custom',
      due_date: '2026-08-20',
      notification_status: 'scheduled',
      notification_id: 'task013-synthetic',
    })
    .select('id')
    .single();
  const body = await clientB
    .from('body_part_conditions')
    .insert({
      owner_id: userB.id,
      vehicle_id: vehicleBId,
      schema_type: 'suv_crossover',
      part_key: 'front_bumper',
      condition: 'original',
    })
    .select('id')
    .single();
  const expertise = await clientB
    .from('expertise_reports')
    .insert({
      owner_id: userB.id,
      vehicle_id: vehicleBId,
      report_date: '2026-08-02',
      company_name: 'Synthetic',
    })
    .select('id')
    .single();
  const note = await clientB
    .from('vehicle_notes')
    .insert({
      owner_id: userB.id,
      vehicle_id: vehicleBId,
      title: 'Synthetic',
      content: 'Synthetic QA content',
    })
    .select('id')
    .single();
  const document = await clientB
    .from('vehicle_documents')
    .insert({
      owner_id: userB.id,
      vehicle_id: vehicleBId,
      document_type: 'custom',
      title: 'Synthetic metadata',
    })
    .select('id')
    .single();
  if (
    recordRows.error ||
    reminder.error ||
    body.error ||
    expertise.error ||
    note.error ||
    document.error
  )
    throw new Error('Synthetic isolation fixture setup failed.');

  phase = 'database-isolation';
  const foreignRows = [
    ['vehicles', vehicleBId],
    ...recordRows.data.map((row) => ['vehicle_records', row.id]),
    ['reminders', reminder.data.id],
    ['body_part_conditions', body.data.id],
    ['expertise_reports', expertise.data.id],
    ['vehicle_notes', note.data.id],
    ['vehicle_documents', document.data.id],
  ];
  for (const [table, id] of foreignRows)
    check(
      `isolation:${table}:${id === vehicleBId ? 'vehicle' : 'row'}`,
      await foreignRowIsHidden(clientA, table, id),
    );
  check('reverseVehicleIsolation', await foreignRowIsHidden(clientB, 'vehicles', vehicleAId));
  check(
    'foreignRowsSurviveDeniedMutations',
    (await Promise.all(foreignRows.map(([table, id]) => rowExists(clientB, table, id)))).every(
      Boolean,
    ),
  );

  const foreignRecordRpc = await clientA.rpc('save_vehicle_record_atomic', {
    p_request_id: randomUUID(),
    p_vehicle_id: vehicleBId,
    p_record_id: null,
    p_record_type: 'expense',
    p_category: 'Denied',
    p_amount: 1,
    p_record_date: '2026-08-02',
    p_kilometer: null,
    p_liters: null,
    p_description: null,
  });
  const foreignDocumentRpc = await clientA.rpc('save_vehicle_document_consistent', {
    p_id: null,
    p_vehicle_id: vehicleBId,
    p_document_type: 'custom',
    p_title: 'Denied',
    p_document_number: null,
    p_issue_date: null,
    p_expiry_date: null,
    p_note: null,
    p_attachment_path: null,
  });
  const foreignClearRpc = await clientA.rpc('clear_vehicle_documents_consistent', {
    p_vehicle_id: vehicleBId,
  });
  const foreignDeleteVehicleRpc = await clientA.rpc('delete_vehicle_consistent', {
    p_vehicle_id: vehicleBId,
  });
  check(
    'foreignOwnerScopedRpcsDenied',
    Boolean(foreignRecordRpc.error) &&
      Boolean(foreignDocumentRpc.error) &&
      Boolean(foreignClearRpc.error) &&
      !foreignDeleteVehicleRpc.error &&
      foreignDeleteVehicleRpc.data === false,
  );

  const anonRecordRpc = await anonClient.rpc('save_vehicle_record_atomic', {
    p_request_id: randomUUID(),
    p_vehicle_id: vehicleBId,
    p_record_id: null,
    p_record_type: 'expense',
    p_category: 'Denied',
    p_amount: 1,
    p_record_date: '2026-08-02',
    p_kilometer: null,
    p_liters: null,
    p_description: null,
  });
  const anonReserveRpc = await anonClient.rpc('reserve_attachment_upload', {
    p_owner_id: userB.id,
    p_vehicle_id: vehicleBId,
    p_size_bytes: pdf.byteLength,
    p_mime_type: 'application/pdf',
    p_request_id: randomUUID(),
  });
  const anonReconcileOwner = await anonClient.rpc('reconcile_attachment_metadata_for_owner', {
    p_owner_id: userB.id,
  });
  check(
    'anonPrivateRpcExecutionDenied',
    Boolean(anonRecordRpc.error) &&
      Boolean(anonReserveRpc.error) &&
      Boolean(anonReconcileOwner.error),
  );

  const grantRows = runLinkedSql(`
    select
      has_function_privilege('public', 'public.save_vehicle_record_atomic(uuid,uuid,uuid,public.record_type,text,numeric,date,integer,numeric,text)', 'execute') as public_record,
      has_function_privilege('anon', 'public.save_vehicle_record_atomic(uuid,uuid,uuid,public.record_type,text,numeric,date,integer,numeric,text)', 'execute') as anon_record,
      has_function_privilege('anon', 'public.reserve_attachment_upload(uuid,uuid,bigint,text,uuid)', 'execute') as anon_reserve,
      has_function_privilege('authenticated', 'public.reserve_attachment_upload(uuid,uuid,bigint,text,uuid)', 'execute') as authenticated_reserve,
      has_function_privilege('anon', 'public.reconcile_attachment_metadata_for_owner(uuid)', 'execute') as anon_reconcile,
      has_function_privilege('authenticated', 'public.reconcile_attachment_metadata_for_owner(uuid)', 'execute') as authenticated_reconcile,
      has_function_privilege('service_role', 'public.reconcile_attachment_metadata_for_owner(uuid)', 'execute') as service_reconcile;
  `)[0];
  check(
    'serviceOnlyHelperGrantsRestricted',
    grantRows &&
      !grantRows.public_record &&
      !grantRows.anon_record &&
      !grantRows.anon_reserve &&
      !grantRows.authenticated_reserve &&
      !grantRows.anon_reconcile &&
      !grantRows.authenticated_reconcile &&
      grantRows.service_reconcile,
  );

  const bucket = runLinkedSql(
    `select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'vehicle-attachments';`,
  )[0];
  check(
    'privateBucketConfiguration',
    bucket &&
      bucket.public === false &&
      Number(bucket.file_size_limit) === maxFileBytes &&
      JSON.stringify(bucket.allowed_mime_types) ===
        JSON.stringify(['application/pdf', 'image/jpeg', 'image/png']),
  );

  phase = 'storage-authorization';
  const uploadB = await invokeUpload({
    url,
    anonKey,
    token: sessionB.access_token,
    vehicleId: vehicleBId,
    bytes: pdf,
    mimeType: 'application/pdf',
  });
  if (!uploadB.ok || !uploadB.path) throw new Error('Synthetic Storage isolation upload failed.');
  const documentWithPath = await clientB.rpc('save_vehicle_document_consistent', {
    p_id: null,
    p_vehicle_id: vehicleBId,
    p_document_type: 'custom',
    p_title: 'Synthetic attachment',
    p_document_number: null,
    p_issue_date: null,
    p_expiry_date: null,
    p_note: null,
    p_attachment_path: uploadB.path,
  });
  if (documentWithPath.error) throw new Error('Synthetic attachment metadata setup failed.');
  const pathPattern = new RegExp(`^${userB.id}/${vehicleBId}/[0-9a-f-]{36}\\.pdf$`, 'i');
  check(
    'ownerScopedRandomPiiFreePath',
    pathPattern.test(uploadB.path) &&
      !uploadB.path.includes('@') &&
      !/qa|synthetic/i.test(uploadB.path),
  );
  const foreignDownload = await clientA.storage.from(bucketName).download(uploadB.path);
  const foreignSigned = await clientA.storage.from(bucketName).createSignedUrl(uploadB.path, 60);
  const foreignList = await clientA.storage
    .from(bucketName)
    .list(`${userB.id}/${vehicleBId}`, { limit: 100 });
  const foreignOverwrite = await clientA.storage
    .from(bucketName)
    .upload(uploadB.path, pdf, { contentType: 'application/pdf', upsert: true });
  const foreignRemove = await clientA.storage.from(bucketName).remove([uploadB.path]);
  const ownerStillDownloads = await clientB.storage.from(bucketName).download(uploadB.path);
  check(
    'crossUserStorageDenied',
    Boolean(foreignDownload.error) &&
      Boolean(foreignSigned.error) &&
      (!foreignList.error ? foreignList.data.length === 0 : true) &&
      Boolean(foreignOverwrite.error) &&
      !foreignRemove.error &&
      !ownerStillDownloads.error,
  );
  const directOwnPath = `${userA.id}/${vehicleAId}/${randomUUID()}.pdf`;
  const directForeignPath = `${userB.id}/${vehicleBId}/${randomUUID()}.pdf`;
  const directOwn = await clientA.storage
    .from(bucketName)
    .upload(directOwnPath, pdf, { contentType: 'application/pdf' });
  const directForeign = await clientA.storage
    .from(bucketName)
    .upload(directForeignPath, pdf, { contentType: 'application/pdf' });
  check(
    'unreservedAndForeignDirectUploadDenied',
    Boolean(directOwn.error) && Boolean(directForeign.error),
  );
  const publicFetch = await timedFetch(
    `${url}/storage/v1/object/public/${bucketName}/${uploadB.path}`,
    { redirect: 'manual' },
    15_000,
  );
  check('publicUrlRejected', !publicFetch.ok);
  const signed = await clientB.storage.from(bucketName).createSignedUrl(uploadB.path, 60);
  if (signed.error || !signed.data?.signedUrl)
    throw new Error('Synthetic signed URL setup failed.');
  expiryUrl = signed.data.signedUrl;
  expiryCreatedAt = Date.now();
  check(
    'signedUrlImmediateAccess',
    (await timedFetch(expiryUrl, { redirect: 'manual' }, 15_000)).ok,
  );

  phase = 'webp-rejection';
  const webpResult = await invokeUpload({
    url,
    anonKey,
    token: sessionA.access_token,
    vehicleId: vehicleAId,
    bytes: webp,
    mimeType: 'image/webp',
  });
  phase = 'spoofed-mime-rejection';
  const spoofResult = await invokeUpload({
    url,
    anonKey,
    token: sessionA.access_token,
    vehicleId: vehicleAId,
    bytes: pdf,
    mimeType: 'image/jpeg',
  });
  phase = 'oversized-file-rejection';
  const overResult = await invokeUpload({
    url,
    anonKey,
    token: sessionA.access_token,
    vehicleId: vehicleAId,
    bytes: pdf,
    mimeType: 'application/pdf',
    declaredSize: maxFileBytes + 1,
  });
  check(
    'webpRejected',
    webpResult.status === 400 && webpResult.code === 'ATTACHMENT_TYPE_NOT_ALLOWED',
  );
  check(
    'spoofedMimeRejected',
    spoofResult.status === 400 && spoofResult.code === 'ATTACHMENT_CONTENT_MISMATCH',
  );
  check(
    'over5MbRejectedSafely',
    overResult.status === 413 && overResult.code === 'ATTACHMENT_FILE_TOO_LARGE',
  );

  phase = 'allowed-file-types';
  const allowed = [];
  for (const [mimeType, bytes] of [
    ['application/pdf', pdf],
    ['image/jpeg', jpeg],
    ['image/png', png],
  ]) {
    const upload = await invokeUpload({
      url,
      anonKey,
      token: sessionA.access_token,
      vehicleId: vehicleAId,
      bytes,
      mimeType,
    });
    if (upload.ok && upload.path) allowed.push(upload.path);
  }
  check('pdfJpegPngAccepted', allowed.length === 3);
  await clientA.storage.from(bucketName).remove(allowed);

  phase = 'single-file-limit';
  const exactLimitRequestId = randomUUID();
  const exactLimitReservation = runLinkedSql(`
    select reservation_status
    from public.reserve_attachment_upload(
      ${sqlLiteral(userA.id)}::uuid,
      ${sqlLiteral(vehicleAId)}::uuid,
      ${maxFileBytes}::bigint,
      'application/pdf',
      ${sqlLiteral(exactLimitRequestId)}::uuid
    );
  `)[0];
  check('exact5MbAccepted', exactLimitReservation?.reservation_status === 'reserved');
  runLinkedSql(`
    delete from public.attachment_upload_reservations
    where owner_id = ${sqlLiteral(userA.id)}::uuid
      and request_id = ${sqlLiteral(exactLimitRequestId)}::uuid;
  `);

  phase = 'document-count-quota';
  const countPaths = [];
  for (let index = 0; index < 10; index += 1) {
    const upload = await invokeUpload({
      url,
      anonKey,
      token: sessionA.access_token,
      vehicleId: vehicleAId,
      bytes: png,
      mimeType: 'image/png',
    });
    if (upload.ok && upload.path) countPaths.push(upload.path);
  }
  const eleventh = await invokeUpload({
    url,
    anonKey,
    token: sessionA.access_token,
    vehicleId: vehicleAId,
    bytes: png,
    mimeType: 'image/png',
  });
  check('tenthDocumentAccepted', countPaths.length === 10);
  check(
    'eleventhDocumentRejected',
    eleventh.status === 400 && eleventh.code === 'ATTACHMENT_COUNT_QUOTA_EXCEEDED',
  );
  await clientA.storage.from(bucketName).remove([countPaths.pop()]);
  const afterDelete = await invokeUpload({
    url,
    anonKey,
    token: sessionA.access_token,
    vehicleId: vehicleAId,
    bytes: png,
    mimeType: 'image/png',
  });
  check('deletedDocumentReleasesQuota', afterDelete.ok && Boolean(afterDelete.path));
  await clientA.storage
    .from(bucketName)
    .remove([...countPaths, ...(afterDelete.path ? [afterDelete.path] : [])]);

  phase = 'total-byte-quota';
  const quotaRequestIds = [];
  for (let index = 0; index < totalQuotaBytes / maxFileBytes; index += 1) {
    const requestId = randomUUID();
    const reservation = runLinkedSql(`
      select reservation_status
      from public.reserve_attachment_upload(
        ${sqlLiteral(userA.id)}::uuid,
        ${sqlLiteral(vehicleAId)}::uuid,
        ${maxFileBytes}::bigint,
        'application/pdf',
        ${sqlLiteral(requestId)}::uuid
      );
    `)[0];
    if (reservation?.reservation_status === 'reserved') quotaRequestIds.push(requestId);
  }
  const overQuota = await invokeUpload({
    url,
    anonKey,
    token: sessionA.access_token,
    vehicleId: vehicleAId,
    bytes: png,
    mimeType: 'image/png',
  });
  check('exact25MbAccepted', quotaRequestIds.length === 5);
  check(
    'over25MbRejected',
    overQuota.status === 400 && overQuota.code === 'ATTACHMENT_BYTES_QUOTA_EXCEEDED',
  );
  runLinkedSql(`
    delete from public.attachment_upload_reservations
    where owner_id = ${sqlLiteral(userA.id)}::uuid
      and request_id = any(array[${quotaRequestIds.map(sqlLiteral).join(',')}]::uuid[]);
  `);

  phase = 'idempotent-retry';
  const retryId = randomUUID();
  const firstRetry = await invokeUpload({
    url,
    anonKey,
    token: sessionA.access_token,
    vehicleId: vehicleAId,
    bytes: pdf,
    mimeType: 'application/pdf',
    requestId: retryId,
  });
  const secondRetry = await invokeUpload({
    url,
    anonKey,
    token: sessionA.access_token,
    vehicleId: vehicleAId,
    bytes: pdf,
    mimeType: 'application/pdf',
    requestId: retryId,
  });
  const duplicateCount = runLinkedSql(
    `select count(*)::integer as count from storage.objects where bucket_id = 'vehicle-attachments' and name = ${sqlLiteral(firstRetry.path ?? 'missing')};`,
  )[0]?.count;
  check(
    'idempotentUploadRetry',
    firstRetry.ok && secondRetry.ok && firstRetry.path === secondRetry.path && duplicateCount === 1,
  );
  if (firstRetry.path) await clientA.storage.from(bucketName).remove([firstRetry.path]);

  phase = 'destructive-actions';
  const recordA = await clientA
    .from('vehicle_records')
    .insert({
      owner_id: userA.id,
      vehicle_id: vehicleAId,
      record_type: 'expense',
      category: 'Synthetic clear',
      amount: 1,
      record_date: '2026-08-02',
    })
    .select('id')
    .single();
  const reminderA = await clientA
    .from('reminders')
    .insert({
      owner_id: userA.id,
      vehicle_id: vehicleAId,
      title: 'Synthetic clear',
      reminder_type: 'custom',
      due_date: '2026-08-20',
      notification_status: 'scheduled',
      notification_id: 'task013-clear',
    })
    .select('id')
    .single();
  if (recordA.error || reminderA.error)
    throw new Error('Synthetic destructive fixture setup failed.');
  const clearRecords = await clientA
    .from('vehicle_records')
    .delete()
    .eq('vehicle_id', vehicleAId)
    .select('id');
  const clearReminders = await clientA
    .from('reminders')
    .delete()
    .eq('vehicle_id', vehicleAId)
    .select('id');
  check(
    'deleteAllRecordsOwnerScoped',
    !clearRecords.error &&
      clearRecords.data.length === 1 &&
      (await rowExists(clientA, 'vehicles', vehicleAId)) &&
      (await clientB.from('vehicle_records').select('id').eq('vehicle_id', vehicleBId)).data
        .length === 3,
  );
  check(
    'deleteAllRemindersOwnerScoped',
    !clearReminders.error &&
      clearReminders.data.length === 1 &&
      (await clientB.from('reminders').select('id').eq('vehicle_id', vehicleBId)).data.length === 1,
  );

  const vehicleDeleteUpload = await invokeUpload({
    url,
    anonKey,
    token: sessionA.access_token,
    vehicleId: vehicleAId,
    bytes: pdf,
    mimeType: 'application/pdf',
  });
  if (!vehicleDeleteUpload.ok || !vehicleDeleteUpload.path)
    throw new Error('Vehicle deletion attachment setup failed.');
  const vehicleDeleteDocument = await clientA.rpc('save_vehicle_document_consistent', {
    p_id: null,
    p_vehicle_id: vehicleAId,
    p_document_type: 'custom',
    p_title: 'Synthetic cascade',
    p_document_number: null,
    p_issue_date: null,
    p_expiry_date: null,
    p_note: null,
    p_attachment_path: vehicleDeleteUpload.path,
  });
  if (vehicleDeleteDocument.error) throw new Error('Vehicle deletion metadata setup failed.');
  const deleteVehicle = await clientA.rpc('delete_vehicle_consistent', {
    p_vehicle_id: vehicleAId,
  });
  const reconciled = await invokeReconcile({ url, anonKey, token: sessionA.access_token });
  const deletedVehicleRead = await clientA.from('vehicles').select('id').eq('id', vehicleAId);
  const deletedVehicleObject = await clientA.storage
    .from(bucketName)
    .download(vehicleDeleteUpload.path);
  check(
    'deleteAllVehicleDataOwnerScoped',
    !deleteVehicle.error &&
      deleteVehicle.data === true &&
      reconciled &&
      deletedVehicleRead.data.length === 0 &&
      Boolean(deletedVehicleObject.error) &&
      (await rowExists(clientB, 'vehicles', vehicleBId)),
  );

  phase = 'account-deletion';
  const accountVehicle = await clientA
    .from('vehicles')
    .insert({
      owner_id: userA.id,
      brand: 'QA-A2',
      model: 'Account',
      current_km: 1,
      fuel_type: 'gasoline',
      body_type: 'sedan_hatchback',
    })
    .select('id')
    .single();
  if (accountVehicle.error) throw new Error('Account deletion vehicle setup failed.');
  vehicleAId = accountVehicle.data.id;
  await clientA.from('vehicle_notes').insert({
    owner_id: userA.id,
    vehicle_id: vehicleAId,
    title: 'Synthetic account',
    content: 'Synthetic account deletion content',
  });
  const accountUpload = await invokeUpload({
    url,
    anonKey,
    token: sessionA.access_token,
    vehicleId: vehicleAId,
    bytes: pdf,
    mimeType: 'application/pdf',
  });
  if (!accountUpload.ok || !accountUpload.path)
    throw new Error('Account deletion upload setup failed.');
  const accountDocument = await clientA.rpc('save_vehicle_document_consistent', {
    p_id: null,
    p_vehicle_id: vehicleAId,
    p_document_type: 'custom',
    p_title: 'Synthetic account',
    p_document_number: null,
    p_issue_date: null,
    p_expiry_date: null,
    p_note: null,
    p_attachment_path: accountUpload.path,
  });
  const accountSigned = await clientA.storage
    .from(bucketName)
    .createSignedUrl(accountUpload.path, 60);
  if (accountDocument.error || accountSigned.error || !accountSigned.data?.signedUrl)
    throw new Error('Account deletion metadata setup failed.');
  const accountDeleted = await invokeDeleteAccount({ url, anonKey, token: sessionA.access_token });
  const deletedCounts = runLinkedSql(`
    select
      (select count(*) from auth.users where id = ${sqlLiteral(userA.id)}::uuid)::integer as auth_count,
      (select count(*) from public.vehicles where owner_id = ${sqlLiteral(userA.id)}::uuid)::integer as vehicle_count,
      (select count(*) from public.vehicle_notes where owner_id = ${sqlLiteral(userA.id)}::uuid)::integer as note_count,
      (select count(*) from public.vehicle_documents where owner_id = ${sqlLiteral(userA.id)}::uuid)::integer as document_count,
      (select count(*) from storage.objects where bucket_id = 'vehicle-attachments' and name like ${sqlLiteral(`${userA.id}/%`)})::integer as storage_count;
  `)[0];
  const oldSessionUser = await clientA.auth.getUser(sessionA.access_token);
  const oldSessionRead = await clientA.from('vehicles').select('id').eq('owner_id', userA.id);
  const oldAccountUrlFetch = await timedFetch(
    accountSigned.data.signedUrl,
    { redirect: 'manual' },
    15_000,
  );
  check(
    'accountDeletionRemovesAuthDbStorage',
    accountDeleted &&
      deletedCounts.auth_count === 0 &&
      deletedCounts.vehicle_count === 0 &&
      deletedCounts.note_count === 0 &&
      deletedCounts.document_count === 0 &&
      deletedCounts.storage_count === 0,
  );
  check(
    'oldSessionAndSignedUrlRejected',
    Boolean(oldSessionUser.error) &&
      (Boolean(oldSessionRead.error) || oldSessionRead.data.length === 0) &&
      !oldAccountUrlFetch.ok,
  );

  await createSyntheticUser(replacementUserId, userA.email, userA.password);
  const replacementClient = publicClient(url, anonKey);
  await signIn(replacementClient, userA.email, userA.password);
  const replacementRows = await replacementClient.from('vehicles').select('id');
  check(
    'sameEmailNewAccountSeesNoOldData',
    !replacementRows.error && replacementRows.data.length === 0,
  );
  await replacementClient.auth.signOut({ scope: 'local' });

  phase = 'signed-url-expiry';
  const elapsed = Date.now() - expiryCreatedAt;
  if (elapsed < 65_000)
    await new Promise((resolveWait) => setTimeout(resolveWait, 65_000 - elapsed));
  check(
    'signedUrlExpiresAfterApproximately60Seconds',
    expiryUrl && !(await timedFetch(expiryUrl, { redirect: 'manual' }, 15_000)).ok,
  );
} catch (error) {
  failure = `${phase}: ${error instanceof Error ? error.message : 'Unexpected TASK-013 failure.'}`;
} finally {
  try {
    if (sessionA) await removeOwnerPaths(clientA, userA.id);
    if (sessionB) await removeOwnerPaths(clientB, userB.id);
  } catch {
    failure ??= 'Synthetic Storage cleanup failed.';
  }
  await clientA.auth.signOut({ scope: 'local' }).catch(() => undefined);
  await clientB.auth.signOut({ scope: 'local' }).catch(() => undefined);
  try {
    runLinkedSql(`
      delete from auth.users where
        (id = ${sqlLiteral(userA.id)}::uuid and email = ${sqlLiteral(userA.email)}) or
        (id = ${sqlLiteral(userB.id)}::uuid and email = ${sqlLiteral(userB.email)}) or
        (id = ${sqlLiteral(replacementUserId)}::uuid and email = ${sqlLiteral(userA.email)});
    `);
    const remaining = runLinkedSql(`
      select
        (select count(*) from auth.users where id in (${sqlLiteral(userA.id)}::uuid, ${sqlLiteral(userB.id)}::uuid, ${sqlLiteral(replacementUserId)}::uuid))::integer as auth_count,
        (select count(*) from public.vehicles where owner_id in (${sqlLiteral(userA.id)}::uuid, ${sqlLiteral(userB.id)}::uuid, ${sqlLiteral(replacementUserId)}::uuid))::integer as database_count,
        (select count(*) from storage.objects where bucket_id = 'vehicle-attachments' and (name like ${sqlLiteral(`${userA.id}/%`)} or name like ${sqlLiteral(`${userB.id}/%`)} or name like ${sqlLiteral(`${replacementUserId}/%`)}))::integer as storage_count;
    `)[0];
    cleanup.auth = remaining.auth_count === 0;
    cleanup.database = remaining.database_count === 0;
    cleanup.storage = remaining.storage_count === 0;
  } catch {
    failure ??= 'Synthetic cleanup verification failed.';
  }
}

const failedChecks = Object.entries(results)
  .filter(([, value]) => value !== true)
  .map(([name]) => name);
console.log(
  JSON.stringify({ projectRef, tests: results, failedChecks, cleanup, failure }, null, 2),
);
if (failure || failedChecks.length > 0 || Object.values(cleanup).some((value) => value !== true))
  process.exitCode = 1;
