# TASK-027 — Maintenance Invoice / Receipt OCR

**Status:** IMPLEMENTED — AWAITING PR, MERGE AND ANDROID OCR ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-11

## Goal

Use the existing on-device OCR provider to offer editable, transient maintenance invoice/receipt
suggestions inside the TASK-024 maintenance form without automatic persistence.

## Current state

- `MaintenanceDetailsSection` already owns service name, parts/labor cost, invoice number, notes and
  unified attachments; the record form separately owns amount and date.
- TASK-025B's `DocumentOcrProvider` recognizes local JPEG/PNG files on-device; raw text is transient.
- Maintenance detail attachments are persisted only through the existing normal save flow.

## Scope

- Conservative parser and review/apply UI for service name, date, invoice/receipt number, total,
  parts and labor.
- Existing image attachment selection, existing maintenance form values and TASK-024 total semantics.

## Out of scope

- Migration, separate invoice model, cloud/LLM OCR, automatic save, service-type inference,
  marketplace, fuel/document OCR redesign, premium, EAS/remote Supabase operations.

## Acceptance criteria

- OCR suggestions are editable/selectable and apply only to unsaved maintenance form state.
- Existing manual values are unselected by default and never overwritten silently.
- Parts + labor can derive a missing total through existing TASK-024 rules; no other charge is assumed.
- JPEG/PNG are supported; PDF/no-text/provider failures have safe manual fallback.
- Targeted parser, review, provider, TASK-024 and TASK-016 regression tests pass.

## Security/privacy impact

On-device OCR only. No new provider, secret, log, analytics, raw-text persistence, Storage policy or
database write path is introduced. The existing private attachment flow remains the only persistence
route for attachments.

## Implementation plan

1. **Completed:** Verify latest `origin/develop` contains TASK-024, TASK-025B and TASK-026; inspect
   maintenance form and OCR contracts.
2. **Completed:** Add maintenance receipt parser/service and transient review UI to the existing
   detail section and record form.
3. **Completed:** Run narrow tests/lint/type/diff checks and review privacy/security surface.
4. **In progress:** Update evidence, commit, push, PR review and normal merge only if safe.

## Validation commands

- Targeted Vitest for maintenance OCR/parser/review plus existing maintenance detail, on-device OCR
  and historical-odometer behavior.
- Changed-file ESLint, relevant TypeScript validation and `git diff --check`.

## Manual verification required

- On Android: select/capture a JPG/PNG maintenance receipt, explicitly scan, edit/deselect/apply,
  cancel, save normally, test no-text/partial/PDF fallback and verify no automatic save.

## Rollback

Revert the feature commit. No migration or transient OCR result is persisted, so no data recovery
step is required.

## Completion report

### Completed

- TASK-025B local OCR provider reused for user-initiated pending JPG/PNG maintenance attachments.
- Conservative parser suggests service name, labelled date, invoice/receipt number, total, parts and
  labor; it derives total only through existing TASK-024 breakdown logic when total is absent.
- Review panel is editable/selectable; `Forma aktar` creates only an unsaved maintenance form patch.
  Existing manual values are unselected by default.
- Targeted Vitest: 6 files / 29 tests passed on 2026-08-11. Changed-file ESLint and `git diff --check`
  passed. No migration or provider/dependency change.

### Security/privacy regression check

- No external provider, secret, raw OCR logging, analytics, migration, public storage or persistence
  path was introduced. The existing private attachment and normal maintenance save path remain intact.

### Skipped

- Broad suite, coverage, EAS build, remote Supabase deploy/tests and pending migration backlog: out of scope.

### Failed

- TASK-027 targeted checks have no failure. `npm run typecheck` remains blocked only by the known,
  pre-existing auth/legal render-test type errors; no TASK-027 source error was reported.

### Manual verification required

- Android device: select/capture a clear JPG/PNG invoice, scan, edit/deselect/apply, cancel, normal
  save, partial/no-text/PDF fallback and verify manual values are not silently overwritten.
