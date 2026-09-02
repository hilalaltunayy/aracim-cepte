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

- [ ] A. Password reset root-cause fix
- [ ] B. Shared feedback component + UI primitives
- [ ] C. Smart Fuel two-of-three save rule
- [ ] D. Read-only record detail pages
- [ ] E. Login / Signup redesign
- [ ] F. Home intro + dashboard polish
- [ ] G. Record / document / reminder / settings UI harmonization
- [ ] H. Fuel / Maintenance / General Document OCR
- [ ] I. 3D procedural quality + gestures + vehicle photo persistence
- [ ] J. AI provider + daily quota + chatbot UI
- [ ] K. Premium / RevenueCat / multi-vehicle polish
- [ ] L. Full validation

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
### Skipped
### Failed
### Manual verification required
