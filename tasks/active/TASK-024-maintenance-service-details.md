# TASK-024 — Maintenance Service Details

**Status:** IMPLEMENTED — AWAITING REMOTE MIGRATION AND ANDROID ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-11
**Updated:** 2026-08-11

## Goal

TASK-017 bakım event/item mimarisini bozmadan bakım kayıtlarına isteğe bağlı servis türü, işletme
adı, parça/işçilik kırılımı, fatura numarası ve TASK-022 eklerini eklemek.

## Background

`vehicle_records` bakım event source-of-truth'udur; `amount` kanonik toplamı, `description` notu ve
`record_date` olay tarihini taşır. TASK-017 `maintenance_items` ile çoklu işlemleri ve atomik save
RPC'sini; TASK-022 private, owner-scoped ortak attachment altyapısını sağlamıştır.

## Current state

- Bakım formu paket/işlem, toplam, kilometre, tarih ve açıklamayı destekler.
- `save_maintenance_record_atomic` event + item yazımını idempotent transaction içinde yapar ve
  TASK-016 monotonic `current_km` davranışını korur.
- `maintenance_record` attachment parent tipi istemci/constraint sözleşmesinde vardır; Edge kabulü,
  repository load/map ve atomik maintenance save henüz etkin değildir.
- Ayrı maintenance note alanı gerekmiyor; mevcut `description` yeniden kullanılacaktır.

## Scope

- Merkezi servis türü kataloğu ve saf normalize/validation/toplam çözümleme domaini.
- Nullable normalized bakım detay kolonları ve backward-compatible sürümlü save RPC'si.
- Bakım formunda küçük, açılır isteğe bağlı detay bölümü ve unified attachment entegrasyonu.
- Mapper/repository/entity ve kompakt history sunumu.
- Hedefli domain, render, mapper, Edge helper ve local SQL/RLS testleri.
- `docs/database.md` veri modeli ve forward-recovery notu.

## Out of scope

- OCR, AI, premium, servis rehberi/puanı, fatura doğrulama, reminder, document, fuel, body veya 3D.
- Remote migration/function deploy, EAS build, Play Console ve geniş UI redesign.

## Acceptance criteria

- [x] Servis türü isteğe bağlıdır ve yalnız merkezi katalog kimliklerini kabul eder.
- [x] Servis adı, parça/işçilik tutarı ve fatura numarası nullable/normalize saklanır.
- [x] Boş maliyet `0` yapılmaz; negatif/geçersiz değer engellenir.
- [x] Kullanıcı toplam girdiyse korunur; yalnız toplam boş ve iki kırılım biliniyorsa deterministik
      olarak toplam türetilir.
- [x] Legacy bakım kaydı yeni alanlar olmadan açılır ve kaydedilir.
- [x] TASK-017 item/package ve TASK-016 kilometre semantiği değişmez.
- [x] TASK-022 attachment akışı `maintenance_record` için private/owner-scoped çalışır.
- [x] User A, User B bakım event'ine detay veya ek yazamaz.
- [x] Hedefli testler geçer; remote deploy ve Android kabulü pending kaydedilir.

## Risks

- Storage upload ile DB transaction tek işlem değildir; upload sonrası metadata save başarısızlığı
  cleanup/reconciliation ile toparlanmalıdır.
- Eski istemci yeni detayları bilmez; eski RPC mevcut nullable detay kolonlarına dokunmayarak veri
  kaybını önlemelidir.
- Pending TASK-017–TASK-024 migration zinciri remote uygulanmadan yeni istemci RPC'yi kullanamaz.

## Security/privacy impact

- Servis adı ve fatura numarası kişisel/işlemsel metadata olabilir; yalnız ürün amacı için tutulur,
  object path/log içinde kullanılmaz.
- Yeni RPC `auth.uid()` ve vehicle/record sahipliğini doğrular, boş `search_path` kullanır; PUBLIC/anon
  execute kapalıdır.
- Private bucket, kısa signed URL, random path, MIME/magic-byte, 5 MB ve ortak kotalar değişmez.

## Relevant files

- `src/features/maintenance/`: servis kataloğu, domain ve isteğe bağlı detay UI'sı.
- `src/app/record/edit.tsx`: bakım create/edit entegrasyonu.
- `src/domain`, `src/data`, `src/store`: normalized sözleşme, mapper ve atomik repository çağrısı.
- `supabase/migrations`, `supabase/tests`, `supabase/functions`: additive schema/RPC/RLS/attachment.
- `docs/database.md`: bakım detay modeli ve rollback/forward recovery.

## Implementation steps

1. **Completed:** Branch, schema, TASK-016/017/022 sözleşmeleri, form, repository ve RLS incelendi.
2. **Completed:** Merkezi bakım detay domaini ve additive migration/RPC oluşturuldu.
3. **Completed:** Optional details UI, mapper/repository ve unified attachments entegre edildi.
4. **Completed:** Hedefli unit/render/Edge/SQL-RLS testleri çalıştırıldı.
5. **Completed:** Diff/security/privacy incelemesi tamamlandı; commit/push/PR ve güvenli merge
   görev sonunda yürütülecek.

## Validation commands

```powershell
npx vitest run <TASK-024 targeted files>
npx eslint <TASK-024 changed app/shared files>
npx tsc --noEmit --pretty false
npx supabase db lint --local --schema public --level warning
npx supabase db advisors --local --type security --level warn --fail-on none
git diff --check
```

Remote deploy, geniş test/E2E/coverage ve EAS build çalıştırılmaz. Local SQL testi mevcut Docker
stack güvenle kullanılabiliyorsa hedefli çalıştırılır.

## Manual checks

- [ ] Android'de temel bakım, detaylı bakım, edit/clear ve legacy kayıt açılışı.
- [ ] Kamera/galeri/PDF ekleme, açma/kaldırma ve yeniden açılış kalıcılığı.
- [ ] Paket/işlem, historical odometer, light/dark ve dar ekran regresyonu.

## Rollback strategy

Uygulama/Edge değişiklikleri feature commit'i revert edilerek eski RPC/form akışına dönebilir.
Migration remote'a uygulanırsa history geri yazılmaz; yeni RPC execute yetkisi forward migration ile
kapatılır ve istemci eski RPC'ye döndürülür. Nullable kolonlar doğrulanmış veri taşıma kararı olmadan
drop edilmez; Storage cleanup queue idempotent kalır.

## Expected output

Kompakt isteğe bağlı bakım detayları, OCR-ready nullable alanlar, unified attachments, additive
owner-scoped RPC/migration, hedefli test kanıtı ve güvenliyse `develop` normal merge sonucu.

## Do not change

- OCR/AI/Premium/3D, package item semantiği, historical odometer, auth/legal/reminder/document/fuel.
- Existing migrations, production Supabase, main/release branch veya version tag'leri.
- Dependencies, package/lockfile, `app.json`, `eas.json`.

## Completion report

### Completed

- `20260811161233_maintenance_service_details.sql` yerel stack'e sıfırdan TASK-024 kapsamıyla
  uygulanıp hedefli SQL/RLS senaryosu geçti.
- 56 hedefli Vitest, 5 route/render ve 2 Edge helper testi geçti; changed-file ESLint temizdir.
- Local DB security advisor temizdir. DB lint yalnız TASK-016/017/020 kaynaklı üç mevcut
  `v_existing` unused-variable warning'i raporladı; TASK-024 fonksiyonunda yeni warning yoktur.
- `git diff --check` temizdir; PII/secret/log regression taramasında yeni bulgu yoktur.

### Skipped

- Geniş test/coverage/E2E, EAS build, remote Supabase migration/function deploy ve Play işlemleri
  görev kapsamı gereği çalıştırılmadı.

### Failed

- Full `tsc --noEmit`, TASK-024 hatası bırakmadan yalnız önceden mevcut auth/legal render testlerindeki
  7 tip hatasıyla başarısızdır. Bu görevde kapsam dışı oldukları için değiştirilmedi.

### Manual verification required

- Fiziksel Android'de create/edit/legacy görünüm, toplam türetme, kamera/galeri/PDF ekleme-açma-silme,
  light/dark ve dar ekran kabulü bekliyor.
- TASK-017–TASK-024 pending migration'ları kronolojik uygulanıp yeni istemci bundan sonra build
  edilmelidir; bu görev remote deploy veya build yapmadı.

## Human acceptance result

**Result:** NOT REVIEWED
**Reviewed by:** —
**Date:** —
**Notes:** Fiziksel Android kabulü bekliyor.
