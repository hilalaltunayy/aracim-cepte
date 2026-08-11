# TASK-025B — Real On-Device OCR Provider Integration

**Status:** IMPLEMENTED — AWAITING ANDROID OCR ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-11
**Updated:** 2026-08-11

## Goal

TASK-025'in geçici OCR sağlayıcısını, belgeyi cihaz dışına göndermeyen gerçek Android OCR motoruyla bağlamak; sonuçları yalnız düzenlenebilir, geçici öneri olarak bırakmak.

## Current state

- `DocumentOcrProvider`, parser, review ve açık `Forma aktar`/ayrı `Kaydet` hattı TASK-025'te vardır.
- Varsayılan sağlayıcı artık `expo-mlkit-ocr@0.2.7` adapter'ıdır; missing/stale native binary güvenli `unavailable` fallback'i alır.
- Paket Expo Modules API üzerinden Android Google ML Kit Text Recognition 16.0.1 kullanır ve local URI kabul eder. Peer aralıkları mevcut Expo/React/RN sürümlerini kabul eder; gerçek cihaz/build uyumluluğu Android kabulünde doğrulanmalıdır.

## Scope

- Tam sürümü sabitlenmiş yerel OCR modülü, mevcut provider abstraction adapter'ı ve hedefli mock testleri.
- Provider sonucunun mevcut parser/review hattına bağlanması.
- TASK-025B kanıtı ve OCR privacy sınırının güncellenmesi.

## Out of scope

- PDF OCR, cloud/AI sağlayıcısı, OCR auto-save, database migration, Supabase/Storage/RLS değişikliği, OCR kotası, fuel/maintenance OCR, EAS build ve geniş test paketi.

## Acceptance criteria

- [x] JPG/JPEG/PNG local URI, on-device provider'dan raw text alıp mevcut parser'a gider.
- [x] Raw text kalıcılaştırılmaz veya loglanmaz; sonuç yalnız açık `Forma aktar` sonrası unsaved forma gelir.
- [x] No-text, provider hatası ve PDF güvenli manuel-entry fallback verir.
- [x] Provider adapter, parser/review güvenliği için hedefli testler geçer.
- [x] Yeni Android build gereksinimi ve fiziksel cihaz doğrulaması açıkça kaydedilir.

## Security/privacy requirements

- OCR kullanıcı tarafından başlatılır; attachment byte'ları, raw text, PII veya secret dış servise/loga/Supabase'e gönderilmez.
- TASK-022 private Storage/owner scope ve TASK-023 form validation değişmez.

## Execution plan

1. **Completed:** `origin/develop` ve TASK-025 mimarisi incelendi; branch `feature/real-document-ocr` oluşturuldu.
2. **Completed:** `expo-mlkit-ocr@0.2.7` exact dependency olarak kuruldu; lazy local adapter mevcut service'in varsayılan sağlayıcısı oldu.
3. **Completed:** Mock tabanlı adapter/service/review/unmount hedef testleri çalıştırıldı.
4. **Completed:** Diff, source/privacy scan, Expo native compatibility ve Android Metro export kontrolü tamamlandı.
5. **In progress:** Commit, push, PR diff incelemesi ve normal `develop` merge'i.

## Validation commands

- `npx vitest run` ile yalnız TASK-025/TASK-025B OCR testleri.
- Değişen TypeScript/TSX dosyaları için ESLint, `npx tsc --noEmit --pretty false`, `npx expo-doctor`, `git diff --check`.

## Manual device checks

- [ ] Yeni Android development/production build'de clear JPG/PNG ekleyip OCR sonucunu review/edit/apply akışında doğrulama.
- [ ] No-text, unreadable file, PDF, uygulama kapanması ve manual entry fallback doğrulama.
- [ ] Save öncesi Supabase/document metadata'sının değişmediğini; Save sonrası normal akışın çalıştığını doğrulama.

## Rollback strategy

Provider adapter ve exact dependency tek feature commit revert'i ile geri alınabilir. Migration, uzak durum, Storage policy veya kalıcı OCR verisi yoktur; manuel belge akışı aynı kalır.

## Do not change

- Supabase schema/migration/RLS/Storage, auth, reminder, dashboard, theme, user data, EAS/Play ve diğer özellik davranışları.

## Completion report

### Completed

- İlave transitive runtime dependency'si olmayan `expo-mlkit-ocr@0.2.7` exact sürümü eklendi. Android adapter'ı yalnız local URI'yi Google ML Kit'e verir; native binary bulunmazsa güvenli `provider_unavailable` fallback'i döner.
- Mevcut parser/review/apply/save ayrımı değişmeden korundu. Raw text/log/analytics/Supabase write eklenmedi; PDF hâlâ güvenle destek dışıdır.
- Targeted Vitest: 5 dosya, 17/17 geçti. Adapter success/no-text/failure, parser hand-off, no auto-persist, manual overwrite koruması, unsupported PDF ve unmount güvenliği kapsandı.
- Changed TypeScript/TSX ESLint ve `git diff --check` geçti. Android `expo export:embed --eager --platform android --dev false` geçti.
- `expo-doctor`: yeni OCR paketi için özel hata vermedi; mevcut projedeki dokuz SDK 57 patch-version drift uyarısı önceden vardır ve kapsam gereği güncellenmedi.

### Skipped

- EAS build, physical Android OCR, remote Supabase, geniş test/coverage ve dependency upgrade çalıştırılmadı.

### Failed

- Tam `tsc --noEmit`, TASK-025B dosyalarında hata olmadan önceden mevcut auth/legal render testlerindeki yedi tip hatasıyla başarısızdır.

### Manual verification required

- Yeni Android build gereklidir (Expo Go native modülü içermez). Clear JPG/PNG ile gerçek tanıma, no-text/unreadable image, PDF fallback, review/edit/apply, Save öncesi persistence olmaması ve normal Save akışı fiziksel cihazda doğrulanmalıdır.

## Human acceptance result

**Result:** NOT REVIEWED
**Reviewed by:** —
**Date:** —
**Notes:** New Android native build and physical-device OCR acceptance are required.
