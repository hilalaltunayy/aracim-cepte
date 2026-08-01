import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const confirmation = 'ARACIM_CEPTE_QA';

function parseEnvFile(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator).trim();
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^(['"])(.*)\1$/, '$2');
        return [key, value];
      }),
  );
}

const root = resolve(import.meta.dirname, '..');
const envFile = parseEnvFile(await readFile(resolve(root, '.env'), 'utf8'));
const fixture = JSON.parse(await readFile(resolve(root, 'qa', 'seed-fixture.json'), 'utf8'));
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? envFile.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? envFile.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.QA_TEST_EMAIL;
const password = process.env.QA_TEST_PASSWORD;

if (process.env.QA_SEED_CONFIRM !== confirmation) {
  throw new Error(`QA_SEED_CONFIRM must exactly equal ${confirmation}.`);
}
if (!url || !anonKey) throw new Error('Supabase public URL/key are missing from .env.');
if (!email || !password) {
  throw new Error(
    'QA_TEST_EMAIL and QA_TEST_PASSWORD must be supplied in the terminal environment.',
  );
}

const client = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const { data: signIn, error: signInError } = await client.auth.signInWithPassword({
  email: email.trim().toLowerCase(),
  password,
});
if (signInError || !signIn.user) {
  throw new Error('QA user sign-in failed. Create/confirm a dedicated test user first.');
}

const ownerId = signIn.user.id;
const owned = (rows) => rows.map((row) => ({ ...row, owner_id: ownerId }));
const tables = [
  [
    'vehicles',
    fixture.vehicles.map((row, index) => ({
      ...row,
      owner_id: ownerId,
      archived_at: null,
      created_at: `2026-07-15T12:00:0${index}.000Z`,
      updated_at: '2026-07-15T12:00:00.000Z',
    })),
  ],
  ['vehicle_records', owned(fixture.records)],
  ['reminders', owned(fixture.reminders).map((row) => ({ ...row, notification_id: null }))],
  ['body_part_conditions', owned(fixture.bodyConditions)],
  ['expertise_reports', owned(fixture.expertiseReports)],
  ['vehicle_notes', owned(fixture.notes)],
  ['vehicle_documents', owned(fixture.documents)],
];

for (const [table, rows] of tables) {
  const { error } = await client.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`QA seed failed for ${table}: ${error.code ?? 'unknown'}`);
}

const { data: isolationA, error: isolationAError } = await client
  .from('vehicle_records')
  .select('vehicle_id')
  .eq('vehicle_id', fixture.vehicles[0].id);
const { data: isolationB, error: isolationBError } = await client
  .from('vehicle_records')
  .select('vehicle_id')
  .eq('vehicle_id', fixture.vehicles[1].id);
if (isolationAError || isolationBError) throw new Error('QA isolation verification query failed.');
if (
  isolationA.some((row) => row.vehicle_id !== fixture.vehicles[0].id) ||
  isolationB.some((row) => row.vehicle_id !== fixture.vehicles[1].id)
) {
  throw new Error('Vehicle-scoped QA isolation check failed.');
}

await client.auth.signOut({ scope: 'local' });
console.log(
  `QA seed ready: ${fixture.records.length} records, ${fixture.reminders.length} reminders, two explicitly labelled QA vehicles.`,
);
