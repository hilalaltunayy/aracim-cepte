# QA-011 — Premium Access & Testability

## Goal
Make it clear how a user reaches Premium and prepare the current app for legitimate physical Premium testing.

## Current observation
Free/Premium gates are visible, e.g. Premium Reports, but the physical testing path into Premium is unclear.

## Required work
- Audit all Premium entry points:
  - Settings
  - paywall
  - blocked Premium feature cards
  - vehicle-limit upsell
  - reports
  - AI quota upsell
- Ensure at least one obvious stable path such as `Ayarlar → Premium'a geç`.
- Make blocked Premium features route consistently to the paywall.

## Security
Do not add a production `make me premium` toggle.
Premium must continue to come from the trusted RevenueCat/Supabase entitlement flow.

## Testability
Prepare for legitimate Google Play/RevenueCat test purchase flow.
If sandbox/license-tester support already exists, document the exact physical test path in the final report.
A dev-only entitlement simulation is acceptable only if it already exists and is impossible in production.

## Premium feature verification
Once entitlement is active, verify routes/features can unlock:
- Premium Reports
- multi-vehicle allowance
- higher photo/storage/OCR limits
- custom reminder time
- AI Premium quota
- other existing entitlement-controlled features

## Acceptance criteria
- [ ] Premium paywall is easy to find.
- [ ] Blocked Premium features route consistently to it.
- [ ] No insecure production bypass exists.
- [ ] Final report explains exactly how Premium will be physically tested next.
