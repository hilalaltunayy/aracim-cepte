# PLAN — TASK-035 — AI Vehicle Assistant Foundation

## Goal

Ship a production-shaped, fail-closed vehicle assistant flow in which the mobile client calls an
authenticated Supabase Edge Function, the backend builds a privacy-minimized TASK-034 context,
applies deterministic gates, enforces monthly usage and only then calls a replaceable provider.

## Current state

TASK-034 provides deterministic vehicle facts, signals and a compact assistant context contract.
TASK-031 provides the proven UTC-month reservation/commit/release quota pattern. There is no AI
Edge Function, AI quota persistence or assistant UI on `develop`.

## Scope

- Provider-neutral response/domain contract and Gemini Interactions API adapter.
- Authenticated, owner-scoped `vehicle-ai-assistant` Edge Function with fail-closed production gate.
- Additive AI usage reservation migration and negative SQL/RLS fixtures.
- Vehicle-scoped ASK → RESPONSE mobile screen and a compact vehicle-file entry point.
- Synthetic/mocked domain, provider, security/quota and render tests plus technical documentation.

## Out of scope

Real-user Free Tier calls, persisted chat history, Home redesign, EPDK/Places/Routing tools,
payments, OBD, admin tooling and remote migration deployment.

## Acceptance criteria

- No provider or service-role secret enters Expo code, logs, fixtures or responses.
- Auth and vehicle ownership are derived server-side; caller-supplied identity is ignored/rejected.
- Out-of-domain/live-only local responses and every provider failure consume zero quota.
- A validated useful response commits exactly one reservation; Free/Premium limits are 3/50.
- Context excludes plate, notes, OCR, attachments and unrelated PII; evidence IDs are allowlisted.
- Safety overrides win over model output and no unsupported definite diagnosis is returned.
- Production traffic remains disabled until both enablement and privacy approval are configured.

## Validation commands

- `npx vitest run src/features/vehicleAssistant src/features/entitlements/domain/entitlements.test.ts`
- `node --test supabase/functions/_shared/vehicleAssistant*.test.mjs`
- local Supabase reset / `supabase/tests/ai_vehicle_assistant_quota.sql` when Docker is available
- changed-file ESLint, scoped TypeScript diagnostic review and `git diff --check`

## Risks and rollback

The migration is additive and the feature is backend-disabled by default. Reverting the feature
commit removes the route/function; a forward migration can revoke AI RPCs and leave immutable usage
events for audit without deleting user product data.

## Manual verification required

- Physical Android layout and accessibility acceptance.
- Production privacy/legal approval and trusted Edge secrets before enabling Gemini traffic.
- Chronological remote migration and Edge deployment remain deferred.

## Completion report

### Completed

- Added the provider-neutral assistant contract, canonical evidence normalization, deterministic
  domain/live-data gates and safety override.
- Added the authenticated Edge orchestration, Gemini 3.6 Flash Interactions adapter and fail-closed
  production/privacy configuration gate.
- Added UTC monthly AI quota reservation/commit/release with Free 3 and Premium 50 limits, replay
  protection, owner checks and authenticated-only grants.
- Added the vehicle-scoped ASK → RESPONSE UI, evidence/suggestion rendering and quiet quota/error
  states without changing Home.
- Passed 48 Vitest checks (assistant, entitlement and TASK-034 regression), 18 isolated Edge tests,
  the AI SQL/RLS fixture, database lint, changed-file ESLint and `git diff --check`.

### Skipped

- No real Gemini request or real-user context was sent. Production traffic remains disabled.
- No remote migration, Edge deployment or Supabase project mutation was attempted.

### Failed

- Full chronological `supabase db reset` remains blocked before TASK-035 by the historical
  `20260728140259_harden_rls_auto_enable.sql` reference to unavailable `public.rls_auto_enable()`.
  TASK-035 prerequisites, migration and fixture were applied separately on the clean local schema
  and passed; this task did not rewrite old migration history.
- Repository-wide TypeScript still reports only the known unrelated auth/legal render-test errors;
  changed TASK-035 source has no diagnostic.

### Manual verification required

- Physical Android layout, keyboard, accessibility and network-cancellation acceptance.
- Privacy/legal approval, trusted production secrets, chronological remote migration and Edge
  deployment before enabling Gemini traffic.
