# PLAN — TASK-039 — EPDK Fuel Price Foundation

## Goal

Introduce a provider-independent, privacy-minimized fuel-price reference foundation. EPDK data is
always an estimated province/brand market reference, never a station-pump truth or a replacement
for receipt/manual fuel data.

## Scope

- Add normalized fuel-price contracts, EPDK XML adaptation, Turkish province/fuel/brand
  normalization, freshness/cache utilities and future alert/assistant boundaries.
- Integrate a subtle, explicitly estimated reference suggestion into the existing Smart Fuel form.
- Preserve total/litre/price deterministic calculation and receipt/manual precedence.
- Add fixture-based provider, normalization, precedence, freshness, integration and render tests.
- Document official source catalog references, legal/reuse gate, cache/freshness and future
  provider boundaries.

## Out of scope

- Remote EPDK traffic, deployed Edge Functions, database persistence/migration, GPS permission,
  station/route/Places lookup, alerts/monitoring, Smart Trips, AI tool activation, data overwrite,
  release builds and tester changes.

## Design decision

The existing Smart Fuel form remains the primary interaction. A compact reference card appears only
when a normalized price is supplied by a future approved lookup path; it labels the number as an
EPDK reference, explains that pump prices can differ, and offers an explicit use action. It does
not fetch on render, auto-save, or create an elevated price dashboard.

## Implementation steps

1. **Completed:** Inspect Smart Fuel, entitlement/feature-flag conventions and official EPDK source catalog.
2. **Completed:** Implemented isolated normalized contracts, EPDK parsing/normalization, bounded cache and explicit Smart Fuel suggestion behavior.
3. **Completed:** Added targeted fixture/render tests and technical decision documentation.
4. **In progress:** Complete the final scoped validation review, then commit, push, PR and safe merge to `develop`.

## Risks and mitigations

- Official XML schema/reuse terms can change: isolate parsing and keep production traffic disabled
  until a dated legal/operational review approves the endpoint, attribution and caching terms.
- A reference price might be mistaken for a receipt price: preserve `estimated` provenance in the
  form suggestion and require explicit user acceptance.
- Existing two-of-three Smart Fuel calculations could be changed unintentionally: keep calculation
  functions intact and test reference application only as a normal explicit price input.

## Security and privacy

The provider request contract accepts only province code/name, supported fuel type and optional
normalized brand. It carries no user identity, plate, notes, OCR text, attachments or vehicle
history. No secrets, Supabase schema/RLS/Storage, remote function or remote configuration are
changed.

## Validation

- EPDK fixture/parser and normalization tests
- Smart Fuel precedence/suggestion and render tests
- changed-file ESLint
- scoped TypeScript diagnostics
- `git diff --check`

## Manual verification required

- After the freeze and legal/reuse approval: trusted server/Edge cache path, source response
  compatibility, attribution/caching/rate-limit conditions and physical Android Smart Fuel layout.

## Rollback

The foundation is isolated, has no persisted data and ships with runtime lookup disabled. A normal
revert removes the UI/adapters without touching existing fuel records.

## Completion report

### Completed

- Implemented provider-independent normalized reference contracts, official EPDK XML source adapters,
  Turkish province/fuel/brand normalization, freshness and a bounded in-memory cache.
- Added a fail-closed Smart Fuel reference section: it has no enabled lookup path in this build and
  only applies an estimate after an explicit user action.
- Passed six targeted test files (32 tests), changed-file ESLint and `git diff --check`.

### Skipped

- No live EPDK traffic, remote deployment, Edge Function, migration, GPS permission, polling,
  alerts, AI tool activation, Smart Trips, Play build or tester-environment change.

### Failed

- No TASK-039 validation failed. Scoped TypeScript still reports the pre-existing auth/legal render
  test diagnostics outside this task's files.

### Manual verification required

- After the freeze and written legal/reuse approval, validate the live official response schema,
  trusted server/cache path, attribution/caching/rate-limit requirements and physical Android layout.
