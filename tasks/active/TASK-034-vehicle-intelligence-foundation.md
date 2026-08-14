# PLAN — TASK-034 — Vehicle Intelligence Foundation

## Goal

Create a deterministic, owner- and vehicle-scoped intelligence snapshot that TASK-035 can consume
without adding AI, persistence or a Home redesign.

## Current state

The reports domain already provides period, cost, fuel and historical-odometer-safe distance
calculations. Documents, reminders, expertise and records are available through the active vehicle
bundle. No new table or remote Supabase change is required.

## Scope

- Typed facts, trends, signals, data-quality state and internal scores.
- A narrow, privacy-minimized TASK-035 context adapter.
- Domain tests and product documentation.

## Out of scope

LLMs, external providers, diagnoses, persisted signals, polling, UI changes, migrations and
changes to reports, reminders, OCR, quota, storage or Home.

## Acceptance criteria

- Every input is filtered by vehicle ID and contains no raw attachment/OCR content.
- Missing data remains unknown rather than receiving a zero health score.
- Existing report calculations are reused for fuel/cost/distance.
- Tests cover facts, signals, scores, context and TASK-016 odometer compatibility.

## Validation commands

- `npx vitest run src/features/vehicleIntelligence/domain/vehicleIntelligence.test.ts`
- `npx eslint src/features/vehicleIntelligence --ext .ts`
- `npx tsc --noEmit --pretty false` (known unrelated auth/legal errors may remain)
- `git diff --check`

## Risks and rollback

Incorrect interpretation is limited by typed facts, centralized thresholds and non-diagnostic
signals. This task has no persistence or migration; reverting the feature commit removes the pure
domain layer and documentation without affecting user data.

## Completion report

### Completed

- Added the pure vehicle intelligence model, centralized threshold/score configuration and
  TASK-035 context adapter.
- Added 20 intelligence-domain tests and ran the 15 reused reports-domain tests (35 passing).
- Confirmed no migration, Supabase access path, UI route or persistent signal store was needed.

### Skipped

- No physical Android visual check: TASK-034 changes no user-facing screen or native behavior.
- No remote Supabase deployment: no migration or remote state is part of this task.

### Failed

- Repository-wide `npx tsc --noEmit --pretty false` remains blocked only by the pre-existing
  auth/legal render-test diagnostics in `tests/routes`; TASK-034 source produced no diagnostic.

### Manual verification required

- Future TASK-035 should verify the consumer renders non-diagnostic language for every signal.
