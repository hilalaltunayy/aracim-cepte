# ROUND2-003 — Premium Activation with RevenueCat

## Priority
P0/P1 - important for monetization

## Problem summary
Premium page still says purchase is not currently active.
The purchase flow must be activated.

## Product decision
Use RevenueCat + Google Play subscription path already prepared in the project.
Do not introduce a new payments architecture.

## Required behavior
- Paywall should show real purchasable state when configuration is complete
- "Devam et" should initiate purchase
- "Satın alımları geri yükle" should restore purchases
- Premium entitlement must be authoritative from backend/server sync
- No fake premium state on client
- Free/Premium limits must match real backend rules

## Current visible issue
The page still shows:
"Premium satın alma şu anda kullanıma açık değil."

That state must only remain if there is a genuine external configuration blocker.

## Must investigate
Check which part is missing:
- RevenueCat SDK configuration
- offering/product lookup
- Google Play products/base plans
- public SDK key
- webhook deployment
- Supabase sync
- entitlement mapping
- UI state logic

## Important
If external manual dashboard work is required, do not hide that.
Instead provide a precise step-by-step runbook for Hilal:
1. RevenueCat dashboard
2. Google Play Console
3. Supabase webhook/function/deploy if needed
4. test purchase flow
5. restore flow

## Acceptance criteria
- purchase flow is code-complete
- restore flow works
- paywall uses real store state
- no fake premium flag
- pricing is not hardcoded if real product data is available
- external missing steps are documented exactly

## Output format
Reply briefly with:
1. what is already done in code
2. what you fixed
3. which external steps Hilal must do manually
4. validation
5. blockers

Important: keep your answer short. Do not repeat project architecture. Do not write long audits. Max 10 bullets.
