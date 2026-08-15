# RevenueCat Premium foundation

**Repository implementation date:** 2026-08-15

**Production status:** Disabled; local source and tests only

RevenueCat is the purchase/subscription source. Aracım Cepte's existing entitlement layer remains
the only capability source for vehicle, OCR, AI, attachment, Storage, gallery, report and reminder
limits. Screens must not read RevenueCat directly to decide feature access.

## Architecture and trust boundary

1. The authenticated Supabase user UUID becomes the RevenueCat App User ID. Email is not used.
2. `RevenueCatBillingProvider` isolates the native SDK and exposes normalized subscription and
   Offering/package values. Account changes clear local state before the next identity is loaded.
3. Store prices come only from RevenueCat package metadata; no product ID or price is hard-coded.
4. A successful SDK purchase is not a server authorization boundary. It is shown as verified by
   CustomerInfo while the trusted webhook synchronizes `public.user_entitlements`.
5. `revenuecat-webhook` authenticates a backend-only Authorization value, maps the stable UUID and
   calls the service-role-only `process_revenuecat_subscription_event` RPC.
6. The RPC keeps a minimal event-ID ledger for idempotency, ignores stale events and writes the
   central entitlement row. Raw webhook payloads are neither stored nor logged.

The RevenueCat entitlement identifier is `premium`. Missing, malformed, unavailable or expired
state fails Free. Cancellation keeps Premium until its known expiration. Billing uncertainty does
not destructively remove access before that expiration. Expiry restricts future Premium writes but
never deletes vehicles, photos, attachments or other user data.

## Keys and feature gates

Mobile configuration accepts only public platform SDK keys:

- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`

`EXPO_PUBLIC_REVENUECAT_PURCHASES_ENABLED=true` is additionally required. It is off by default.
Secret RevenueCat API keys, `REVENUECAT_WEBHOOK_AUTHORIZATION` and Supabase service-role credentials
remain trusted-backend-only values. Missing configuration leaves the app usable as Free and the
purchase action unavailable.

The webhook separately requires `REVENUECAT_WEBHOOK_ENABLED=true`; it also fails closed by default.
Neither gate is enabled in the current tester build.

## Paywall and Offering behavior

The native Aracım Cepte Premium screen uses current theme components and lists only implemented
benefits. It supports whichever monthly/annual packages exist in the remote current Offering,
shows store-formatted prices, verifies the active entitlement after purchase and provides a restore
action. Missing Offering, cancellation, network/provider failure and disabled billing use calm,
non-destructive states. The paywall is reached from Settings and is never forced at startup.

## Post-freeze deployment checklist

No item below was performed by TASK-036. Complete these in the planned 25–26 August deployment
window with a separate production approval:

### Supabase / RevenueCat

- Review and remotely apply `20260815143910_revenuecat_billing_foundation.sql` in chronological order.
- Configure the Edge Function secrets and deploy `revenuecat-webhook`.
- Configure RevenueCat entitlement `premium`, webhook Authorization and current Offering.
- Verify duplicate, out-of-order, cancellation, expiration, refund and billing-issue events in sandbox.

### Google Play

- Create subscriptions/base plans, activate them and connect product IDs to RevenueCat packages.
- Upload a new AAB containing the native RevenueCat SDK; the existing closed-test build cannot run it.
- Use a license tester for purchase, cancellation, renewal, expiration, account switch and restore.
- Update the current test track only after explicit freeze-release approval.

### App Store (later)

- Create subscription products, connect them to RevenueCat and validate with Sandbox/TestFlight.

Pricing remains a store/product decision and is intentionally absent from source. RevenueCat's
[Expo installation guide](https://www.revenuecat.com/docs/getting-started/installation/expo),
[identifying customers guide](https://www.revenuecat.com/docs/customers/identifying-customers) and
[webhook guide](https://www.revenuecat.com/docs/integrations/webhooks) are the configuration sources.

## Native and manual acceptance

`react-native-purchases` adds native code, so a new development/release build is required. Expo Go
or mocked render tests cannot accept real purchases. Physical Android paywall layout, accessibility,
license-test purchase/restore and interrupted-network behavior remain manual post-freeze checks.
