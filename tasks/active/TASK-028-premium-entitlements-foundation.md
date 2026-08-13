# TASK-028 — Premium Entitlements Foundation

**Status:** IMPLEMENTED — AWAITING PR, MERGE AND ANDROID FREE-REGRESSION VERIFICATION
**Owner:** Codex
**Created:** 2026-08-13
**Updated:** 2026-08-13

## Goal

Create one typed Free/Premium entitlement foundation without adding billing, a paywall, or a
visible change to the current Free product.

## Current state

- TASK-027 is merged into `develop` through PR #14 at `f466de20913a2781d1ffa7e1e4cf6a64acf888fd`.
- The repository has no deployed entitlement table or billing provider. Existing users have no plan
  record and therefore resolve to Free.
- Attachment limits are centralized in `src/features/attachments/config/attachmentConfig.ts`; OCR
  calls already pass through feature-level services.

## Scope

- Central typed plan/capability configuration, safe resolution, minimal future integration points,
  tests and entitlement documentation.
- Existing users and all unresolved/malformed entitlement inputs resolve to Free.

## Out of scope

- Billing, RevenueCat, Play Billing, paywall/upsell UI, plan selector, multi-vehicle UI, quota
  counters/enforcement, data deletion, remote Supabase deploy, and any visual redesign.

## Acceptance criteria

- [ ] Free/Premium values are defined in one typed domain/config layer.
- [ ] Unknown, missing and failed plan resolution defaults to Free.
- [ ] Current UI has no visible Premium change and all current Free capabilities stay available.
- [ ] Future OCR/storage integrations have one documented, non-authoritative client boundary.
- [ ] Targeted tests, changed-file checks and `git diff --check` pass.

## Security/privacy requirements

- No client-controlled value can become production entitlement truth.
- No secret, billing credential, user-data plan mutation, RLS weakening or privileged client RPC is
  introduced. The client’s current resolution is a safe Free fallback only.

## Implementation plan

1. **Completed:** Confirm TASK-027 is merged and branch from current `origin/develop`.
2. **Completed:** Inspect current auth, vehicle, attachment, OCR and storage boundaries; add the
   centralized entitlement domain and minimal internal hooks.
3. **Completed:** Add narrow domain/integration tests, SQL/RLS test fixture and entitlement
   source-of-truth documentation.
4. **Completed:** Review diff, security/privacy surface and checks; commit, push, PR and normal merge
   to `develop` only if safe.

## Validation commands

```powershell
npm exec vitest run <TASK-028 targeted files>
npx eslint <changed source files>
npx tsc --noEmit --pretty false
git diff --check
```

## Manual verification required

- Android: existing Free vehicle, attachment and OCR flows remain visually and functionally
  unchanged; no Premium control, badge, paywall or lock is visible.

## Rollback

Revert the single feature commit. No persistent entitlement data, billing state or user data is
created by this task.

## Do not change

- `main`, release branches/tags, payment systems, existing screen design, live Supabase state,
  migration backlog, auth, RLS, Storage policies and current quota enforcement behavior.

## Completion report

### Completed

- Central Free/Premium capability model, fail-closed resolution and non-enforcing OCR/vehicle future
  hooks were added with no route or visible UI consumer.
- Additive `user_entitlements` migration provides owner-only reads and no authenticated writes;
  `private.effective_plan_for_user` is not client-callable.
- Targeted Vitest: 5 files / 39 tests passed. Changed-file ESLint and `git diff --check` passed.
- `supabase db lint --local` showed only three existing unused-variable warnings in record RPCs.
- The new migration plus `premium_entitlements.sql` passed in one local Postgres transaction; rollback
  confirmed that no `user_entitlements` table was left in the existing local database.

### Skipped

- Broad tests, coverage, EAS build, remote deploy/tests and billing: out of scope.
- Applying the pre-existing migration backlog to the local database: out of scope. The TASK-028 SQL
  fixture instead ran with the migration in one rolled-back transaction.

### Failed

- Full `tsc --noEmit` remains blocked only by known pre-existing auth/legal render-test errors; no
  TASK-028 type error was reported.

### Manual verification required

- Android: sign in as an existing Free user and verify vehicle, attachment and all OCR flows look and
  behave exactly as before, with no Premium control, badge, paywall or lock.
