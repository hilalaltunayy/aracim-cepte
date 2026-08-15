# PLAN — TASK-038 — UI Polish & Premium Experience Pass

## Goal

Raise the execution quality of existing mobile surfaces through shared, restrained UI refinements while preserving Aracım Cepte's light-first aqua identity and current product architecture.

## Background

TASK-032B reports, TASK-035 assistant, TASK-036 billing and TASK-037 document archive provide the current high-value flows. The production/tester freeze allows only local application work and safe `develop` integration.

## Current state

- Shared `ui.tsx`, theme tokens and entity cards already provide the primary visual language.
- High-value routes reuse the existing `Screen`, `Card`, `AppButton`, modal, status and list primitives, but their polish states and row/card density vary by feature.
- This task has no approved data model, migration, remote, store or production configuration change.

## Scope

- Audit and refine shared visual primitives/tokens when one safe change benefits multiple screens.
- Polish visible Home, vehicle, history/records, document archive, reminder, reports, vehicle assistant, premium/paywall, settings and attachment/gallery presentation where existing components naturally support it.
- Add targeted semantic/render tests for changed shared and premium/AI unavailable/empty/loading/error states.
- Document the visual-system decisions and deferred physical acceptance.

## Out of scope

- Home information-architecture redesign, feature/data-model work, reports calculation/chart redesign, new billing/AI capability, database/migration/RLS/Storage changes, remote deployment, Play/tester changes, native builds and new dependencies.

## Acceptance criteria

- Shared spacing, typography, card/list, form, status, loading/error/empty, modal and button behavior remain coherent and accessible.
- High-value in-scope screens get only additive polish; Home structure remains intact.
- Free/Premium, AI/billing unavailable and legacy/missing-data states remain safe.
- No polling, hidden network work, timers or heavy visual dependency is introduced.
- Targeted render/domain tests, changed-file lint, scoped TypeScript diagnostics and `git diff --check` are recorded.

## Risks

- Broad shared-component changes may create visual regressions; mitigate with additive token usage, focused render tests and diff review.
- Physical Android behavior cannot be proven during the tester freeze; defer it explicitly.
- Existing auth/legal TypeScript render-test diagnostics are outside this scope and must not be masked.

## Security/privacy impact

No data access, credentials, RLS, Storage, provider configuration or remote environment changes. Existing AI/billing feature-gate/error behavior must remain fail-closed.

## Relevant files

- `src/shared/theme/index.ts`, `src/shared/theme/tokens.ts`, `src/shared/components/ui.tsx`, `src/shared/components/entityCards.tsx`
- selected existing Home, documents, reminders, reports, vehicle assistant, billing/paywall, settings, vehicle gallery and attachment components
- focused render tests and `docs/product/ui-polish-premium-experience.md`

## Implementation steps

1. **Completed:** Inspect shared tokens/components and high-value screens; list safe inconsistencies.
2. **Completed:** Apply bounded shared/component refinements and screen-level polish without changing workflows.
3. **Completed:** Add focused semantic/render coverage for changed states, inspect source-level responsiveness/performance, and update documentation.
4. **In progress:** Run targeted validation, inspect diff/security scope, commit, push, PR and safe merge to `develop`.

## Validation commands

- targeted Vitest files for changed shared components and affected routes
- changed-file ESLint
- `npx tsc --noEmit --pretty false` (record known unrelated diagnostics separately)
- `git diff --check`

## Manual checks

- Post-freeze physical Android review: Home, vehicle profile/switcher, reports charts/motion, assistant, paywall, reminder sheets, gallery, long lists, keyboard/form behavior and system/dark appearance.

## Rollback strategy

All changes are local UI/source changes with no persisted-data or remote-state impact. A normal revert of the feature merge restores prior rendering and behavior.

## Expected output

Polished shared UI behavior, bounded screen refinements, focused validation and a concise implementation/acceptance note.

## Do not change

`main`, Supabase schema/RLS/Storage, remote Edge Functions, Play configuration/builds, RevenueCat/Gemini production configuration, product limits, report calculation semantics and Home information architecture.

## Completion report

### Completed

- Consolidated shared layout measurements, compact touch-target sizing, modal surface treatment,
  low-motion press feedback, static loading placeholders, empty-state CTA support and retry target
  behavior without adding dependencies or changing data flows.
- Refined History filter density, Document metadata/attachment cues, Settings group dividers and
  Vehicle Assistant evidence progressive disclosure while preserving existing feature behavior.
- Added focused shared UI and document-card render coverage. Targeted validation passed: 12 Vitest
  files / 52 tests, changed-file ESLint and `git diff --check`.
- Completed source-level responsive/performance/security review: no new requests, subscriptions,
  polling, timers, persistence, credentials, migrations or remote configuration.

### Skipped

- Remote Supabase/Edge Function, Play/tester, RevenueCat production, Gemini production and native
  build work remain outside the task and frozen.
- Browser-based Expo visual preview was unavailable because the local preview could not be reached
  from the in-app browser; no further infrastructure debugging was performed.

### Failed

- Repository-wide TypeScript still reports the pre-existing auth/legal render-test diagnostics in
  `tests/routes/authEmailConfirmation.render.test.tsx` and `tests/routes/legalLinks.render.test.tsx`.
  No TASK-038 source diagnostic was introduced.

### Manual verification required

- Physical Android visual/performance acceptance after the freeze: Home, vehicle/switcher, report
  charts/motion, assistant, paywall, reminder sheets, gallery, long lists, keyboard/forms and
  system appearance.
