# REV-010 — Reminder/Settings UI Harmonization + Hard No-Regression Rules

## Reminder
Do not change working reminder logic:
- past-date restriction
- calendar semantics
- current title/type sync
- entitlement notification-time rule

Only modernize UI:
- common automotive background
- remove unnecessary giant outer form cards
- independent fields
- preserve calendar behavior
- preserve Premium custom-time lock

## Settings
Do not remove/repurpose any action.
Only harmonize:
- background
- spacing
- card treatment
- buttons
- typography
- feedback UI

Apply same visual language, without changing business logic, to:
- expertise reports
- vehicle notes
- documents/archive
- new document screens

## Hard no-regression
Never break/remove:
- Supabase Auth
- email confirmation
- legal links
- vehicle loading
- CRUD
- maintenance custom operations
- private Storage
- RLS
- ownership isolation
- entitlements
- quotas
- OCR review-before-save
- Android package/signing
- migration history
- EAS profiles

UI redesign is not permission to rewrite navigation, stores or Supabase architecture.

## Git
Work only on `claude/final-qa-fixes`.
No merge to main/develop.
No force push/history rewrite.
No push unless user asks.

## Validation before APK
- focused tests
- regression tests
- ESLint
- TypeScript
- git diff --check
- local Android production bundle validation

Do not build APK/AAB until explicitly requested.
