# QA-008 — General Vehicle Document OCR

## Goal
Make OCR useful for common Turkish vehicle documents instead of frequently returning `Belgeden okunabilir bilgi bulunamadı.`

## Document families
Improve support where the product model has matching document types:
- Ruhsat
- Trafik sigortası
- Kasko
- Muayene
- Ekspertiz
- MTV/tax-related documents
- traffic fine/penalty documents where supported

## Ruhsat suggestions
When visible/reliable:
- plate
- make
- model/type
- model year
- fuel type
- color
- VIN/chassis number
- engine number
- registration/first registration date
- document/serial number

Avoid persisting unrelated personal/sensitive fields the product does not need.

## Insurance/Kasko
- insurer
- policy/document number
- start date
- expiry date
- plate/vehicle reference

## Muayene
- inspection date
- next/expiry date
- report/document number

## UX
Use editable review:
1. detect,
2. show suggestions,
3. allow edit/clear,
4. explicit transfer,
5. explicit save.

## Robustness
Improve orientation, scale/contrast preprocessing, Turkish label parsing, table-layout parsing and partial extraction.
Do not fail the entire document because one field is missing.

## Acceptance criteria
- [ ] Readable ruhsat returns multiple useful fields.
- [ ] Insurance/inspection docs return relevant values when visible.
- [ ] Partial results are shown.
- [ ] User can edit before transfer.
