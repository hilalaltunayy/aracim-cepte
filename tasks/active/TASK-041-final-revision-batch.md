# PLAN — TASK-041 — Final revision batch (`docs/claude-final-revisions/`)

**Status:** IN PROGRESS
**Owner:** Claude Code
**Created:** 2026-09-02
**Updated:** 2026-09-02
**Branch:** `claude/final-qa-fixes`

## Goal

Implement REV-001..REV-010 from `docs/claude-final-revisions/` as one traceable pass without changing
app identity, weakening security, or producing an Android artifact.

## Source of truth

`docs/claude-final-revisions/REV-*.md` + `CLAUDE_MASTER_PROMPT.md`. Handoff docs in
`docs/handoff/` for architecture. This file tracks progress only; it does not restate requirements.

## Conflict resolutions (approved by user 2026-09-02)

- AI quota → **daily**: Free 1/day, Premium 10/day. New additive migration; applied migrations
  untouched. Server-authoritative reserve/commit/release; only successful answers consume.
- AI provider: complete Gemini code path; keep production activation fail-closed; report exact
  remaining backend config step. No key in repo/app.
- RevenueCat: finish code-side only; no Play Console actions; no webhook deploy until secret+target
  verified; prepare runbook.
- 3D: improve existing procedural architecture; no new GLB pipeline.
- Password reset: fix real root cause, not only error UI. Success copy
  "Şifreniz yenilendi. Yeni şifrenizle giriş yapabilirsiniz."
- UI tests: behavioral no-regression; visual/inventory assertions may be updated.
- Home intro: transient fresh-login signal allowed; not shown on every Home revisit.

## Execution order & status

- [x] A. Password reset root-cause fix — PKCE flow + robust deep-link capture
- [x] B. Shared FeedbackBanner / FloatingField / AutomotiveBackdrop / motion hooks
- [x] C. Smart Fuel two-of-three save rule
- [x] D. Read-only record detail pages (`/record/detail`)
- [x] E. Login / Signup redesign (BrandLogo, Reveal, shake, floating fields)
- [x] F. Home intro overlay + dashboard polish (tappable chart, backdrop)
- [x] G. Card-less FormSection + floating AppInput + backdrops across forms
- [x] H. Fuel / Maintenance / Document OCR resilience
- [x] I. Procedural 3D quality + gesture tuning + photo hydration hardening
- [x] J. Daily AI quota migration + chatbot assistant UI
- [x] K. Paywall polish + RevenueCat runbook
- [x] L. Full validation (tsc, expo lint, vitest, git diff --check, Android bundle)

## Security/privacy invariants

RLS, private Storage, owner isolation, server-authoritative entitlement/quota, no secret in
client/repo, OCR review-before-save, no cloud image upload, no fake Premium toggle.

## Validation

Changed-file ESLint, `tsc --noEmit`, focused + regression `vitest`, `git diff --check`,
`npx expo export:embed --eager --platform android --dev false`. No EAS build.

## Rollback

All work on `claude/final-qa-fixes`; each area is an isolated commit-sized change. New migration is
additive and revertible by a forward migration. Checkpoint tag `pre-claude-handoff-2026-09` untouched.

## Completion report

### Completed

- REV-001..REV-010 implemented across commits on `claude/final-qa-fixes`
  (11 area commits A–K + this validation entry).
- Password reset: client switched to PKCE auth flow so recovery/confirm
  callbacks arrive as query params (implicit `#fragment` tokens are dropped by
  Android when Chrome redirects to the app scheme); `useIncomingAuthCallbackUrl`
  latches the first param-bearing deep link from `getInitialURL` + the warm-start
  `url` event instead of caching a null first read. Success copy per spec.
- Shared: `FeedbackBanner` (error/warning/success/info), `FloatingField`
  (now backing `AppInput`), `AutomotiveBackdrop`, `Reveal`, `BrandLogo`,
  `useReducedMotion`, `useShakeAnimation`. `FormSection` is card-less by default.
- Smart Fuel: `validateFuelEntry` requires ≥2 of total/litres/unitPrice.
- New `/record/detail` read-only page; History + Home recent open it.
- Login/Signup redesigned without touching auth calls or legal URLs.
- Home welcome intro (transient `homeIntroPending`), tappable 6-month chart,
  removed the generic car icon and the half-empty fuel card.
- OCR parsers made resilient (next-line values, currency stripping, keyword
  line items, label synonyms). Still partial + review-before-save, no auto-save.
- 3D: rounded lofted body, alloy wheels + arches + bumpers, studio lighting +
  contact shadow, `averageTouches` pan. Demand rendering + disposal intact.
- AI: additive migration `20260902120000_ai_daily_quota` (Free 1/day,
  Premium 10/day, UTC-day period); assistant rebuilt as a real chatbot.
- Paywall polish + `docs/release/revenuecat-google-play-runbook.md`.

### Validation (2026-09-02, local)

- `tsc --noEmit`: clean.
- `expo lint`: clean.
- `vitest run`: 599 passed. 4 pre-existing failures unchanged and unrelated:
  `tests/routes/criticalRoutes.render.test.tsx` and
  `tests/routes/vehicle3dProfile.render.test.tsx` (both `SyntaxError: Unexpected
  token 'typeof'` at collection), `src/shared/components/selectField.render.test.tsx`
  (3 Android safe-area/TimeField), `src/features/fuelPrice/.../EpdkFuelPriceProvider.test.ts`
  (1 XML fixture).
- `git diff --check`: clean.
- `npx expo export:embed --eager --platform android --dev false`: success,
  2244 modules.

### Failed

- None introduced. Pre-existing failures listed above.

### Manual verification required (external / device / secret)

- Fresh-link password reset, signup/confirmation email delivery + Dashboard
  redirect/template/SMTP on a device built from this checkpoint.
- Full physical Android regression on a new preview APK (auth, vehicle
  bootstrap/photo, record CRUD/OCR, 3D gestures, reminders, reports, chatbot,
  paywall, long lists).
- Vehicle photo disappearance: client hydration hardened; definitive root cause
  needs a linked-Supabase read-only probe or device repro.
- Apply `20260902120000_ai_daily_quota.sql` to the verified remote project
  (`supabase link` + `migration list` + `db push`).
- AI provider go-live: set Edge secrets `AI_VEHICLE_ASSISTANT_ENABLED=true`,
  `AI_PROVIDER_PRIVACY_APPROVED=true`, `AI_VEHICLE_ASSISTANT_PROVIDER=gemini`,
  `GEMINI_API_KEY` — plus the privacy/commercial approval those flags assert.
- RevenueCat/Play: everything in the runbook (products, base plans, Offering,
  public SDK key, webhook secret + deploy, license-tester purchase/restore).
- No EAS build / AAB / rollout performed.
