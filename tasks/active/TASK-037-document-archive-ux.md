# PLAN — TASK-037 — Expired Documents Archive UX

## Goal

Separate current, soon-expiring and expired document views without deleting or moving document data.

## Scope

- Reuse `getDocumentStatus` and add a small archive-filter domain helper.
- Default the document list to Active, with counts and Expiring Soon/Archive views.
- Keep no-expiry records in the neutral active view.
- Preserve existing detail/edit, attachment and Add Document behavior.
- Add focused domain and render coverage; no migration or remote operation.

## Validation

- `npx vitest run src/features/documents/domain/documentStatus.test.ts src/features/documents/domain/documentArchive.test.ts src/app/documents/index.test.tsx`
- changed-file ESLint, scoped TypeScript diagnostics and `git diff --check`

## Manual verification required

- Physical Android visual acceptance at small/normal phone widths after the production freeze.

## Completion report

### Completed

- Reused the existing `getDocumentStatus` helper and added mutually exclusive Active,
  Expiring Soon and Archive filtering/counts.
- Added the default Active view, compact accessible filter control, real counts, focused empty
  states and an always-visible Yeni belge action.
- Preserved existing document detail/edit/delete and attachment routing; Archive is view-only and
  expired documents are never auto-deleted.
- Added domain and render coverage, including no-expiry and legacy-safe behavior.
- Updated `docs/product/document-archive-ux.md`.
- Targeted Vitest: 16 files / 69 tests passed; changed-file ESLint passed; no new TASK-037
  TypeScript errors; `git diff --check` passed.

### Skipped

- Remote migration/RLS/Storage changes, Edge deployment, Play build and tester changes.

### Failed

- The existing broad `tests/routes/criticalRoutes.render.test.tsx` cannot parse its pre-existing
  fixture (`Unexpected token 'typeof'`); it was not changed by TASK-037.

### Manual verification required

- Physical Android visual acceptance remains required after the production freeze; web/render
  tests cannot prove native layout behavior.
