# QA-005 — Maintenance Packages: Custom Operations

## Goal
Allow the user to add maintenance operations not present in the predefined checklist.

## Required behavior
- Add an action such as `+ Özel işlem ekle` in the package creation flow.
- User enters a custom operation name.
- Validate trimmed non-empty text.
- Add it to the current package.
- Custom items can be selected/deselected.
- Save package with predefined + custom operations together.
- Saved package must load correctly later.
- Avoid obvious duplicate custom labels in the same package if easy.
- Allow removing a custom item before save.

## Acceptance criteria
- [ ] Custom operation can be added.
- [ ] It persists in saved package.
- [ ] Existing package behavior does not regress.
