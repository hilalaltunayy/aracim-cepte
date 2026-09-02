# QA-009 — Reminder Type / Title Synchronization

## Goal
Remove unnecessary manual title correction when reminder type changes.

## Current behavior
Default:
- type = `Periyodik bakım`
- title = `Periyodik bakım`

When the user changes type, the title incorrectly stays `Periyodik bakım`.

## Preferred behavior
- While title is still auto-generated/untouched, changing reminder type updates the title to the selected type.
- Once the user manually edits the title, later type changes must not overwrite custom text.

## Keep unchanged
- past-date restriction
- current calendar logic
- Free fixed notification time of 09:00

## Acceptance criteria
- [ ] Type change updates untouched title.
- [ ] User custom title is preserved after manual edit.
