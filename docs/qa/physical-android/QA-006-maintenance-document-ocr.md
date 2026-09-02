# QA-006 — Maintenance / Service Document OCR

## Goal
A single readable service invoice/work-order should produce a useful structured maintenance draft.

## Current problem
Multiple readable maintenance/service documents returned no useful structured maintenance information.

## Required extraction
From one scan, attempt to extract reliably visible data:

### Header
- service/provider name
- date
- invoice/receipt/work-order number

### Line items
- item/service description
- quantity
- unit price when present
- line total when present
- infer parts vs labor where reasonably possible

### Totals
- parts total
- labor total
- grand total

## UX
- Return partial results instead of all-or-nothing failure.
- Show editable review.
- User can remove incorrect lines.
- User can add missing lines.
- Explicit transfer and explicit save only.

## Parser robustness
Handle typical Turkish service documents:
- table layouts
- uppercase labels
- TL/₺
- decimal comma/dot
- quantity
- `İŞÇİLİK`, `PARÇA`, `TOPLAM`, `BİRİM FİYAT`, `ADET`
- common maintenance terms

If text recognition is okay but parsing is weak, improve the parser rather than replacing OCR blindly.
If recognition is weak, safely improve preprocessing: orientation, crop, contrast, resize, perspective where feasible.

## Acceptance criteria
- [ ] Partial useful data is returned from readable service documents.
- [ ] Multiple line items can be extracted.
- [ ] Parts/labor values can be captured when visible.
- [ ] User can edit/remove/add before transfer.
