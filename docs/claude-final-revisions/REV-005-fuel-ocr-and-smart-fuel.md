# REV-005 — Fuel OCR + Smart Fuel Save Rules

## Fuel OCR tekrar audit
Fiziksel testte OCR bazı alanları çıkarıyor ama yeterince güvenilir değil.

Gerçekçi Türk yakıt fişleriyle kontrol edin ve visible olduğunda şu alanları çıkarın:
- toplam tutar
- litre
- litre fiyatı
- istasyon/marka
- tarih
- mümkünse saat
- güvenilir ise şehir/location
- fiş/fatura no

Unknown = empty/null. Uydurmayın.

Preprocessing/parser:
- orientation/resize/contrast
- decimal comma/dot
- TL/₺
- LT/L/litre
- TOP/TOPLAM
- multiplication lines
- common station brands

Partial result gösterin; all-or-nothing yok.

## Review
- editable fields
- clear/delete
- explicit transfer
- explicit save
- no auto-save

## Smart Fuel deterministic trio
Core:
- total amount
- litres
- unit price

Herhangi ikisi valid ise üçüncüyü hesapla.

Yeni save rule:
**Bu üç değerden en az iki valid değilse Fuel kaydı save edilemesin.**

Örnek:
- sadece total → block
- total + unit price → litres calculate → save
- litres + unit price → total calculate → save
- total + litres → unit price calculate → save

Blocked save:
- clear validation
- kısa shake feedback olabilir

Diğer Fuel alanları optional kalır.
