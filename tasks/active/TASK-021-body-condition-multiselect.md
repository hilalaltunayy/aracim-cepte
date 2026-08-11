# TASK-021 — Body Condition Multi-Select with Compatibility Rules

**Status:** IMPLEMENTED — AWAITING REMOTE MIGRATION AND ANDROID ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-11
**Updated:** 2026-08-11

## Goal

Araç gövde parçalarında tek bir durum yerine birbiriyle uyumlu birden çok durumu güvenli,
geriye uyumlu ve kullanıcıya anlaşılır biçimde saklamak ve düzenlemek.

## Background

Mevcut V1 modeli `body_part_conditions` içinde araç/şema/parça başına tek `condition` saklıyor.
Gerçek ekspertiz verisinde bir parça hem boya/değişim durumuna hem de ayrıca hasar bilgisine sahip
olabilir. TASK-019'un 3D sedan POC davranışı ve dosyaları bu görevde değiştirilmez.

## Current state

- `body_part_conditions` araç/şema/parça için tekil parent satır ve tek enum durum taşır.
- Uygulama `SupabaseAppRepository.saveBodyCondition` ile doğrudan owner-scoped upsert yapar.
- `BodyConditionScreen` tek seçimli `SelectField` kullanır.
- `BodyDiagram` ve araç özeti tek representative `condition` rengi/sayımı kullanır.
- Legacy satırlar korunmalı; yeni model mevcut satırlara yapay ek durum yazmamalıdır.

## Scope

- Merkezi durum kataloğu, uyumluluk, toggle, normalizasyon ve representative durum kuralları.
- Additive child-table migration, owner-scoped RLS ve atomik panel durum seti RPC'si.
- Legacy tek durum satırlarının read-time singleton dönüşümü.
- Mevcut 2D gövde ekranında erişilebilir çoklu seçim ve okunabilir durum özeti.
- Repository/store/domain/type mapping uyarlaması.
- Hedefli domain, render ve yerel SQL/RLS testleri.
- `docs/database.md` veri modeli ve rollback/forward-recovery notu.

## Out of scope

- 3D sahne, kamera, asset, gövde paneli geometri veya TASK-019 davranış değişikliği.
- Hatırlatıcı, yakıt, bakım paketi, OCR, AI, premium, auth veya araç taksonomisi değişikliği.
- Remote Supabase deploy, EAS build, Play Console veya release branch değişikliği.

## Acceptance criteria

- [x] Bir primary durum (`original`, `painted`, `locally_painted`, `replaced`) aynı anda en fazla
      bir tane seçilebilir.
- [x] `damaged` bilinen bir primary durumla birlikte seçilebilir.
- [x] `unknown` başka hiçbir durumla birlikte saklanamaz.
- [x] Boş seçim geçerlidir ve `unknown` olarak sessizce dönüştürülmez.
- [x] Legacy tekli satırlar veri rewrite olmadan singleton set olarak okunur.
- [x] Yeni yazma işlemi parent ve child durumlarını tek transaction içinde günceller.
- [x] User A, User B'nin durumlarını okuyamaz veya değiştiremez.
- [x] Araç silme parent ve child durumları cascade ile temizler.
- [x] 2D temsil rengi merkezi deterministic priority kuralından gelir; bütün gerçek durumlar metinle
      görünür kalır.
- [ ] Targeted domain/UI/SQL testleri geçer ve TASK-019 dosyaları değişmez.

## Risks

- Eski istemcinin parent `condition` alanına doğrudan yazması child setiyle ayrışabilir. Migration
  trigger'ı legacy write'ı tekli moda döndürerek riski azaltır.
- Explicit boş set, `condition_set_initialized=true` marker'ı ve sıfır child satırla temsil edilir;
  legacy representative `unknown` yalnız eski istemci uyumluluğu içindir, yeni read model boş kalır
  ve panel notu korunur.
- Migration henüz remote'a uygulanmadan yeni client sorgusu yeni tablo/RPC'yi bulamaz; deploy ve
  APK sırası release göreviyle koordine edilmelidir.

## Security/privacy impact

- Yeni tablo `authenticated` için yalnız SELECT grant alır; yazma yalnız owner doğrulayan
  `SECURITY DEFINER` RPC ile yapılır.
- RPC güvenli boş `search_path`, `auth.uid()` kontrolü, PUBLIC/anon revoke ve authenticated grant
  kullanır.
- Durum verisi owner-scoped kalır; yeni PII, log, Storage veya üçüncü taraf aktarımı yoktur.
- Negatif RLS ve foreign-owner RPC testleri zorunludur.

## Relevant files

- `src/features/bodyCondition/`: katalog, domain kuralları, 2D diagram ve seçim UI'si.
- `src/app/body-condition/index.tsx`: ekran formu ve özet.
- `src/domain/entities/index.ts`, `src/domain/repositories/AppRepository.ts`: sözleşmeler.
- `src/data/repositories/SupabaseAppRepository.ts`, `src/data/mappers/databaseMappers.ts`:
  persistence/read normalization.
- `src/data/supabase/database.types.ts`: additive tablo/RPC type sözleşmesi.
- `src/store/dataStore.ts`: çoklu set save akışı.
- `supabase/migrations/`: forward migration.
- `supabase/tests/body_condition_multiselect.sql`: hedefli SQL/RLS kanıtı.
- `docs/database.md`: current architecture source-of-truth.

## Implementation steps

1. **Completed:** Mevcut schema, RLS, repository, UI, analytics ve 3D sınırı incelendi.
2. **Completed:** Merkezi çoklu durum domain kuralları ve veri sözleşmesi oluşturuldu.
3. **Completed:** Additive child tablo, legacy marker/trigger, atomik RPC ve RLS migration'ı yazıldı.
4. **Completed:** Repository/store/UI multi-select akışı uyarlandı.
5. **Completed:** Targeted domain/render/SQL testleri ve dar statik kontroller çalıştırıldı.
6. **Completed:** Diff, güvenlik/gizlilik ve dokümantasyon incelemesi tamamlandı.
7. **In progress:** Commit/push/PR; güvenliyse normal merge ile `develop` güncellenecek.

## Validation commands

```powershell
npx vitest run src/features/bodyCondition
npx vitest run src/shared/utils/businessLogic.test.ts
npx eslint src/features/bodyCondition src/app/body-condition/index.tsx src/domain/entities/index.ts src/domain/repositories/AppRepository.ts src/data/mappers/databaseMappers.ts src/data/repositories/SupabaseAppRepository.ts src/store/dataStore.ts
npx tsc --noEmit
git diff --check
```

Yerel Supabase mevcutsa yalnız yeni migration ve `supabase/tests/body_condition_multiselect.sql`
hedefli olarak çalıştırılır. Remote deploy yapılmaz.

## Manual checks

- [ ] Fiziksel Android'de her uyumlu/uyumsuz seçim, clear ve restart persistence.
- [ ] Light/dark temada chip, label, representative diagram rengi ve TalkBack durumu.
- [ ] Legacy tekli gövde kaydı, not ve summary görünümü.
- [ ] Dar ekranda editor/özet yerleşimi.

## Rollback strategy

Uygulama değişiklikleri feature commit'i revert edilerek geri alınabilir. Remote'a uygulandıktan
sonra migration history geri yazılmaz: gerekirse yeni forward migration ile RPC erişimi kapatılır,
istemci legacy parent `condition` okumaya döndürülür ve child tablo verisi korunur. Parent legacy
kolonu kaldırılmadığı için veri kayıpsız geri dönüş noktası vardır.

## Expected output

- Multi-condition domain/config, additive migration/RPC/RLS, repository mapping ve mevcut 2D
  ekranda minimum çoklu seçim UI'si.
- Targeted otomatik ve yerel SQL kanıtı.
- Commit, origin feature branch, PR ve güvenliyse `develop` normal merge sonucu.

## Do not change

- `src/features/vehicle3d/`, 3D asset/dependency/config ve TASK-019 davranışı.
- Hatırlatıcı, yakıt, bakım, OCR, AI, premium, auth, legal, app/eas config.
- Existing migrations, production Supabase, main/release branches ve version tags.

## Completion report

### Completed

- `src/features/bodyCondition/` altında merkezi katalog, compatibility/toggle/normalization ve
  erişilebilir multi-select component eklendi.
- `20260811140844_body_condition_multiselect.sql` yerel PostgreSQL 17 üzerinde temiz uygulanıp
  hedefli transactional SQL/RLS scripti geçti.
- Vitest: 4 dosya, 25 test geçti.
- Hedefli ESLint ve `git diff --check` geçti.
- DB lint TASK-021 fonksiyonlarında uyarı üretmedi.
- Legacy singleton, explicit empty, multi-condition, representative display ve analytics testleri
  geçti.

### Skipped

- Remote Supabase deploy, EAS build, geniş regression/coverage.
- Fiziksel Android render/persistence testi bu ortamda çalıştırılmadı.

### Failed

- `npx tsc --noEmit`, TASK-021 dışındaki mevcut
  `tests/routes/authEmailConfirmation.render.test.tsx` ve
  `tests/routes/legalLinks.render.test.tsx` dosyalarında toplam 7 hata nedeniyle exit 1 verdi;
  TASK-021 dosyası hata listesinde yer almadı.
- DB lint, TASK-021 dışındaki üç eski record RPC'sinde `v_existing` kullanılmıyor uyarısını korudu.

### Manual verification required

- Android cihaz ve tema/TalkBack kontrolleri bekliyor.
- Remote migration deploy sırası ve yeni client build'i ayrı release görevi gerektiriyor.

## Review checklist

- [x] Kapsam dışı veya TASK-019 değişikliği yok.
- [x] Domain uyumluluk matrisi ve DB doğrulaması aynı sonucu verir.
- [x] RLS negative testleri geçer.
- [x] Legacy ve boş set davranışı kanıtlanır.
- [x] Rollback/forward recovery uygulanabilir.

## Human acceptance result

**Result:** NOT REVIEWED
**Reviewed by:** —
**Date:** —
**Notes:** Fiziksel Android kabulü bekliyor.
