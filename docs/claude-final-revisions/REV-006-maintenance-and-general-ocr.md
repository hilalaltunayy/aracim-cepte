# REV-006 — Maintenance OCR + General Vehicle Document OCR

## A. Maintenance / service OCR
Physical bug:
Ek servis belgesi/fişi yüklense de OCR usable data çıkarmıyor.

Tek scan'den visible olduğu kadar çıkarın:

Header:
- service/provider
- service type if inferable
- date
- invoice/receipt/work-order no

Line items:
- description
- quantity
- unit price
- line total
- part vs labor classification when reasonable

Totals:
- parts total
- labor total
- grand total

Other:
- mechanic/service name
- useful note text

Multiple rows varsa multiple structured items.

Review:
editable/remove/add → explicit transfer → explicit save.

Turkish patterns:
ADET, BİRİM FİYAT, İŞÇİLİK, PARÇA, TOPLAM, motor yağı, filtre, bakım işçiliği.

## B. General document OCR
Fix readable documents that currently return no structured data.

Support existing types:
- Ruhsat
- Trafik sigortası
- Kasko
- Muayene
- Ekspertiz
- MTV
- Servis belgesi
- Fatura
- supported traffic fine/penalty

### Ruhsat
plate, make, model/type, model year, fuel, color, VIN/chassis, engine no, registration/first registration date, serial/document no.

Do not persist unrelated owner PII unnecessarily.

### Insurance/Kasko
insurer, policy no, start/end date, vehicle/plate reference.

### Muayene
inspection date, expiry/next date, report/document no.

### Invoice/MTV/fine/service
date, document no, amount, provider/institution, relevant plate/reference where supported.

UX:
editable partial suggestions → explicit transfer → explicit save.
No auto-save.
Prefer improving current on-device OCR; no cloud image upload unless project privacy architecture explicitly allows it.
