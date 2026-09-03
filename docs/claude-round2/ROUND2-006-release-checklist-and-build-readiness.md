# ROUND2-006 — Release Checklist and Build Readiness

## Priority
Final step before new APK

## Goal
After completing the earlier round-2 tasks, do a concise release-readiness pass.

## Required checks
- no broken auth reset
- assistant working or clearly blocked only by external secrets
- premium flow code-complete and manual steps documented
- OCR major fuel bug fixed
- form overlap fixed
- critical UI issues cleaned up
- no obvious broken navigation
- no regression in records/documents/reminders/settings
- no migration drift
- no accidental secret exposure

## Validation
Run concise validation:
- changed-file lint
- types
- relevant tests
- git diff --check
- android bundle/embed command if appropriate

## Output
Give only:
1. release blockers
2. safe to build or not
3. exact next command Hilal should run
4. if build should wait, why

Important: keep your answer short. Do not repeat project architecture. Do not write long audits. Max 10 bullets.
