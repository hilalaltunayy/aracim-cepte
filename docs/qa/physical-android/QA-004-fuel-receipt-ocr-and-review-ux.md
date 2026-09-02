# QA-004 — Fuel Receipt OCR & Review UX

## Goal
Extract more useful fuel-receipt data and simplify the review flow.

## Current problems
OCR often returns only:
- litres
- date

even when the receipt visibly contains more information.

The `Öneriyi kullanma / Öneriyi kullan` selection UX is confusing and blocks `Forma aktar`.

## Required extraction
Attempt to extract when visible:
- total paid amount
- litres
- unit price / litre price
- station/brand
- date
- time when reliable
- city/location text when clearly present
- receipt/invoice number where useful

Unknown values must remain empty/null.

## Required review UX
1. Show OCR results as editable fields.
2. User may correct values directly.
3. User may clear/delete any field they do not want.
4. Remove the hidden opt-in requirement from each suggestion.
5. `Forma aktar` should work with reviewed non-empty fields.
6. OCR must never auto-save.

## Smart Fuel
If two of total/litres/unit price are known, reuse deterministic Smart Fuel logic to calculate the third where supported.
Do not present calculated values as OCR-detected values.

## Parsing quality
Improve Turkish fuel-receipt parsing for:
- decimal comma/dot
- `LT`, `L`, litre
- `TOP`, `TOPLAM`
- TL/₺
- multiplication lines
- common fuel station names

## Acceptance criteria
- [ ] Total, litres, unit price, date and station can be extracted when visible.
- [ ] Suggestions are directly editable.
- [ ] User can clear unwanted suggestions.
- [ ] Transfer is not blocked by hidden selection state.
- [ ] Missing data stays empty.
