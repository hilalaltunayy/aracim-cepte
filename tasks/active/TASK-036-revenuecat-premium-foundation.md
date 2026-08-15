# PLAN — TASK-036 — RevenueCat Premium Foundation

## Goal

Add a fail-closed RevenueCat purchase/paywall foundation that maps verified subscription events into the existing centralized Free/Premium capability model without changing the current tester environment.

## Background

TASK-028 provides typed capabilities and `public.user_entitlements`; later quota RPCs resolve that table server-side. RevenueCat is the purchase source, while the existing entitlement layer remains the capability source. A production freeze prohibits every remote Supabase, Edge, Play track, AAB and purchase-enablement action.

## Current state

`user_entitlements` is owner-readable and not client-writable. The app has no billing SDK, billing lifecycle, paywall, Offering loader, purchase restore flow or trusted RevenueCat webhook. Missing/invalid entitlement state already resolves to Free.

## Scope

- Install only `react-native-purchases` and isolate it behind a provider-neutral billing adapter.
- Add authenticated Supabase UUID identity synchronization and account-switch-safe billing state.
- Add a restrained native Premium screen using remote Offering/package metadata.
- Add a disabled-by-default purchase gate and mocked purchase/restore/error states.
- Add a local additive subscription/webhook-event migration and authenticated RevenueCat webhook Edge Function.
- Add targeted domain, store, UI, webhook and SQL/RLS tests plus deployment documentation.

## Out of scope

Remote migration/Edge deploy, RevenueCat dashboard changes, real keys/purchases, Play/App Store product creation, AAB/build/upload, tester-track changes, pricing decisions, Home redesign and unrelated entitlement-screen rewrites.

## Acceptance criteria

- Mobile code contains only optional public SDK keys; no secret/service-role/webhook credential.
- Supabase UUID is the RevenueCat App User ID; logout/account switch cannot leak the prior snapshot.
- Active `premium` CustomerInfo normalizes locally, but capabilities remain server-authoritative.
- Purchase unlock is accepted only after active entitlement verification; cancellation and failures stay non-destructive.
- Package prices come exclusively from Offering metadata and missing/disabled billing fails gracefully.
- Authenticated clients cannot write billing truth; webhook auth, idempotency and event ordering are tested.
- Expiration/downgrade deletes no user data and only changes future capability checks.
- No remote/store/build operation is performed.

## Risks

- Native SDK requires a later new development/release build; Expo Go preview cannot prove real purchases.
- Webhooks are at-least-once and may arrive out of order; database event IDs and provider timestamps must make processing idempotent.
- CustomerInfo is a useful device view but not a server authorization boundary; UI must not mutate entitlements directly.

## Security/privacy impact

RevenueCat receives only the stable Supabase UUID and store purchase metadata. Email and profile data are not used as App User ID. Webhook authorization remains backend-only, raw payloads are not persisted/logged, RLS remains enabled and client writes to subscription/entitlement state remain revoked.

## Relevant files

- `src/features/billing/**`: normalized contract, RevenueCat adapter/store and paywall.
- `src/app/premium.tsx`, `src/app/(tabs)/settings.tsx`, `src/app/_layout.tsx`: narrow route/session integration.
- `supabase/functions/revenuecat-webhook/**`: authenticated, sanitized webhook handler.
- `supabase/migrations/*revenuecat*`, `supabase/tests/revenuecat_billing.sql`: trusted state and negative fixtures.
- `docs/billing/revenuecat-premium-foundation.md`: architecture and post-freeze checklist.

## Implementation steps

1. **Completed:** Inspect current auth/entitlement/Edge/UI conventions and pin the Expo-compatible SDK.
2. **Completed:** Implement normalized billing domain, RevenueCat adapter, session lifecycle and tests.
3. **Completed:** Implement native paywall route, Offering/package/restore states and render tests.
4. **Completed:** Implement additive trusted sync migration, webhook handler and security fixtures.
5. **Completed:** Update deployment documentation, run targeted validation and inspect the complete diff.

## Validation commands

- `npx vitest run src/features/billing src/features/entitlements`
- `node --test supabase/functions/_shared/revenuecatWebhookHandler.test.mjs`
- local SQL/RLS fixture and `npx supabase db lint --local`
- changed-file ESLint, scoped TypeScript diagnostics and `git diff --check`

## Manual checks

- New native build + RevenueCat sandbox purchase/restore/account-switch checks after the freeze.
- Google Play license tester and App Store sandbox checks after products/Offering are configured.
- Physical Android paywall layout/accessibility acceptance.

## Rollback strategy

The feature is disabled by default. Revert mobile/Edge code and use a forward migration to revoke webhook RPCs; keep event IDs as a non-sensitive audit trail. Never delete user product data during downgrade or rollback.

## Expected output

A pushed feature branch and reviewed PR containing the billing adapter, Premium screen, local webhook sync foundation, tests and explicit deferred deployment checklist.

## Do not change

`main`, remote Supabase/RLS/RPC/Storage, production Edge Functions, Play/App Store tracks/products, current AAB/tester behavior, real credentials, current capability values and unrelated screens.

## Completion report

### Completed

- Installed `react-native-purchases` 10.7.1 without RevenueCat UI templates and isolated it behind a
  normalized billing provider/store.
- Added stable Supabase UUID identity, stale-account protection, remote Offering prices, verified
  purchase/restore states and a theme-consistent Settings paywall entry.
- Added disabled-by-default public mobile configuration plus a separately disabled trusted webhook,
  minimal idempotency ledger and service-role-only subscription sync RPC.
- Applied the forward migration to the local Supabase stack and passed billing/RLS, webhook, UI,
  identity and centralized-entitlement tests.
- Documented the native-build requirement and all deferred 25–26 August store/remote actions.

### Skipped

- Remote migration/RLS/RPC/Storage changes, Edge deployment, RevenueCat/store configuration, AAB,
  Play track and tester changes were skipped by the explicit production freeze.
- Deno CLI checking was unavailable locally; the pure webhook handler is covered by Node tests and
  the Edge entrypoint passed changed-file ESLint/scoped TypeScript diagnostics.

### Failed

- Repository-wide `tsc --noEmit` still reports only the known unrelated auth/legal render-test type
  errors. No TASK-036 source path reports a new TypeScript error.
- `npm audit --omit=dev` reports 25 existing Expo/React Native dependency-chain advisories
  (8 moderate, 17 high, 0 critical). `react-native-purchases` is classified high only through the
  existing `react-native` advisory; npm's suggested fix is a breaking SDK downgrade and was not
  applied in this scoped task.

### Manual verification required

- New native build, physical Android layout/accessibility, RevenueCat sandbox license purchase,
  cancellation/renewal/expiration, restore and interrupted-network acceptance after the freeze.
