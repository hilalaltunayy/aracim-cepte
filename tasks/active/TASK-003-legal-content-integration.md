# TASK-003 — Legal Content Integration

**Task ID:** TASK-003
**Status:** TECHNICAL IMPLEMENTATION COMPLETE — HUMAN/LEGAL REVIEW REQUIRED
**Title:** Legal content integration and single source of truth

## Goal

Integrate the four product-owner-provided legal drafts into a coherent repository structure, expose the required legal pages in the application, and ensure all app content is derived from one canonical source without claiming legal or production readiness.

## User problem

Legal drafts currently exist outside the repository while the repository contains shorter, duplicated draft content. Users need consistent in-app access to the applicable notices and deletion/application information, and maintainers need one auditable source for future legal review.

## Background

The product owner approved the following identity and contact details:

- Data controller: Hilal Yeşim Altunay
- Contact: altunayhilal14@gmail.com
- Planned legal site: aracimcepte.hilalaltunay.com

The supplied drafts are not professionally approved legal advice and must remain clearly marked as awaiting legal review.

## Current behavior

- `docs/legal/` contains partial draft notices and supporting consent-boundary guidance.
- `src/features/legal/legalContent.ts` repeats abbreviated legal text in TypeScript.
- Only the KVKK notice and privacy policy have in-app routes.
- Production migrations, Edge Functions, RLS/storage negative tests, and real-device verification are not all evidenced as complete.

## Desired behavior

- Four canonical Markdown documents under `docs/legal/` are the legal-content source of truth.
- Generated TypeScript content is derived from those Markdown files and is not manually maintained.
- Five distinct in-app legal destinations are accessible:
  - KVKK Aydınlatma Metni
  - Gizlilik Politikası
  - Saklama ve Silme Politikası
  - Hesap ve Veri Silme
  - KVKK Başvuru Bilgileri
- All drafts and UI surfaces clearly state `HUKUK İNCELEMESİ BEKLİYOR`.
- The notice is not presented as explicit consent and no general mandatory consent checkbox is added.

## Scope

- Compare the four Downloads drafts with current repository legal/security content.
- Establish canonical Markdown files and a documented content-generation flow.
- Add missing legal routes and settings links.
- Preserve explicit-consent boundaries.
- Add or update tests and documentation links.
- Run TypeScript, lint, tests, Markdown-link validation, diff review, and security/privacy regression review.
- Commit and push the approved changes to `origin/main`.

## Out of scope

- Professional legal approval or a claim of KVKK compliance
- Publishing the planned legal website
- Supabase deployment, migration deployment, Edge Function deployment, EAS/Expo build, or store release
- Changing database, storage, authentication, quota, or deletion runtime behavior
- Adding OCR/AI, marketing consent, cross-border transfer consent, or sensitive-document analysis

## Acceptance criteria

- [x] All four approved Downloads drafts are located and compared with repository content.
- [x] A documented single source of truth exists under `docs/legal/`.
- [x] App legal content is generated from the canonical Markdown instead of duplicated by hand.
- [x] All five required legal routes are registered and linked in the app.
- [x] Controller name, contact email, and planned site match the approved values.
- [x] Every production-facing draft is marked `HUKUK İNCELEMESİ BEKLİYOR`.
- [x] Pending migration/deploy, RLS/storage tests, and real-device verification are not represented as complete.
- [x] KVKK notice is informational and is not converted into explicit consent.
- [x] No generic mandatory personal-data-processing consent checkbox is added.
- [x] TypeScript, lint, tests, and Markdown-link checks pass.
- [x] No build or Supabase deploy is started.
- [x] Diff and security/privacy regression checks are reviewed.

## Security/privacy requirements

- Do not add secrets, credentials, access tokens, signed URLs, or real user records.
- Do not log legal-page contents or personal data.
- Do not imply that repository code proves production controls are deployed.
- Keep cross-border processing, processors/subprocessors, retention, deletion, and breach response subject to professional legal review.
- Treat the approved controller contact data as intentional public legal-contact information.

## Relevant screenshots or evidence

- External draft files in the local Downloads directory; no screenshots are required.
- Repository diff and test output provide implementation evidence.

## Relevant files

- `docs/legal/`
- `docs/security/kvkk-readiness.md`
- `docs/security/storage-policy.md`
- `src/features/legal/`
- `src/app/legal/`
- `src/app/(tabs)/settings.tsx`
- `src/app/auth/register.tsx`
- `src/app/_layout.tsx`

## Implementation steps

1. Inventory and compare the external and repository legal texts.
2. Create canonical Markdown documents and a legal-content index.
3. Add an explicit generated-artifact workflow for application content.
4. Add the five legal document views and navigation entries.
5. Add/update automated coverage and repository documentation.
6. Run required validation without building or deploying.
7. Review the diff and security/privacy implications.
8. Commit intentionally and push with `git push origin main`.

## Commands to run

- `git status --short --branch`
- `git diff --check`
- Project TypeScript command identified from repository scripts
- Project lint command identified from repository scripts
- Project test command identified from repository scripts
- Repository Markdown-link validation command or equivalent local checker
- `git diff --stat`
- `git diff --cached --check`
- `git push origin main`

## Expected outputs

- Canonical legal Markdown documents and index
- Generated application legal-content artifact
- Five accessible in-app legal pages
- Passing validation output or a separated failure report
- One focused commit on `main`, pushed to the existing private remote

## Manual device checks

- Open all five legal pages on a real Android device.
- Verify Turkish characters, scrolling, back navigation, and small-screen layout.
- Verify registration links open the notice and privacy policy.
- Verify no general explicit-consent checkbox is shown.

## Risks

- Draft wording may conflict with actual production data flows.
- Cross-border transfer mechanisms and processor/subprocessor terms require professional review.
- Generated content could drift if the generator check is not included in validation.
- Long legal content may expose mobile layout/accessibility defects that automated tests do not catch.

## Security/privacy impact

This task improves transparency and content consistency but does not itself establish legal compliance, deploy security controls, or validate production infrastructure.

## Manual checks

- Professional legal review of all four canonical drafts
- Production data-flow and provider/subprocessor comparison
- Production RLS/storage negative testing
- Migration and Edge Function deployment verification
- Real Android device verification
- Publication and reachability of the planned legal website

## Rollback strategy

Revert the focused TASK-003 commit. This restores the previous two-route, manually maintained legal-content implementation without affecting database or deployed infrastructure.

## Do not change

- Database migrations or deployed Supabase resources
- Storage/RLS/auth runtime behavior
- Expo/EAS configuration, package dependencies, build files, or environment values
- Existing GitHub remote URL or repository owner
- Product features unrelated to legal-content presentation

## Completion checklist

- [x] Approved scope implemented
- [x] Required automated checks run
- [x] Diff reviewed
- [x] Security/privacy regression review completed
- [x] Documentation updated
- [x] Completed, skipped, failed, and manual checks reported separately

## Review checklist

- [x] Canonical texts match approved drafts plus clearly identified repository-readiness clarifications
- [x] No legal-compliance claim was introduced
- [x] No legal text remains manually duplicated in application source
- [x] All routes and internal links resolve at static/typecheck level
- [x] No secret, credential, user data, build output, or deployment change is included

## Completion report

### Completed

- Four Downloads drafts were imported as canonical Markdown and compared with the shorter repository drafts.
- The shorter duplicate drafts were removed; `docs/legal/README.md` now defines the source-of-truth workflow.
- Generated application content and five legal routes were added.
- Registration remains informational; no explicit-consent checkbox was introduced.
- `node scripts/generate-legal-content.mjs --check`, `npm run typecheck`, `npm run lint`, targeted
  legal tests, the full 74-test Vitest suite, and a 35-file local Markdown-link check passed on
  1 August 2026.
- The diff and security/privacy scope were reviewed; only the approved public legal contact data was
  added and no credential, real user record, logging, database, migration, build, or deploy change
  was introduced.

### Skipped

- Build, Expo start, EAS build, Supabase migration deploy, Edge Function deploy, and remote database
  tests were intentionally not run because they are outside this task's approved scope.

### Failed

- No final validation remains failed. An initial typecheck found an invalid typed fallback route;
  it was corrected to the existing `/(tabs)` fallback and the rerun passed.

### Manual verification required

- Professional legal review and approval of all canonical drafts
- Production provider/subprocessor and cross-border transfer mechanism confirmation
- Production migration/Edge Function deployment and RLS/Storage negative-test evidence
- Real Android device navigation, typography, scrolling, accessibility, and back-navigation checks
- Publication and accessibility of the planned legal website
- Human acceptance before moving TASK-003 to `tasks/completed/`

## Human acceptance result

PENDING
