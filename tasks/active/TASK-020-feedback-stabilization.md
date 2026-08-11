# TASK-020 — Feedback Stabilization Pack

**Status:** IMPLEMENTED — AWAITING ANDROID DEVICE ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-11
**Updated:** 2026-08-11

## Task ID

TASK-020

## Goal

Geçmiş tarihli hatırlatıcıların yanlışlıkla kaydedilmesini önlemek; yakıt girişinde toplam tutar,
litre ve litre fiyatından herhangi ikisiyle üçüncüyü güvenli biçimde hesaplamak; yakıt istasyonunu
opsiyonel ve normalize edilmiş veri olarak saklamak.

## Current behavior

- Hatırlatıcı kaydı notification trigger geçmişte olsa bile önce veritabanına yazılabiliyor.
- Yakıt kaydı toplam tutarı zorunlu, litre opsiyonel UI gibi görünse de veritabanındaki eski
  `fuel_requires_liters` constraint'i toplam-tutar-only kaydı engelliyor.
- Litre fiyatı ve istasyon alanları mevcut domain/şema/RPC sözleşmesinde yok.

## Scope

- [x] Yeni/düzenlenen tarihli hatırlatıcılar için seçilen yerel saati (varsayılan 09:00) kullanan geçmiş-zaman guard.
- [x] Toplam tutar/litre/litre fiyatı için iki-değerden-üçüncüyü hesaplayan saf domain modeli.
- [x] Toplam-tutar-only yakıt kaydı ve bilinmeyen değerler için `null` semantiği.
- [x] Merkezi yakıt istasyonu kataloğu ve opsiyonel form seçimi.
- [x] Additive migration, yeni geriye uyumlu RPC sürümü ve RLS/ownership koruması.
- [x] Hedefli domain, repository, form/route ve yerel SQL doğrulamaları.

## Out of scope

- OCR, canlı yakıt fiyatı, AI, premium, gezi planlama, bakım, belge, gövde/3D, auth ve parola akışları.
- Remote Supabase deploy, EAS build, Play Console ve geniş regression suite.

## Acceptance criteria

- [x] Geçmiş hedef zamanı ve aynı gün seçilen saatten sonraki save/schedule engellenir.
- [x] Aynı gün gelecekteki saat ve gelecek tarihler kaydedilebilir.
- [x] Eski geçmiş hatırlatıcı okunabilir/silinebilir; geçmişe düzenleme kaydedilemez.
- [x] Yakıt alanlarından geçerli iki değer üçüncüyü deterministik hesaplar ve kullanıcı girdisini ezmez.
- [x] Yalnız toplam tutarlı yakıt kaydı litre/fiyat için `null` saklar.
- [x] İstasyon seçimi opsiyonel, merkezi sabit ID'li ve legacy kayıtlarla uyumludur.
- [x] Migration mevcut veriyi korur; owner-scoped/idempotent RPC ve monotonic kilometre davranışı sürer.

## Security/privacy requirements

- Yeni kolonlar PII içermez; istasyon yalnız katalog ID'sidir.
- Mevcut `vehicle_records` RLS sahiplik sınırı korunur.
- Yeni RPC authenticated-only, owner-scoped, güvenli `search_path` ve idempotent olmalıdır.
- Loglara kullanıcı verisi, token veya ham provider hatası eklenmez.

## Relevant files

- `src/app/reminder/edit.tsx`: geçmiş-zaman form guard'ı.
- `src/features/reminders/`: saf tarih/saat doğrulama ve notification kuralları.
- `src/app/record/edit.tsx`: yakıt hesaplama ve istasyon seçimi.
- `src/features/fuel/`: merkezi domain/config.
- `src/domain/entities/index.ts`: yakıt alanları.
- `src/data/`: mapper, repository ve generated schema sözleşmesi.
- `supabase/migrations/`: additive şema/RPC değişikliği.

## Commands to run

```powershell
npx vitest run <TASK-020 hedefli test dosyaları>
npx eslint <değişen TypeScript/TSX dosyaları>
npx tsc --noEmit
npx supabase db push --local
git diff --check
```

## Expected outputs

- Geçmiş reminder guard, akıllı yakıt girişi ve normalize istasyon alanı.
- Hedefli test ve yerel migration/RPC kanıtı.

## Manual device checks

- [ ] Android'de geçmiş/gelecek/aynı-gün hatırlatıcı kaydı ve notification schedule sonucu.
- [ ] Üç yakıt hesaplama yönü, kullanıcı override'ı, total-only ve edit akışı.
- [ ] İstasyon seçme/temizleme ve uygulamayı yeniden açınca kalıcılık.

## Do not change

- TASK-017/018/019 davranışları, auth, theme, dashboard, maintenance, 3D ve remote sistemler.

## Rollback strategy

Uygulama diff'i normal revert ile geri alınabilir. Migration production'a uygulanırsa kolonlar ve
RPC hemen silinmez; eski istemci/RPC korunarak forward-fix yapılır. Bu görev remote deploy yapmaz.

## Execution plan

### Current state

Reminder formu tarihli kaydı saat düzeyinde doğrulamadan önce DB'ye yazıyor; reconciliation geçmiş
trigger'ı ancak kayıttan sonra reddediyor. Yakıt formu/şeması toplam ve litreyi biliyor; eski DB
constraint'i litreyi fiilen zorunlu tutuyor. Fiyat ve normalize istasyon alanı yok.

### Risks

- Eski istemci RPC sözleşmesini bozmak: önceki fonksiyon korunur, yeni alanlar v2 RPC'de eklenir.
- Hesaplanan alan feedback loop'u: yalnız manuel alan seti source-of-truth olur.
- Aynı gün reminder sınırı: seçilen yerel saat kullanılır; legacy/null değerler merkezi 09:00
  fallback'ini korur.
- Doğrudan Data API write mevcut owner-scoped RLS sınırında kalır; DB constraint sahte/yanlış
  scoped yakıt alanlarını engeller.

### Implementation steps

1. **Completed:** Branch, reminder/repository/notification ve fuel/RPC/schema akışını incele.
2. **Completed:** Saf reminder datetime guard ve repository pre-write savunmasını ekle.
3. **Completed:** Yakıt hesaplama/validation domain'i ve merkezi istasyon kataloğunu ekle.
4. **Completed:** Form, entity, mapper ve repository sözleşmelerini bağla.
5. **Completed:** Additive migration/RPC, hedefli SQL ve TypeScript testlerini doğrula.
6. **Completed:** Tam diff/security review ve completion evidence kaydını tamamla.

### Validation commands

Bu görevin `Commands to run` bölümündeki hedefli komutlar; ayrıca
`supabase/tests/feedback_stabilization_fuel.sql` local Docker Postgres üzerinde
`psql -v ON_ERROR_STOP=1` ile çalıştırılır.

### Manual checks

Bu görevin `Manual device checks` bölümündeki fiziksel Android akışları.

### Expected output

Geçmiş reminder save/schedule olmaması, üç yönlü deterministik fuel calculation, total-only kayıt,
normalize opsiyonel istasyon ve geriye uyumlu local-validated migration.

## Completion checklist

- [x] Yalnız onaylı kapsam uygulandı.
- [x] Hedefli testler çalıştırıldı: 11 dosya, 87/87 test geçti.
- [x] Local SQL/RLS kontrolleri iki rollback transaction'ında geçti; `db lint` sıfır error.
- [x] Değişen dosya ESLint kontrolü geçti; `git diff --check` geçti.
- [x] Full `tsc --noEmit` yalnız önceden mevcut auth/legal render test tip hatalarında kaldı.
- [x] Diff ve security/privacy regression kontrolü yapıldı.
- [x] Remote deploy/build yapılmadı; manuel Android kabulü açık bırakıldı.

## Completion report

### Completed

- Reminder seçili yerel tarih+saat guard'ı UI ve repository pre-write sınırında uygulandı.
- Üç yönlü fuel calculation, total-only validation ve normalize istasyon persistence eklendi.
- `20260811133756_feedback_stabilization_fuel_fields.sql` ve
  `20260811134804_reminder_due_time.sql` local Docker Postgres üzerinde uygulandı.
- Hedefli Vitest 87/87, changed-file ESLint ve local DB lint geçti.

### Skipped

- Full Vitest, EAS build ve remote Supabase deploy görev politikası gereği çalıştırılmadı.
- `supabase db push --local`, TASK-020 migration'ından önceki bilinen `rls_auto_enable` privilege
  migration hatasında durduğu için migration'lar doğrudan local Postgres'e `ON_ERROR_STOP` ile
  uygulanıp hedefli rollback SQL testleri çalıştırıldı.

### Failed

- `npx tsc --noEmit`: yalnız `tests/routes/authEmailConfirmation.render.test.tsx` ve
  `tests/routes/legalLinks.render.test.tsx` içindeki önceden mevcut tip hataları; TASK-020 dosyası
  raporlanmadı.

### Manual verification required

- Bu dosyanın `Manual device checks` bölümündeki reminder saat, fuel hesap/edit ve station
  persistence akışları fiziksel Android APK üzerinde bekliyor.

## Human acceptance result

**Result:** NOT REVIEWED
**Reviewed by:** —
**Date:** —
**Notes:** Fiziksel Android kabulü bekliyor.
