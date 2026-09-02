# RevenueCat + Google Play Premium — Activation Runbook

**Status:** Code-side complete (REV-009). The steps below require Google Play
Console, RevenueCat dashboard and Supabase Edge secrets — external human actions.
Nothing here is performed automatically. Do not publish to production.

**As of:** 2026-09-02. Re-verify remote state before each step.

## Fixed identifiers (do not change)

- Android package: `com.hilalaltunay.aracimcepte`
- RevenueCat entitlement identifier: `premium` (source contract:
  `src/features/billing/services/RevenueCatBillingProvider.ts`)
- Purchase gate env: `EXPO_PUBLIC_REVENUECAT_PURCHASES_ENABLED`,
  `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` (public SDK key — not a secret, but
  still injected only via EAS env, never committed)
- Webhook RPC: `process_revenuecat_subscription_event` (service-role only)

## 1. Verify app / package identity

- Play Console app exists for `com.hilalaltunay.aracimcepte`.
- A RevenueCat-native build is uploaded to at least the internal/closed track
  (the historical `versionCode: 2` AAB predates the RevenueCat SDK — a new
  native build is required before any real purchase test).

## 2. RevenueCat project

- Create/confirm the RevenueCat project and add the Google Play app with the
  Play service-account credentials (Play Console → Setup → API access).
- Copy the **Android public SDK key** for step 6.

## 3. `premium` entitlement

- RevenueCat → Entitlements → create `premium` (exact lowercase).
- Attach the subscription products from step 5 to this entitlement.

## 4. Current Offering

- RevenueCat → Offerings → create the current Offering with two packages:
  - `$rc_monthly` → monthly base plan
  - `$rc_annual` → yearly base plan
- The app reads package metadata and `priceString` live; no price is hard-coded.

## 5. Google Play subscription products / base plans

- Play Console → Monetize → Subscriptions → create one subscription product
  (e.g. `aracimcepte_premium`) with two base plans:
  - `monthly` (P1M, auto-renewing)
  - `yearly` (P1Y, auto-renewing)
- Activate both base plans. Record the product id + base plan ids in RevenueCat
  product mapping.

## 6. Public SDK key + purchase gate (EAS)

- Set in the EAS build profile environment (preview + production):
  - `EXPO_PUBLIC_REVENUECAT_PURCHASES_ENABLED=true`
  - `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=<RevenueCat Android public key>`
- Without both, `getRevenueCatPublicConfig()` returns `enabled: false` and the
  paywall stays in its calm "not available" state (fail-closed).

## 7. Webhook secret + deploy (Supabase Edge)

- `supabase/functions/revenuecat-webhook` exists in source but is **NOT
  deployed** (confirmed absent from the remote function list at the
  2026-09-02 audit).
- Before deploy:
  1. `npx supabase link` to the verified production project, then
     `npx supabase functions list` to confirm the current inventory.
  2. Set the backend-only Edge Function secrets the handler reads
     (`supabase/functions/revenuecat-webhook/index.ts`):
     `REVENUECAT_WEBHOOK_ENABLED=true` and
     `REVENUECAT_WEBHOOK_AUTHORIZATION=<shared secret>`. Never place these in
     the mobile bundle, `EXPO_PUBLIC_*`, logs, fixtures or docs.
  3. Deploy only that function; re-run `functions list` to confirm.
- In RevenueCat → Integrations → Webhooks, point the webhook at the deployed
  function URL and set the same Authorization header value.
- Verify with a RevenueCat test event that a row lands in
  `billing_webhook_events` and `user_entitlements` is updated via
  `process_revenuecat_subscription_event`.

## 8. Apply the daily-quota migration

- `20260902120000_ai_daily_quota.sql` must be applied to the same verified
  project (`npx supabase db push` after `migration list` review). It is
  additive and forward-compatible.

## License tester steps (purchase / restore / account switch)

1. Play Console → Setup → License testing → add two Google accounts (A, B).
2. Install the RevenueCat-native build on a device signed in as account A.
3. **Purchase:** open Premium → select monthly → complete the test purchase →
   confirm `user_entitlements` shows `premium` for user A and the paywall shows
   "Premium hesabınız aktif".
4. **Restore:** clear app data / reinstall → sign in as the same Supabase user →
   "Satın alımları geri yükle" → Premium re-activates.
5. **Account-switch isolation:** sign out, sign in as a second Supabase user
   (still Google account A) → that user must remain Free; RevenueCat App User
   ID is the Supabase UUID, so entitlements never leak across users.
6. **Cancelled / pending:** cancel a test purchase mid-flow and confirm the calm
   "Satın alma iptal edildi" / pending messages; no entitlement is granted
   until the webhook confirms.

## Guardrails

- No client-only premium toggle. `getEntitlements()` fail-closes to Free unless
  a server `user_entitlements` record says otherwise.
- Downgrade never deletes vehicles, photos, attachments or reminders — it only
  blocks new over-limit actions.
- Do not run `eas build` / upload / rollout without an explicit instruction.
