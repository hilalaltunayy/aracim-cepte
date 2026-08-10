# TASK-016 — Tarihsel kilometre desteği

**Status:** IMPLEMENTED — AWAITING ANDROID DEVICE ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-11
**Updated:** 2026-08-11

## Task ID

TASK-016

## Title

Tarihsel araç kayıtlarında bağımsız event kilometresi ve timeline uyarısı.

## Goal

Kullanıcı güncel araç kilometresini düşürmeden geçmiş tarihli yakıt, bakım ve gider kaydı
ekleyebilsin; bilinmeyen kilometreyi boş bırakabilsin ve şüpheli tarih/kilometre diziliminde açık
uyarı alabilsin.

## User problem

`vehicles.current_km` 150.000 iken dört ay önceki 148.000 km bakım kaydı istemci ve database
tarafından reddediliyor. Bu, gerçek tarihsel veri girişini engelliyor.

## Current behavior

- `vehicles.current_km` ayrı ve kalıcı high-water mark'tır.
- `vehicle_records.kilometer` nullable, `record_date` event tarihidir.
- Form, store ve `save_vehicle_record_atomic` güncel kilometrenin altındaki yeni/değiştirilmiş
  event kilometrelerini reddeder.
- RPC yalnız daha yüksek event kilometresinde `current_km` değerini yükseltir; record silme
  `current_km` değerini yeniden hesaplamaz.

## Desired behavior

- Non-negative event kilometresi güncel kilometreden düşük olsa da kaydedilir.
- `null`, “Kilometreyi bilmiyorum” anlamına gelir; `0` sentinel olarak kullanılmaz.
- Timeline çelişkisi blocking validation yerine kullanıcı onaylı advisory warning üretir.
- `current_km` yalnız bilinen event kilometresi mevcut değerden yüksekse ilerler; edit/delete ile
  gerilemez.

## Scope

- [x] Saf ve makine-okunur timeline evaluator.
- [x] Yakıt/bakım/gider ortak formunda advisory warning ve açık devam onayı.
- [x] Store'da yalnız invalid/negative kilometrenin blocking kalması.
- [x] Forward migration ile atomic RPC davranışının güncellenmesi.
- [x] Hedefli unit, repository ve route/render testleri.
- [x] Local SQL güvenlik/tutarlılık testi.
- [x] Gerekli database architecture dokümantasyonu.

## Out of scope

- Current mileage'ı record `MAX()` değerinden türetmek.
- Premium, OCR, AI, 3D, body type, trip, auth, hukuk, dependency veya build değişikliği.
- Remote Supabase migration/deploy, EAS build, Play Console ve broad regression suite.

## Acceptance criteria

- [x] 150.000 current + 148.000 historical event kabul edilir; current 150.000 kalır.
- [x] 145.000 → 147.000 → 149.000 timeline `valid` olur.
- [x] 145.000 → 170.000 → 149.000 timeline `warning` olur ve açık onayla kaydolabilir.
- [x] Null kilometre kabul edilir ve current değişmez.
- [x] 151.000 event current değerini 151.000'e yükseltir.
- [x] Historical edit ve record delete current değerini düşürmez.
- [x] Negative/invalid mileage `blockingError` olur.
- [x] Same-day farklı kilometreler strict sıralanmaz; advisory warning olur.
- [x] Idempotent retry duplicate veya mileage regression üretmez.
- [x] Cross-user vehicle create ve record update RPC erişimi reddedilir.

## Security/privacy requirements

- RPC `auth.uid()` sahiplik kontrolü, vehicle/record row lock, idempotency hash ve güvenli
  `search_path` davranışını korur.
- `PUBLIC`/`anon` execute açılmaz; `authenticated` yalnız owner-scoped RPC'yi çağırır.
- Kullanıcı verisi, secret veya PII loglanmaz; remote/production veriye dokunulmaz.

## Relevant screenshots or evidence

AWAITING ANDROID DEVICE ACCEPTANCE. 2026-08-11 tarihinde Docker Desktop 27.4.0 üzerindeki local
Supabase stack'te TASK-008 record/RPC önkoşulu, TASK-016 forward migration ve
`supabase/tests/historical_odometer.sql` sırasıyla `psql -v ON_ERROR_STOP=1` ile çalıştırıldı.
Hedefli SQL transaction'ı bütün assertion'ları geçti ve sentetik veriyi `ROLLBACK` ile temizledi.

## Relevant files

- `src/shared/utils/mileageTimeline.ts`: saf evaluator ve high-water yardımcıları.
- `src/app/record/edit.tsx`: ortak yakıt/bakım/gider form warning akışı.
- `src/store/dataStore.ts`: mutation blocking sınırı.
- `src/data/repositories/SupabaseAppRepository.ts`: tek record write path kanıtı.
- `supabase/migrations/*_historical_odometer_support.sql`: forward RPC değişikliği.
- `supabase/tests/historical_odometer.sql`: hedefli local SQL kanıtı.
- `docs/database.md`: event/current kilometre source-of-truth açıklaması.

## Execution plan

### Goal

Event kilometresi ile current high-water mark'ı ayırıp tarihsel veriyi güvenli ve uyarılı biçimde
kaydetmek.

### Background

TASK-008 record write ile current mileage artışını tek atomic/idempotent RPC'de birleştirdi. V1.1
bu atomikliği bozmadan yalnız düşük event kilometresi yasağını advisory timeline modeline çevirir.

### Current state

Tek production repository write yolu `save_vehicle_record_atomic` RPC'sidir. Authenticated Data API
grant'leri özel bir istemcinin kendi satırına doğrudan yazmasına izin verebilir; uygulama repository
katmanında böyle bir yol yoktur. Delete doğrudan yapılır ve current kilometreyi değiştirmez.

### Scope

Bu task'ın `Scope` bölümü.

### Out of scope

Bu task'ın `Out of scope` bölümü.

### Acceptance criteria

Bu task'ın `Acceptance criteria` bölümü.

### Risks

- Aynı gün event'lerinde güvenilir sıra yoktur; blocking karar verilmez.
- Concurrent record writes vehicle row lock ve idempotency ile seri hale gelmelidir.
- Özel bir authenticated Data API istemcisi atomik RPC'yi atlayabilir; uygulama repository taraması
  bunu normal mobil akış için dışlar, kalan risk completion report'ta görünür tutulur.
- Cost/km hesapları azalan veya bilinmeyen timeline'da hedefli regresyon ister.

### Security/privacy impact

RLS policy ve tablo grant'leri değiştirilmez. RPC sahiplik kontrolü ve güvenli `search_path`
davranışı korunur; normal mobil create/update yolu owner-scoped RPC üzerinden devam eder.

### Relevant files

Bu task'ın `Relevant files` bölümü.

### Implementation steps

1. **Completed:** Branch, mevcut schema/RPC, form/store/repository ve test kapsamını doğrula.
2. **Completed:** Pure timeline evaluator ve hedefli unit testleri ekle.
3. **Completed:** Forward migration ile RPC'nin tarihsel kilometre davranışını uygula.
4. **Completed:** Form/store warning ve blocking davranışını bağla.
5. **Completed:** Targeted unit/repository/route testlerini çalıştır; local SQL testini hazırla.
6. **Completed:** Database dokümanı, diff ve security/privacy review'u tamamla.

### Validation commands

```powershell
npx vitest run src/shared/utils/mileageTimeline.test.ts src/shared/utils/repositoryRules.test.ts src/data/repositories/repositoryContract.test.ts
npx eslint src/shared/utils/mileageTimeline.ts src/shared/utils/mileageTimeline.test.ts src/app/record/edit.tsx src/store/dataStore.ts src/data/repositories/repositoryContract.test.ts
npx tsc --noEmit
# Local-only: migration apply + supabase/tests/historical_odometer.sql
git diff --check
```

### Manual checks

- Android'de 150.000 km araç için geçmiş tarih/148.000 km bakım kaydı ekle; kaydı ve dashboard
  current değerini yeniden açılış sonrası doğrula.
- Çelişkili timeline'da “Düzenle” ve “Yine de kaydet” aksiyonlarını; boş kilometre kaydını test et.

### Rollback strategy

Uzak deploy bu task'ta yoktur. Gelecekte deploy edilirse function değişikliği mevcut migration
silinerek değil, önceki düşük-km politikasını geri getiren yeni forward migration ile geri alınır.
Event verisi silinmez; function davranışı ayrı bir forward-fix migration ile geri alınır.

### Expected output

Forward migration, saf evaluator, hedefli test kanıtı ve Android manuel kabul adımları.

### Do not change

Bu task'ın `Out of scope` bölümü ve kullanıcının mutlak do-not-change listesi.

### Completion report

#### Completed

- Forward migration, pure timeline evaluator ve ortak record form warning akışı uygulandı.
- Dört hedefli Vitest dosyasında 45 test geçti; changed TS/TSX ESLint, QA script `node --check`
  ve `git diff --check` geçti.
- Uygulamanın normal create/update yolunun yalnız `save_vehicle_record_atomic` kullandığı doğrulandı.
- SQL idempotency, owner isolation ve monotonic current kontrolleri local Supabase üzerinde geçti.

#### Skipped

Broad suite, EAS build ve remote Supabase deploy kapsam dışıdır.

#### Failed

`npm run typecheck`, değişiklik dışındaki `tests/routes/authEmailConfirmation.render.test.tsx` ve
`tests/routes/legalLinks.render.test.tsx` hataları nedeniyle başarısız oldu; bu task dosyalarında
yeni TypeScript hatası raporlanmadı. Tek başına `.mjs` ESLint çağrısı repository ESLint
config'indeki eksik `@typescript-eslint` plugin çözümlemesinde durdu; `node --check` geçti.

#### Manual verification required

Yeni Android artifact üzerinde tarihsel kayıt ve warning akışı.

## Commands to run

Execution plan `Validation commands` bölümü geçerlidir.

## Expected outputs

- Tarihsel event kilometresi kaydı, monotonic current high-water mark ve advisory timeline warning.

## Manual device checks

Execution plan `Manual checks` bölümü geçerlidir.

## Do not change

- Mevcut migration history, remote Supabase, EAS/Expo config, dependency, auth ve kapsam dışı ürün
  özellikleri.

## Completion checklist

- [x] `AGENTS.md`, görev ve execution plan okundu/güncellendi.
- [x] Yalnız onaylı kapsam uygulandı.
- [x] Repository/SQL acceptance criteria kanıtlandı; Android kabulü ayrı bekliyor.
- [x] İlgili hedefli otomatik testler çalıştırıldı.
- [x] Diff gözden geçirildi.
- [x] Security/privacy regression kontrolü yapıldı.
- [x] Dokümantasyon güncellendi.
- [x] Completed, skipped, failed ve manual checks ayrı raporlandı.

## Review checklist

- [x] Kapsam dışı değişiklik yoktur.
- [x] Timeline warning ve high-water davranışı negatif senaryolarla kapsanmıştır.
- [x] Cross-user RPC sahiplik sınırı local SQL ile doğrulandı.
- [x] Rollback forward-fix olarak uygulanabilir.

## Human acceptance result

**Result:** NOT REVIEWED
**Reviewed by:** —
**Date:** —
**Notes:** Android artifact kabulü bekleniyor.
