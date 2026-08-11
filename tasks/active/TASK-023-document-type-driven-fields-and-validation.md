# TASK-023 — Document Type-Driven Fields and Validation

**Status:** IMPLEMENTED — AWAITING REMOTE MIGRATION AND ANDROID ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-11
**Updated:** 2026-08-11

## Goal

Araç belgesi formunu belge türüne göre anlamlı alanlar ve doğrulamalar gösterecek biçimde
geliştirmek; legacy belgeleri, private Storage/RLS sınırlarını ve TASK-022 attachment altyapısını
korumak.

## Background

Mevcut form her belge için başlık, belge numarası, düzenlenme tarihi ve bitiş tarihi gösterir.
Sigorta, ruhsat, muayene ve ekspertiz belgelerinin anlamlı metadata alanları farklıdır. Gelecekteki
OCR akışının temiz alanlara yazabilmesi gerekir ancak OCR bu görevin kapsamı dışındadır.

## Current state

- `vehicle_documents`, generic `document_number`, `issue_date`, `expiry_date`, `note` ve legacy
  `attachment_path` alanlarını içerir.
- Owner/vehicle doğrulaması RLS ve `save_vehicle_document_consistent` / delete RPC'leriyle korunur.
- Belge formu bütün türler için aynı alanları render eder ve yalnız genel tarih sıralamasını kontrol
  eder.
- TASK-022 `attachments` tablosu ve birleşik kamera/galeri/dosya UI'sı vardır; `vehicle_document`
  parent türü şemada tanımlı olsa da rezervasyon/save akışı yalnız ekspertiz için etkindir.
- Süre durumu 30 günlük sabit eşikle türetilir; süresi dolan belge listede kalır.

## Scope

- Merkezi belge türü/alan kataloğu, saf type-specific validation ve expiry status domaini.
- Nullable, additive belge metadata alanları ve backward-compatible owner-scoped save RPC'si.
- Belge create/edit ekranında config-driven alanlar ve TASK-022 birleşik attachment akışı.
- Legacy generic alan/tek ek fallback'i ve mevcut belge türlerinin korunması.
- Hedefli domain, mapper, render, Edge helper ve SQL/RLS kanıtları.
- `docs/database.md` veri modeli ve rollback notu.

## Out of scope

- OCR, AI, premium, otomatik belge silme, archive yönetimi, yeni reminder/notification motoru.
- Maintenance, fuel, body condition, 3D, auth, legal veya genel UI redesign.
- Remote Supabase deploy, EAS build, Play Console.

## Acceptance criteria

- [x] Belge türleri ve gösterilen/zorunlu alanlar tek katalogdan gelir.
- [x] Sigorta ve muayene tarih sırası yalnız ilgili türlerde doğrulanır.
- [x] Ruhsat, ekspertiz ve diğer belge ilgisiz sigorta alanlarını zorunlu tutmaz.
- [x] Legacy `issue_date`, yeni metadata yokken türüne göre deterministik tarih fallback'i sağlar.
- [x] Legacy attachment ve yeni birleşik attachment listesi birlikte güvenli açılır.
- [x] Süre durumu `active`, `expiring_soon`, `expired`, `no_expiry` olarak merkezi eşikten türetilir;
      expired belge silinmez.
- [x] Yeni migration additive, owner isolation/RLS ve private Storage sözleşmesi korunur.
- [x] Hedefli testler ve changed-file kontrolleri geçer; Android kabulü bekleyen kaydedilir.

## Risks

- Eski Android istemciler generic RPC'yi kullanmaya devam ederken yeni istemci normalized RPC'yi
  kullanacaktır; legacy `issue_date` ile yeni `event_date` uyumu korunmalıdır.
- Upload tamamlanıp metadata save başarısız olursa orphan object cleanup/reconciliation'a bırakılır;
  kullanıcıya erken başarı gösterilmemelidir.
- Pending TASK-017–TASK-022 migration sırası bozulursa TASK-023 migration'ı uygulanamaz.

## Security/privacy impact

- Yeni alanlar yalnız belge davranışı için gerekli kurum/tarih/numara metadata'sıdır; kimlik numarası,
  plaka veya yeni hassas alan eklenmez.
- `attachments` direct authenticated write kapalı kalır; save RPC `auth.uid()`, owner vehicle ve parent
  eşleşmesi yapar, `search_path` boş ve PUBLIC/anon execute kapalıdır.
- Private bucket, random owner-scoped path, MIME/magic-byte, 5 MB ve ortak 10 belge/25 MB limitleri
  değişmez.

## Relevant files

- `src/features/documents/`: katalog, validation/status, form bileşeni ve testler.
- `src/app/documents/`: liste ve create/edit entegrasyonu.
- `src/domain/entities/index.ts`: normalized belge ve attachment sözleşmesi.
- `src/data/`: mapper, repository ve Supabase generated type uyarlaması.
- `supabase/migrations/`, `supabase/tests/`: additive metadata/RPC/RLS doğrulaması.
- `supabase/functions/upload-attachment/`: `vehicle_document` parent kabulü.
- `docs/database.md`: veri modeli ve rollback.

## Implementation steps

1. **Completed:** Git, görev, mevcut schema/RLS/RPC/form/attachment/status akışı incelendi.
2. **Completed:** Merkezi belge domaini ile additive migration/RPC sözleşmesi oluşturuldu.
3. **Completed:** Document create/edit/list UI ve repository/mappers yeni sözleşmeye bağlandı.
4. **Completed:** Hedefli unit/render/Edge/SQL-RLS testleri ve changed-file kontrolleri çalıştırıldı.
5. **Completed:** Diff, security/privacy ve dokümantasyon incelemesi yapıldı. Git/PR sonucu final raporda kaydedilir.

## Validation commands

```powershell
npx vitest run <TASK-023 targeted test files>
npx eslint <TASK-023 changed TypeScript/TSX files>
npx tsc --noEmit
npx supabase db lint --local --schema public --level warning
git diff --check
```

Remote deploy, geniş E2E, broad coverage ve EAS build çalıştırılmaz. Yerel SQL/RLS testi yalnız Docker
ve mevcut stack güvenle kullanılabiliyorsa hedefli çalıştırılır.

## Manual checks

- [ ] Fiziksel Android'de her belge türünde doğru alanlar, tarih hatası ve legacy edit.
- [ ] Kamera/galeri/dosya ekleme, açma, kaldırma ve yeniden açılış kalıcılığı.
- [ ] Expired belgenin görünür kalması, light/dark ve dar ekran davranışı.

## Rollback strategy

Uygulama/Edge değişiklikleri feature commit'i revert edilerek eski generic form/RPC'ye dönebilir.
Migration remote'a uygulandıysa history geri yazılmaz; yeni RPC execute yetkisi forward migration ile
kapatılır ve yeni client eski RPC'ye döndürülür. Nullable kolonlar ile legacy alanlar doğrulanmış veri
taşıma kararı olmadan drop edilmez.

## Expected output

Type-driven belge formu, OCR-ready normalized alan sözleşmesi, birleşik attachments, additive güvenli
migration, targeted kanıt ve güvenliyse `develop` normal merge sonucu.

## Do not change

- OCR/AI/Premium, reminder motoru, maintenance/fuel/body/3D/auth/legal.
- Existing migrations, production Supabase, main/release branches veya version tags.
- Dependencies, `package.json`, lockfiles, `app.json`, `eas.json`.

## Completion report

### Completed

- Dokuz mevcut belge türü tek config-driven katalogdan yönetiliyor; sigorta, ruhsat, muayene,
  ekspertiz ve diğer türler yalnız anlamlı alanlarını gösteriyor.
- Nullable `issuer_name`, `start_date`, `event_date` kolonları, backward-compatible tarih sync'i,
  atomik belge/attachment save RPC'si ve silme cleanup trigger'ı forward migration'a eklendi.
- TASK-022 kamera/galeri/dosya akışı `vehicle_document` parent türüne açıldı; private bucket, random
  owner-scoped path, MIME/magic-byte, 5 MB ve quota kontrolleri değişmedi.
- Legacy `issue_date` ve `attachment_path` fallback'leri korundu; expired belgeler silinmeden merkezi
  30 günlük eşikle sınıflandırılıyor.
- Targeted Vitest: 52/52; Edge helper: 2/2; yerel hedefli SQL/RLS: PASS; app/shared changed-file
  ESLint, Prettier, Supabase security advisor ve `git diff --check`: PASS. Edge entry importları
  Node ESLint resolver'ında çözülemedi; helper testi ve format kontrolüyle doğrulandı.

### Skipped

- Remote Supabase deploy, broad E2E/coverage, EAS build ve Play Console bu görevin kapsamı dışında.
- Fiziksel Android kabulü artifact olmadan çalıştırılmadı.

### Failed

- `npx supabase migration up --local`, TASK-023'ten önceki
  `20260728140259_harden_rls_auto_enable.sql` migration'ında eksik `public.rls_auto_enable()` nedeniyle
  durdu. TASK-023 migration'ı mevcut local stack'e doğrudan uygulanıp hedefli SQL/RLS testi geçti;
  geçmiş migration bu görevde değiştirilmedi.
- Tam `npx tsc --noEmit`, TASK-023 dışındaki mevcut auth/legal render testlerinin bilinen tip
  hataları nedeniyle başarısız. TASK-023 dosyaları için changed-file lint ve hedefli testler geçti.

### Manual verification required

- Fiziksel Android'de tür değiştirme, alan görünürlüğü, validation, legacy edit, attachment
  ekleme/açma/kaldırma, yeniden açılış kalıcılığı ve light/dark/dar ekran kabulü bekliyor.
- Pending TASK-017–TASK-023 migration zinciri remote deploy öncesi kontrollü doğrulanmalı.

## Human acceptance result

**Result:** NOT REVIEWED
**Reviewed by:** —
**Date:** —
**Notes:** Fiziksel Android kabulü bekliyor.
