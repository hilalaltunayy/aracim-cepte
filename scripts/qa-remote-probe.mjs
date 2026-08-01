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

const root = resolve(import.meta.dirname, '..');
const env = parseEnvFile(await readFile(resolve(root, '.env'), 'utf8'));
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error('Supabase public environment is missing.');

const client = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const probeEmail = `aracim-cepte-nonexistent-${Date.now()}@example.invalid`;

const settingsResponse = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: anonKey },
});
const settings = settingsResponse.ok ? await settingsResponse.json() : {};
const login = await client.auth.signInWithPassword({
  email: probeEmail,
  password: 'invalid-password-that-creates-no-user',
});
const signup = await client.auth.signUp({
  email: probeEmail,
  password: '123',
});
const reset = await client.auth.resetPasswordForEmail(probeEmail, {
  redirectTo: 'http://localhost:8082/auth/reset-password',
});
const anonymousRead = await client.from('vehicles').select('id').limit(1);
const unsigned = await client.storage
  .from('vehicle-attachments')
  .createSignedUrl('no-owner/file', 5);
const publicObjectResponse = await fetch(
  `${url}/storage/v1/object/public/vehicle-attachments/no-owner/file`,
  { redirect: 'manual' },
);

console.log(
  JSON.stringify(
    {
      remoteReachable: settingsResponse.ok,
      emailProviderEnabled: Boolean(settings.external?.email ?? settings.email),
      emailAutoconfirm: Boolean(settings.mailer_autoconfirm),
      invalidLoginRejected: Boolean(login.error && !login.data.session),
      weakSignupRejectedWithoutSession: Boolean(signup.error && !signup.data.session),
      passwordResetRequestAcceptedWithoutEnumeration: !reset.error,
      recoveryRedirectRoute: 'http://localhost:8082/auth/reset-password',
      anonymousTableAccessRejected:
        Boolean(anonymousRead.error) || (anonymousRead.data?.length ?? 0) === 0,
      unsignedPrivateObjectRejected: Boolean(unsigned.error),
      publicBucketObjectAccessRejected: !publicObjectResponse.ok,
      createdTestUser: false,
    },
    null,
    2,
  ),
);
