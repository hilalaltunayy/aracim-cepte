# TASK-049 — Release-critical multi-vehicle lifecycle closure

**Status:** ACTIVE
**Owner:** Codex
**Created:** 2026-09-07
**Updated:** 2026-09-07

## Task ID

TASK-049

## Goal

Close the remaining notification-routing, entitlement-loading, vehicle-deletion navigation, and
assistant-memory lifecycle gaps without changing the established multi-vehicle architecture.

## Current state

- Reminder schedules identify the reminder but omit its vehicle; notification taps resolve only
  against the currently loaded vehicle's reminders.
- The Add Vehicle screen and store use fail-closed Free limits while entitlement status is still
  `unknown`, which can render a definitive Free-limit message too early.
- Settings always opens `/vehicle/edit` after vehicle deletion, even when other vehicles remain.
- Vehicle Assistant sessions are memory-only and vehicle-keyed, but their existing reset/clear
  actions are not wired to auth loss or vehicle deletion.
- Commit `2da886a` is HEAD and contains the completed P0 stable-target write-safety work.
- TASK-046 and the pre-existing untracked audit/specification files are unrelated dirty work and
  must remain untouched.

## Scope

- Add `reminderId`, `vehicleId`, and an available vehicle display name to reminder notification
  payloads; switch to the owned target vehicle before routing a tap.
- Preserve identifier-based routing for notifications scheduled by older builds.
- Hold Add Vehicle in a verification state while entitlement is unresolved; retain Free=1 and
  Premium=3 once resolved, with the existing server RPC remaining authoritative.
- Route deletion to the Vehicle tab when vehicles remain and to Add Vehicle only at zero vehicles.
- Reset in-process assistant sessions on sign-out/session loss and clear only the deleted vehicle's
  session after a successful delete.
- Add focused regression tests, run release-proportional client validation, commit only scoped
  files, push the current branch, and verify the linked Supabase production state.

## Out of scope

- Multi-vehicle architecture redesign, Family, an all-vehicles reminder view, Reports/Assistant
  grounding changes, RLS/Storage/schema changes, RevenueCat redesign, or AAB generation.
- Edge Function or migration deployment unless this task actually changes one (none is planned).
- Restoration of historical Storage objects or modification of unrelated dirty files.

## Acceptance criteria

- [x] A notification for non-active Vehicle A selects A before opening its reminder.
- [x] Newly scheduled notification data contains reminder and vehicle identifiers.
- [x] Unresolved entitlement displays verification/loading rather than the Free limit.
- [x] Resolved Free and Premium limits remain one and three vehicles respectively.
- [x] Deleting an active vehicle selects a valid remaining vehicle and avoids Add Vehicle; deleting
      the last vehicle opens Add Vehicle.
- [x] Logout/session loss resets all assistant sessions; vehicle deletion clears only its session.
- [ ] TypeScript, Expo lint, focused/full Vitest, diff checks, and Android JS bundle export pass.
- [ ] Scoped commit contains `2da886a` in history and pushes to the existing GitHub remote.
- [x] Production link, migrations, required secrets, and four named Edge Functions are verified;
      no unrelated backend deployment occurs.

## Risks

- **Notification race (medium/high):** navigation could occur before the target bundle loads.
  Mitigation: await the existing `setActiveVehicle` action before routing.
- **Stale/deleted payload (low/medium):** a tap may name a vehicle no longer owned. Mitigation:
  resolve only against the bootstrapped owned vehicle list and fall back safely.
- **Entitlement ambiguity (medium/medium):** inactive RevenueCat data does not expose a reliable
  expired state through the canonical entitlement model. Mitigation: do not invent expiry state;
  show only canonical unknown/free/premium outcomes.
- **Delete reload failure (low/high):** backend deletion can succeed before refresh fails.
  Mitigation: clear the deleted vehicle's process-only assistant memory immediately after confirmed
  repository deletion; retain existing error/reload behavior.

## Security/privacy impact

- Notification data contains opaque reminder/vehicle IDs and an optional user-facing vehicle name;
  no secret, credential, service-role token, or additional backend authorization path is added.
- Notification routing trusts only vehicle IDs present in the authenticated user's bootstrapped
  vehicle list. Existing RLS/ownership and private Storage boundaries remain unchanged.
- Assistant data becomes shorter-lived on account/vehicle lifecycle events; no persistence is added.

## Relevant files

- `src/features/reminders/notifications.ts`, `notificationRouting.ts`, and focused tests.
- `src/app/_layout.tsx`: notification-response orchestration only.
- `src/features/vehicles/domain/multiVehicle.ts` and tests: entitlement/deletion decisions.
- `src/app/vehicle/edit.tsx`, `src/app/(tabs)/settings.tsx`: narrow UI gates/routes.
- `src/store/dataStore.ts`, `src/store/authStore.ts`: authoritative client lifecycle wiring.
- `src/features/vehicleAssistant/state/assistantSessionStore.ts`: existing actions, no persistence change.

## Implementation steps

1. **Completed:** inspect current branch, dirty work, source paths, models, and tests.
2. **Completed:** implement payload routing, resolved entitlement gate, deletion route, and
   assistant lifecycle wiring.
3. **Completed with recorded failures:** focused regressions, TypeScript, lint, diff check, and
   Android production JS bundle export passed. Full Vitest passed 150/154 files and 913/917 tests;
   four unrelated suites/tests remain red as recorded below.
4. **Completed:** review scoped/full diffs and security/privacy boundaries.
5. **Pending:** commit explicit scoped files, verify history, push current branch.
6. **Completed:** linked Supabase production project, 31/31 migration history, required secret
   names, and function metadata/source were verified read-only; no function source changed and no
   deployment was performed.

## Validation commands

```powershell
npx tsc --noEmit
npx expo lint
npx vitest run <focused test files>
npm test
git diff --check
$env:NODE_ENV='production'; npx expo export --platform android --output-dir <validated temp path>
git merge-base --is-ancestor 2da886a HEAD
npx supabase migration list --linked
```

## Manual checks

- [ ] On a real Android device, schedule Vehicle A's reminder, activate B, tap A's notification,
      and confirm A becomes active before the correct reminder opens.
- [ ] On a real Android device, verify notification edit/cancel/reschedule behavior remains intact.
- [ ] In Play/RevenueCat sandbox accounts, observe cold-start unknown, resolved Free, active Premium,
      and an actually expired subscription; the canonical model currently cannot distinguish an
      expired subscription from ordinary Free for a dedicated expiry message.

## Rollback strategy

Revert the single scoped Git commit. There is no migration, Edge Function deployment, schema/data
change, or persisted assistant state to roll back. Existing scheduled notifications without the new
payload retain the compatibility route.

## Expected output

A scoped commit and pushed branch, automated validation evidence, Supabase release-readiness
metadata, and an explicit AAB readiness decision without producing an AAB.

## Do not change

VehicleSwitcherSheet, Home/Vehicle switching, activeVehicleId design, plan limits, Reports scope,
Assistant grounding, Reminders scope, RLS/Storage/RevenueCat architecture, Family, migrations, Edge
Functions, billing products, unrelated application code, TASK-046, or pre-existing untracked files.

## Completion report

### Completed

- Focused regression run: 8 files / 44 tests passed.
- `npx tsc --noEmit`, `npx expo lint`, and `git diff --check` passed.
- Android production export passed (2,275 modules; 68 files; 21,527,066 bytes); temporary output
  was removed. No AAB or native build was run.
- Production project `eiqxvvnqkbzbhzpthcwo` is ACTIVE_HEALTHY in `eu-central-1`; 31 local/remote
  migrations match and both RevenueCat secret names exist (values were not read or printed).
- `vehicle-ai-assistant` ACTIVE v14 and `reconcile-attachments` ACTIVE v10 core deployed files are
  byte-identical to local. `sync-entitlement` ACTIVE v1 and `revenuecat-webhook` ACTIVE v5.

### Skipped

- AAB build, explicitly prohibited.
- Edge/shared tests and deployment: no Edge Function source changed in this task.

### Failed

- Full `npm test`: 150/154 files and 913/917 tests passed. Out-of-scope failures are the
  date-sensitive EPDK fixture (`current` expected, now `stale`), three shared SelectField tests with
  a missing `theme.layout` mock, and two route suites that fail during transform with
  `SyntaxError: Unexpected token 'typeof'` before collecting tests.

### Manual verification required

- Real-device notification tap and Play/RevenueCat lifecycle checks listed above.
- The unrelated full-suite failures require owner triage before a clean release gate can be claimed.
