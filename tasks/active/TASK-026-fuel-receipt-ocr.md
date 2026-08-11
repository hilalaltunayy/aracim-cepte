# TASK-026 — Fuel Receipt OCR

**Status:** IMPLEMENTED — AWAITING PR, MERGE AND ANDROID OCR ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-11
**Updated:** 2026-08-11

## Goal

TASK-025B'nin cihaz içi OCR motorunu ve TASK-020 yakıt hesaplama kurallarını kullanarak Türkçe yakıt
fişlerinden geçici, düzenlenebilir form önerileri üretmek.

## Current state

- TASK-025B, local image URI üzerinde on-device OCR sağlar; raw text kalıcı değildir.
- TASK-020, toplam/litre/litre fiyatı için deterministik iki-değerden-üçüncü değer hesaplamasını ve
  normalize istasyon kataloğunu sağlar.
- Fuel formunda kalıcı yakıt fişi attachment alanı yoktur. Bu görevde seçilen fiş görseli yalnız
  tarama girdisidir; normal fuel save'e attachment metadata/Storage write eklenmez.

## Scope

- Konservatif receipt parser, merkezi istasyon tespiti, rounding consistency/derivation ve editable
  suggestion review/apply deneyimi.
- Kamera/galeri/dosya hattından pending JPG/JPEG/PNG receipt seçimi; PDF güvenli fallback.
- Fuel formuna explicit OCR action; yalnız unsaved form patch'i.

## Out of scope

- Receipt attachment persistence, migration, cloud/LLM OCR, auto-save, maintenance OCR, live prices,
  premium/paywall, diğer fuel redesign, Supabase/Storage/RLS değişikliği ve EAS build.

## Acceptance criteria

- [ ] Toplam, litre, litre fiyatı, istasyon ve tarih yalnız güvenilir label/context ile önerilir.
- [ ] Üç değer tutarlılığı kontrollü; eksik üçüncü değer TASK-020 helper ile türetilir.
- [ ] Manual values varsayılan olarak seçilmez/ezilmez; `Forma aktar` DB write yapmaz.
- [ ] Partial/no-result/error/PDF manuel yakıt girişini engellemez.
- [ ] Hedefli parser, provider, review ve form testleri geçer.

## Security/privacy requirements

- OCR kullanıcı tarafından başlatılır, yalnız cihazda çalışır; raw receipt text/log/analytics/Supabase
  persistence veya dış provider yoktur.
- Private Storage, quota, owner scope ve normal fuel save sözleşmesi değişmez.

## Execution plan

1. **Completed:** `origin/develop`, TASK-020 fuel domaini, TASK-025B provider ve attachment hattı incelendi.
2. **Completed:** Receipt parser/config, transit review/apply bileşeni ve fuel form entegrasyonu yapıldı.
3. **Completed:** Hedefli parser/review/form testleri, dar lint/type/diff kontrolleri çalıştırıldı.
4. **In progress:** Security/privacy diff review, task evidence, commit ve push tamamlandıktan sonra PR
   incelemesi ve normal merge. Bu makinede GitHub CLI mevcut değilse PR/merge manuel güvenli adım olarak kalır.

## Validation commands

- Hedefli TASK-020/TASK-025B/TASK-026 Vitest dosyaları.
- Değişen TypeScript/TSX ESLint, ilgili TypeScript doğrulaması ve `git diff --check`.

## Manual device checks

- [ ] Kamera/galeri/dosya ile JPG/PNG fiş seçip explicit tarama, edit/deselect/apply ve ayrı Save.
- [ ] Opet/Shell/Petrol Ofisi/BP/TotalEnergies/Aytemiz, partial/inconsistent/no-text/PDF senaryoları.
- [ ] Kaydetmeden önce uzakta veri değişmediği; manual değerlerin korunması.

## Rollback strategy

Feature commit revert'i parser/review/transient receipt seçimini kaldırır. Migration, Storage upload veya
kalıcı OCR verisi olmadığı için forward data recovery gerekmez.

## Do not change

- Supabase schema/migration/RLS/Storage, OCR provider paketi, auth, theme, reminders, dashboard,
  maintenance/document OCR, premium, live-price API, EAS/Play ve `main`.

## Completion report

### Completed

- Yerel ML Kit adapter'ı, kullanıcının başlattığı JPG/PNG yakıt fişi taraması için tekrar kullanıldı.
- Toplam, litre, litre fiyatı, tanınan istasyon ve tarih önerileri; ham OCR metni kalıcı olmadan ayrıştırılır.
- Eksik üçüncü değer yalnız TASK-020 `calculateMissingFuelValue` ile türetilir; üç değer uyumsuzsa uyarı gösterilir.
- `Forma aktar` yalnız seçilmiş, düzenlenebilir önerileri mevcut kaydedilmemiş fuel form state'ine kopyalar;
  normal `Kaydet` tek persistence kapısıdır. Mevcut manuel değerler varsayılan olarak seçilmez.
- `2026-08-11` ortamında hedefli Vitest: 7 dosya / 47 test geçti. Değişen dosya ESLint geçti.
- `npm run typecheck`, TASK-026 kodunda hata olmadan yalnız önceden mevcut auth/legal test tipi hatalarıyla başarısız oldu.

### Security/privacy regression check

- Yeni migration, Storage write, public URL, provider, secret, analytics veya raw OCR persistence yok.
- Fiş görüntüsü fuel kaydına attachment olarak eklenmez; yalnız geçici OCR girdisidir.
- Kaynak taramasında TASK-026 dosyalarında `console.*`, token, signed URL veya ham OCR logu bulunmadı.

### Skipped

- Geniş test paketi, coverage, EAS build, remote Supabase testi/deploy ve migration: görev kapsamı dışında.
- GitHub CLI bulunmadığı için bu ortamda PR oluşturma ve normal merge: manuel GitHub web adımı gerekli.

### Failed

- TASK-026 hedefli test veya lint hatası yok. Tam TypeScript kontrolünün kalan önceden mevcut auth/legal test
  hataları bu görev tarafından düzeltilmedi.

### Manual verification required

- Android cihazda kamera/galeri/dosya ile JPG/PNG fiş seçimi, gerçek ML Kit tanıma, edit/deselect/apply,
  manuel değer önceliği, PDF fallback ve normal ayrı `Kaydet` akışı doğrulanmalıdır.
