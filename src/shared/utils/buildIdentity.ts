/**
 * Human-readable build identity for release diagnostics.
 *
 * A Play Console version code alone cannot prove which artifact a device is
 * actually running — the store can show a newer release while the device still
 * has the previous install. Surfacing the version code (and, when the build
 * injects one, a short build id) inside the app makes the device state
 * self-evident on sight.
 *
 * Contains no secret: only the public app version, the Android version code and
 * an optional short build identifier.
 */
export interface BuildIdentityInput {
  version?: string | null;
  versionCode?: number | string | null;
  buildId?: string | null;
}

/** Trimmed to a short, log-safe token; anything unexpected is dropped. */
function shortBuildId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || !/^[A-Za-z0-9._-]{1,40}$/.test(trimmed)) return null;
  return trimmed.slice(0, 12);
}

export function getBuildIdentity(input: BuildIdentityInput): string {
  const version = input.version?.trim() || '1.0.0';
  const versionCode =
    input.versionCode === null || input.versionCode === undefined || input.versionCode === ''
      ? null
      : String(input.versionCode);
  const buildId = shortBuildId(input.buildId);
  const inner = [versionCode, buildId].filter(Boolean).join(' · ');
  return inner ? `${version} (${inner})` : version;
}
