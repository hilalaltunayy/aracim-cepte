# PLAN — TASK-040 — Physical Android QA batch

## Goal

Implement every requirement recorded in `docs/qa/physical-android/` as one traceable, secure correction pass without changing app identity or producing a new Android artifact.

## Background

The current Free preview build exposed production-quality gaps across onboarding, vehicle 3D, OCR review and parsing, maintenance packages, reminders, vehicle-photo Storage, AI discoverability/quota and Premium discoverability. QA-012 is the no-regression contract.

## Current state

- All Markdown files in `docs/qa/physical-android/` were read completely before source edits.
- Work started from `develop` commit `17cb5b4` on `feature/physical-android-qa-batch`.
- The cuboid-only renderer has been replaced by seven reusable low-poly body families covering all 14 supported body types.
- `docs/bugs/` and `docs/qa/physical-android/` are pre-existing untracked user files and remain preserved and unstaged.
- The remote photo-upload function was confirmed stale (generic reservation response without `attachmentId`) and was safely advanced to the repository implementation; the Free AI quota helper was advanced to 1 while Premium remains 50.

## Scope

- QA-001 onboarding typography and one-time reduced-motion-aware entrance.
- QA-002 optimized body-family 3D models and reliable orbit/pinch gestures.
- QA-003 localized Free vehicle-limit feedback and calm Premium path.
- QA-004/006/008 workflow-specific OCR parsing, preprocessing and editable partial review.
- QA-005 custom maintenance-package operations.
- QA-007 vehicle photo Storage/RPC/RLS/path diagnosis and safe fix.
- QA-009 reminder automatic-title synchronization.
- QA-010 persistent assistant entry, polished ASK→RESPONSE surface, contextual greeting and Free quota 1/month.
- QA-011 Premium/paywall discoverability using existing trusted billing architecture.
- QA-012 regression preservation.
- Focused tests, traceability documentation and safe remote Supabase verification/change only when required.

## Out of scope

- APK/AAB creation, package/signing/version changes, insecure Premium toggles, broad redesign, unrelated refactors, disabling RLS, public Storage, provider production activation, or invented OCR/AI data.

## Acceptance criteria

- Each QA file maps to implemented code/tests or an explicit verified blocker.
- All 14 body types map to credible reusable 3D body families; demand rendering and bounded gestures remain.
- OCR workflows return editable partial results and never auto-save or invent values.
- Vehicle photo upload works at 0/1 with owner isolation and server-authoritative limits.
- Free AI quota is exactly 1 successful answer/month across domain, UI and database; Premium stays at its configured value.
- QA-012 keep-as-is behaviors pass focused regression tests.
- Targeted tests, changed-file ESLint, scoped TypeScript and `git diff --check` pass or failures are reported distinctly.

## QA traceability

| QA file | Implemented evidence | Validation evidence |
| --- | --- | --- |
| QA-001 | Staged, reduced-motion-aware onboarding entrance and one-time wheel movement | changed-file lint/type analysis; no loop/timer source review |
| QA-002 | Seven procedural low-poly body families cover all 14 types; demand rendering, disposal, orbit/pinch and scroll arbitration | `bodyFamilies`, `orbit`, `Sedan3DScene`, `Vehicle3DRegion` tests |
| QA-003 | Corrupted Turkish limit/switcher copy repaired; calm Premium CTA added | entitlement/multi-vehicle and switcher render tests |
| QA-004 | Fuel OCR preprocessing, total/litre/unit/station/date plus optional metadata; direct edit/clear and partial transfer | fuel OCR parser/review tests |
| QA-005 | Custom maintenance operations can be added, removed, selected and persisted in packages | maintenance package/domain/component tests |
| QA-006 | Maintenance OCR supports service/date/document, multiple editable line items, quantity/unit/line totals, parts/labor/grand totals | maintenance OCR parser/review tests |
| QA-007 | Stale remote upload contract replaced with parent-aware reservation and attachment metadata response | client contract test, Edge shared tests, unauthenticated remote 401 probe |
| QA-008 | Supported document OCR rules expanded with partial editable transfer; only normalized form fields cross the review boundary | document parser/provider/service/review tests |
| QA-009 | Automatic reminder title follows type while an explicitly edited title is preserved | `reminderTitle.test.ts` plus reminder regression suite |
| QA-010 | Persistent circular Home assistant entry, contextual greeting, polished ASK→RESPONSE, evidence/suggestions and Free 1 quota | assistant UI/domain tests, SQL fixture, Edge handler tests |
| QA-011 | Premium entry/limit CTAs route into the existing RevenueCat-backed paywall; no client self-upgrade | billing/paywall and entitlement regression tests |
| QA-012 | Existing maintenance details, body selector, Free report gate, reminder validation/09:00 and gallery/attachment behavior retained | 102-test regression group plus report tests |

## Risks

- **High:** Remote schema drift could break photo/quota behavior. Mitigation: read-only inventory first, additive forward migration only, verify RLS/grants and negative access.
- **Medium:** 3D complexity or gesture capture could reduce Android stability. Mitigation: low-poly reusable geometry, demand rendering, disposal, bounded interactions and physical retest checklist.
- **Medium:** OCR parser breadth can create false positives. Mitigation: confidence-aware partial extraction, labeled patterns, editable review and no auto-save.
- **Medium:** Broad UI changes can regress established flows. Mitigation: reuse tokens/components and QA-012 tests.

## Security/privacy impact

Vehicle photo Storage and AI quota cross trusted server boundaries. Client ownership/plan claims remain untrusted; RLS and owner-scoped paths remain mandatory. OCR stays on-device. No raw tokens, OCR text, attachments or secrets may be logged. Premium state remains RevenueCat/Supabase authoritative.

## Relevant files

- `src/app/onboarding.tsx`, dashboard/tab routes, reminder and vehicle routes.
- `src/features/vehicle3d/*`, `src/features/vehicles/config/bodyTypes.ts`.
- `src/features/fuel/ocr/*`, `src/features/maintenance/ocr/*`, `src/features/documents/ocr/*`.
- `src/features/maintenance/components/MaintenanceOperationsField.tsx`, maintenance package domain/repository.
- Vehicle photo gallery/upload data services and related Supabase migrations/tests.
- `src/features/vehicleAssistant/*`, entitlement config/services, `supabase/functions/vehicle-ai-assistant/*` and quota migration/tests.
- Settings/paywall entry points and focused render/domain tests.

## Implementation steps

1. **Completed:** Read all QA Markdown and establish traceability/no-regression matrix.
2. **Completed:** Audit source architecture and remote Supabase state; identify the first failing photo-upload contract and authoritative AI quota path.
3. **Completed:** Implement shared/domain corrections for 3D, OCR, maintenance packages, reminders, quotas and upload security.
4. **Completed:** Implement scoped UI improvements for onboarding, assistant and Premium discoverability.
5. **Completed:** Apply and verify only the required additive remote Supabase migration and function revisions.
6. **Completed:** Add focused regression tests and run targeted/full relevant validation.
7. **Completed:** Review complete diff, security/privacy boundaries and completion evidence.

## Validation commands

- Exact targeted Vitest files selected from changed domains via `npx vitest run ...`.
- `npx eslint <changed files>`.
- `npx tsc --noEmit` or the repository scoped typecheck command, with unrelated existing errors separated.
- Supabase SQL/RLS fixtures relevant to photo and AI quota if schema changes.
- `git diff --check` and secret/diff inspection.
- No build/deploy command will be run.

## Manual checks

- Physical Android: onboarding startup/motion, 3D one-finger/pinch/scroll arbitration for every body family, camera/photo upload, OCR accuracy/review, assistant keyboard/transition, and legitimate RevenueCat test purchase path.

## Rollback strategy

Code changes remain isolated on the feature branch. Any remote database change must be additive and paired with a forward-recovery path; no user data or existing entitlement state will be deleted. User-owned untracked files remain untouched.

## Expected output

Traceable source/test/document changes, verified Supabase evidence, no APK/AAB, and a 12-section completion report matching the user request.

## Android Metro bundle follow-up (2026-09-02)

- **Completed:** Reproduced `npx expo export:embed --eager --platform android --dev false` and the exact `vite/dist/node/module-runner.js` dynamic-import failure.
- **Root cause:** Expo Router's eager `require.context` includes every TS/TSX file beneath `src/app`; misplaced `src/app/documents/index.test.tsx` imported Vitest, whose dependency graph imports Vite.
- **Completed:** Moved the unchanged document archive render test outside the route tree to `tests/routes/documentsArchive.render.test.tsx`, updated its route import and fixed its clock to make expiry assertions deterministic.
- **Passed:** Production Android embed export (2,234 modules), focused 3-test suite, changed-file ESLint and `git diff --check`.
- **Known existing diagnostics:** Full TypeScript still reports only the pre-existing auth email confirmation and legal-links render-test type errors.
- Every QA-batch runtime behavior remains unchanged; no EAS build was started.

## Do not change

Android package ID, signing, app identity/versioning, production keys, established QA-012 layouts/behaviors, private Storage, RLS ownership, existing Premium quota, or unrelated auth/legal worktree changes.

## Completion report

### Completed

- QA-001 through QA-012 are mapped to implementation and focused regression evidence.
- Two focused Vitest groups passed: 21 files/128 tests and 27 files/102 tests. Edge shared tests passed 40/40. Changed-file ESLint and `git diff --check` passed.
- Remote migration `20260901160000_free_ai_quota_one.sql` is present, database lint reports no errors, and the authoritative helper resolves Free 1/Premium 50 with a fixed empty search path.
- `upload-attachment` is active at version 6 and rejects unauthenticated requests; `vehicle-ai-assistant` is active but fails closed while provider/privacy enablement is absent.

### Skipped

- APK/AAB build (explicitly prohibited).
- Local SQL fixture execution because the Docker Desktop engine is unavailable; no destructive remote fixture was substituted.

### Failed

- Repository-wide `npm test` has five unrelated pre-existing/date-sensitive mock failures plus two existing malformed route-test suites; 582 tests still passed.
- Repository-wide TypeScript reports only existing auth/legal render-test diagnostics. No changed production source diagnostic was found.

### Manual verification required

- Physical Android acceptance for 3D gestures/rendering, OCR accuracy, camera/photo upload and UI motion.
- Authenticated photo upload could not be remotely exercised because no QA user credential is available to the local process.
- Legitimate Premium validation requires a Play-distributed RevenueCat-enabled build and Google Play license-test purchase after store/backend test configuration is complete.
