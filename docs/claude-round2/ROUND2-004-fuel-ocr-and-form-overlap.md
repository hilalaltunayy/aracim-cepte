# ROUND2-004 — Fuel OCR Logic Fix + Form Overlap Fix

## Priority
P0/P1

## Problem summary A — OCR logic
A real fuel receipt was scanned.
OCR extracted:
- litre: correct
- litre price: correct
- receipt no: correct
- total: wrong (read plate prefix "42" as total)
- date: missing
- time: missing

Example issue:
Receipt clearly shows:
- date: 02-09-2026
- time: 14:45
- total: 500,00 TL
- line item includes 6,550 LT x 76,35

But OCR result set total to 42.

This is unacceptable.

## Required OCR behavior
Fuel OCR should try to extract:
- total amount
- litres
- unit price
- station / brand
- date
- time
- receipt number

If OCR extracts an obviously inconsistent total, logic should not blindly trust it.

## Logic requirement
Use a validation / reconciliation step:
- If litres × unit price approximately equals a different amount than extracted total,
  detect mismatch.
- Prefer clear total markers such as:
  - TOPLAM
  - TUTAR
  - ÖDENECEK
  - K. KARTI / ödeme total context
- Avoid confusing plate numbers, company numbers, tax ids, etc. with total

Do not auto-save anything.
Keep review-before-transfer flow.

## Problem summary B — Form overlap
Placeholder / label text is overlapping badly in multiple forms.
Examples:
- "Toplam tutar" with value overlap
- "Litre" / "Bilinmiyor" overlap
- "Kilometreyi bilmiyorum" overlap
- similar issues across forms

This must be cleaned up everywhere relevant.

## Required UI behavior
- labels/placeholders must not overlap
- fields must remain readable on tablet
- floating label behavior must be corrected
- spacing/alignment must be consistent

## Acceptance criteria
- provided sample receipt pattern can extract date/time/total correctly
- total no longer becomes "42" from plate
- inconsistent OCR values are flagged clearly
- form fields no longer overlap
- no regression in manual entry
- review-before-save remains intact

## Output format
Reply briefly with:
1. OCR root cause
2. fields fixed
3. form overlap fixes
4. validations
5. remaining edge cases

Important: keep your answer short. Do not repeat project architecture. Do not write long audits. Max 10 bullets.
