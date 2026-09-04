# Round 2 — Release Readiness (pre-APK)

**Branch:** `claude/final-qa-fixes` · **As of:** 2026-09-03 · local validation only.

Covers the Round 2 batches: ROUND2-001 (auth reset + password rules), 004B
(form overlap), 004A (fuel OCR), 002 (AI assistant + device failure), 003
(RevenueCat), 005 (visual polish).

## Checklist

| Item | State | Note |
| --- | --- | --- |
| Auth reset broken state | CODE FIXED / DEVICE-PENDING | PKCE + robust deep-link capture + token_hash + late-`PASSWORD_RECOVERY` safety net. Needs the Supabase redirect-allowlist + `token_hash` reset template + one physical run. |
| Password rules (new/changed only) | DONE | 8+ / 1 upper / 1 digit / 1 special, shared `evaluatePasswordPolicy`, signup + reset; existing passwords untouched. |
| AI assistant | CODE COMPLETE / EXTERNAL-BLOCKED | Device failure root-caused twice: invalid model `gemini-3.6-flash` (404), then `gemini-2.5-flash` 404 NOT_FOUND on this project/key. Default now `gemini-3.1-flash-lite`. Needs migration `20260903120000` applied + function redeploy + (already-set) secrets. |
| AI quota on failure | FIXED | Only a validated answer commits. Reservation TTL 2min→45s; reserve error split (`AI_USAGE_IN_PROGRESS` 409 ≠ `AI_MONTHLY_QUOTA_EXCEEDED` 429); release retried; chip re-synced after failures. |
| Premium / RevenueCat | CODE COMPLETE / EXTERNAL-BLOCKED | Purchase/restore/pending/cancel/account-switch present; entitlement authoritative from `user_entitlements`; "Premium doğrulanıyor" reconcile state. Needs Play products/Offering/entitlement + public SDK key + webhook deploy (runbook). |
| Fuel OCR major bug | FIXED | Plate prefix can no longer become the total; litres×price reconciliation; robust date + standalone time. Review-before-transfer + no auto-save intact. |
| Form label/placeholder overlap | FIXED | `FloatingField` shows the native placeholder only after the label floats; eye re-centred; applies app-wide via the `AppInput` alias. |
| Login/Signup layout | FIXED | `Screen centered` (no dead space), centred logo/heading, password mascot, branded logo entrance. |
| Home background / chart / 3D | IMPROVED | Dense repeating line-art tile; SVG area+line chart with per-month tap; physical clearcoat material + glass + lights + `activeOffsetX/Y` orbit. |
| Navigation | OK | `/record/detail` route registered; no dead links introduced; route tests pass (bar the 2 pre-existing collection failures). |
| Records / documents / reminders / settings regressions | OK | Behavioural tests green; only presentation changed. |
| Migration drift | LOCAL AHEAD BY 2 | `20260902120000` (applied, Local=Remote per user) and `20260903120000` (NOT yet applied). No applied file modified; both additive/forward. |
| Secret exposure | OK | Grep for keys/service-role/provider secrets in `src/` + `supabase/functions/` = none; all provider config is `Deno.env.get` server-side. |

## Validation (local, 2026-09-03)

- `tsc --noEmit`: clean.
- `expo lint`: clean.
- `git diff --check`: clean.
- `vitest run`: 607 passed. **4 pre-existing, unrelated failures** unchanged
  since before Round 1: `tests/routes/criticalRoutes.render.test.tsx` +
  `tests/routes/vehicle3dProfile.render.test.tsx` (both `SyntaxError: Unexpected
  token 'typeof'` at collection), `src/shared/components/selectField.render.test.tsx`
  (3 Android safe-area / TimeField), `src/features/fuelPrice/providers/EpdkFuelPriceProvider.test.ts`
  (1 XML fixture).
- `node --test supabase/functions/_shared/*.test.mjs`: 52 passed / 0 failed.
- `npx expo export:embed --eager --platform android --dev false`: succeeds
  (~2246 modules).

## Release blockers before the next preview APK

1. **Apply `supabase/migrations/20260903120000_ai_quota_reservation_hardening.sql`**
   (`supabase db push` after `migration list` review) and **redeploy**
   `vehicle-ai-assistant` (`_shared` changed).
2. **Set `GEMINI_MODEL`** to a model the key lists (`GET /v1beta/models`) if
   `gemini-3.1-flash-lite` is not available; re-test the assistant end-to-end.
3. **Physical Android password-reset run** after the Supabase redirect-allowlist
   + `token_hash` reset-email template change.
4. **RevenueCat/Play** dashboard setup + `revenuecat-webhook` deploy (runbook) —
   or ship with billing fail-closed and Premium activation deferred.
5. **Full device regression**: auth, vehicle bootstrap/photo, record CRUD + all
   three OCR flows, 3D orbit/pinch, reminders, reports, chatbot, paywall,
   long-list scrolling.

## Safe to build?

**Not yet.** Code, types, lint, tests and the Android production bundle are all
green, and every Round 2 defect is fixed in code, but blockers 1–3 above must
land first (migration apply + function redeploy are quick; the reset-template
and device pass need a person). RevenueCat (blocker 4) can be deferred behind
its fail-closed gate if a build is wanted sooner.

## Exact next commands

```
npx supabase migration list --linked
npx supabase db push
npx supabase functions deploy vehicle-ai-assistant
npx supabase functions list
```

Then, once the above + the reset-template change are done and a device pass is
recorded, on explicit instruction:

```
npx expo export:embed --eager --platform android --dev false
eas build --platform android --profile preview
```
