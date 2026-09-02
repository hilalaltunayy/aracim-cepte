# REV-009 — Premium Paywall, RevenueCat, Restore, Multi-Vehicle

## Current problem
Premium screen looks basic/form-like and purchasing is unavailable.
`Devam et` and `Satın alımları geri yükle` are not verified end-to-end.

## Paywall UI
Keep dark navy/aqua identity but remove heavy boxed form feeling.

Need:
- premium hero
- benefits
- monthly/yearly plan cards as available
- real store/RevenueCat price, not fake hardcoded price
- recommended/best value state if appropriate
- purchase CTA
- restore purchases
- legal links as required
- loading/cancelled/pending/success/error states

Displayed Premium limits must match backend reality after final quota decisions.

## RevenueCat / Google Play
Complete legitimate existing architecture:
1. verify package/app identity
2. RevenueCat app/project
3. `premium` entitlement
4. current Offering
5. Google Play subscription product(s)
6. purchase
7. restore
8. trusted entitlement sync/reconciliation to Supabase
9. revenuecat webhook deploy/verify
10. account-switch isolation
11. no client fake premium flag

Prepare exact license-tester steps.
Do not publish production automatically.

## Multi-vehicle / vehicle family
Free remains max 1 vehicle.
Premium should provide polished personal garage/family experience using existing configured multi-vehicle limit (e.g. 3 if backend says 3).

Need:
- clear active vehicle
- easy vehicle switcher
- each vehicle separate records/photos/reminders/reports/AI context
- no cross-vehicle data mixing

Do not overbuild social sharing unless existing product supports it.
