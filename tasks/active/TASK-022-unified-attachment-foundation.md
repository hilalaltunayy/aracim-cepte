# TASK-022 — Unified Attachment Foundation

**Status:** IMPLEMENTED — AWAITING REMOTE MIGRATION AND ANDROID ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-11
**Updated:** 2026-08-11

## Goal

Ekspertiz raporunda kamera, galeri ve dosya seçiciden gelen ekleri tek güvenli attachment modeli,
tek görünür liste ve tek birleşik kota havuzunda saklamak; altyapıyı sonraki belge/OCR kullanımına
yeniden kullanılabilir bırakmak.

## Background

Mevcut V1 akışı `vehicle-attachments` private bucket'ına PDF/JPEG/PNG yükler, kullanıcı genelinde
10 dosya/25 MB ve dosya başına 5 MB server-side sınır uygular. `expertise_reports.attachment_path`
ve `vehicle_documents.attachment_path` yalnız bir legacy eki temsil eder. Galeri ve belge seçici
vardır; kamera plugin yapılandırmasında kapalıdır ve görseller boyutlandırılmaz.

## Current state

- `expo-image-picker` ve `expo-document-picker` SDK 57 uyumlu sürümleri kurulu.
- `AttachmentField` iki büyük düğmeyle tek `PickedAttachment` seçer.
- Upload Edge Function magic-byte/MIME/5 MB doğrulaması, reservation, owner-prefixed random path ve
  cleanup queue kullanır.
- Bucket private; 60 saniyelik signed URL ile açılır; doğrudan public URL kullanılmaz.
- Existing metadata tek `attachment_path` alanıdır; çoklu ve acquisition-source metadata yoktur.

## Scope

- Merkezi attachment model/config/validation/path/picker/compression katmanı.
- `camera`, `gallery`, `document` kaynaklarının tek pending/persisted listede birleşmesi.
- Ekspertiz create/edit akışında kompakt “Dosya ekle” seçim yüzeyi ve unified list.
- Additive generic attachment metadata tablosu, parent-scoped reservation ve atomik ekspertiz save
  RPC'si; owner RLS ve cleanup/reconciliation uyarlaması.
- Legacy `expertise_reports.attachment_path` için read-time fallback.
- Expo Image Picker kamera izni ve SDK 57 ImageManipulator bağımlılığı.
- Hedefli domain/UI/Edge/SQL/RLS testleri ve veri modeli dokümantasyonu.

## Out of scope

- OCR, AI sağlayıcısı, premium/paywall, vehicle profile photo/gallery.
- Bakım ve araç belgesi ekranlarının yeni çoklu modele taşınması.
- 3D, body condition, yakıt, reminder, auth veya legal davranışı.
- Remote Supabase deploy, EAS build, Play Console.

## Acceptance criteria

- [x] Kamera, galeri ve dosya seçenekleri tek attachment listesine eklenir.
- [x] Kaynak türü yalnız metadata'dır; count/byte limitleri tüm kaynakları birlikte sayar.
- [x] Kamera izni yalnız kamera seçildiğinde istenir; red/cancel/error parent ekranı bozmaz.
- [x] Galeri/kamera görselleri merkezi max dimension/quality ile yerelde küçültülür.
- [x] PDF/JPEG/PNG dışı veya 5 MB üzeri dosya client ve server doğrulamasında reddedilir.
- [x] Per-entity count/byte ve mevcut per-user 10/25 MB sınırları server-side uygulanır.
- [x] Storage path owner, vehicle, parent type/id ve generated attachment ID içerir; original name
      path'i kontrol etmez.
- [x] Metadata create/link/delete atomik owner doğrulamalı RPC üzerinden yürür; başka kullanıcı
      parent'ına ek bağlanamaz.
- [x] Existing legacy expertise eki yeniden yazılmadan unified listede görünür ve açılır.
- [x] Upload/delete/reconcile başarısızlıkları güvenli Türkçe hata üretir; raw provider bilgisi,
      path veya signed URL loglanmaz.
- [x] Hedefli testler ve diff/güvenlik kontrolleri geçer; fiziksel Android testi bekleyen olarak
      kaydedilir.

## Risks

- Yeni native ImageManipulator ve kamera izin config'i yeni Android binary gerektirir.
- Çok dosyalı save sırasında upload tamamlanıp metadata transaction'ı başarısız olabilir; yeni
  object'ler cleanup queue/reconciliation ile temizlenmelidir.
- Remote migration uygulanmadan yeni client metadata tablo/RPC'sini kullanamaz; deploy/build sırası
  release görevinde korunmalıdır.
- Bounded 5 MB upload body mevcut Edge Function çağrısında JS memory'ye alınır; görseller önceden
  küçültülür ve daha büyük dosyalar reddedilir.

## Security/privacy impact

- Bucket private ve signed URL 60 saniye kalır; public URL eklenmez.
- Cihazın original filename değeri yalnız seçili local formda görünür; kalıcı metadata ve generated
  path kaynak/MIME'dan türetilen genel PII-free ad kullanır.
- Yeni metadata RLS ile owner-scoped read sağlar; direct authenticated writes kapalı, atomik RPC
  `auth.uid()`, güvenli boş `search_path` ve PUBLIC/anon revoke kullanır.
- Parent ownership, cross-user metadata/object ve delete negatif SQL testleri zorunludur.
- Kamera/gallery dosyası üçüncü tarafa veya AI/OCR sağlayıcısına gönderilmez.

## Relevant files

- `src/features/attachments/`: config, domain, picker/compression, UI ve testler.
- `src/data/storage/attachments.ts`: upload/open/reconcile primitives.
- `src/app/expertise/edit.tsx`, `src/app/expertise/index.tsx`: ilk tam entegrasyon.
- `src/domain/entities/index.ts`, repository/store/mappers/types: attachment sözleşmesi ve load/save.
- `supabase/functions/upload-attachment/`, `reconcile-attachments/`: parent metadata ve recovery.
- `supabase/migrations/`, `supabase/tests/`: additive schema/RPC/RLS ve hedefli kanıt.
- `package.json`, `package-lock.json`, `app.json`: yalnız gerekli SDK 57 native package/permission.
- `docs/database.md`: model, güvenlik, uyumluluk ve rollback.

## Implementation steps

1. **Completed:** Git, mevcut picker/Storage/schema/RPC/UI ve resmi SDK/Supabase belgeleri incelendi.
2. **Completed:** Merkezi attachment domain/config ve picker/compression katmanı uygulandı.
3. **Completed:** Additive metadata/RPC/Edge Function, owner RLS ve cleanup/reconciliation eklendi.
4. **Completed:** Ekspertiz unified UI/load/save/delete ve legacy fallback entegre edildi.
5. **Completed:** Hedefli UI/domain/Edge/SQL/RLS, lint, DB lint ve config kontrolleri çalıştırıldı.
6. **In progress:** Tam diff/güvenlik incelemesi, commit/push/PR ve güvenliyse normal develop merge.

## Validation commands

```powershell
npx vitest run src/features/attachments src/data/storage/attachmentRules.test.ts
npx eslint <TASK-022 changed TypeScript/TSX files>
npx tsc --noEmit
npx supabase db lint --local --schema public --level warning
git diff --check
```

Yerel Docker/Supabase mevcutsa yalnız TASK-022 migration'ı ve targeted SQL/RLS scripti transaction
rollback ile çalıştırılır. Remote deploy ve EAS build çalıştırılmaz.

## Manual checks

- [ ] Fiziksel Android'de kamera izin/capture/cancel/deny ve Settings dönüşü.
- [ ] Galeri ve PDF picker cancel/success; üç kaynağın tek listede görünmesi.
- [ ] Mixed-source count/byte limit, upload/delete/reopen persistence ve legacy ek açma.
- [ ] Dar ekran, light/dark tema, TalkBack, thumbnail memory ve bağlantı kesintisi davranışı.

## Rollback strategy

Uygulama feature commit'i revert edilerek legacy tek-ek UI/RPC'sine dönebilir. Remote migration
uygulandıysa history geri yazılmaz: yeni forward migration ile yeni RPC execute kapatılır ve yeni
metadata read erişimi durdurulur; legacy `attachment_path` alanları ve object'ler korunur. Metadata
tablosu doğrulanmış cleanup/migration olmadan drop edilmez.

## Expected output

Reusable attachment feature, tek shared pool kullanan ekspertiz entegrasyonu, additive güvenli
metadata/RPC migration'ı, targeted kanıtlar ve güvenliyse `develop` normal merge sonucu.

## Do not change

- OCR/AI/Premium, bakım/belge entegrasyonu, vehicle photo, 3D/body/fuel/reminder/auth/legal.
- Existing migration history, production Supabase, main/release branches ve version tags.
- Expo/React Native toplu upgrade veya ilgisiz dependency.

## Completion report

### Completed

- Kamera, galeri ve PDF/JPEG/PNG dosya seçimi tek pending/persisted attachment listesine bağlandı.
- Kamera/galeri görselleri 2000 px uzun kenar ve 0,86 JPEG kalite ile yerelde hazırlanıyor.
- Merkezi limitler: parent başına 5 ek, dosya başına 5 MB, parent toplamı 15 MB; mevcut kullanıcı
  10 dosya/25 MB kotası korunuyor ve kaynak türü kota boyutu değil.
- Additive `attachments` metadata tablosu, service-only reservation ve authenticated owner-scoped
  atomik ekspertiz save RPC'si eklendi; direct metadata write kapalı.
- Legacy tek ekspertiz eki read-time fallback ile korunuyor; silme ve reconcile yeni metadata'yı
  kapsıyor.
- Hedefli Vitest: 10 dosya/58 test passed. Edge helper: 10/10 passed. Targeted SQL/RLS scripti
  passed. Changed-file ESLint passed. Public DB lint TASK-022 için yeni bulgu üretmedi.

### Skipped

- Remote Supabase deploy, EAS build, broad Vitest suite ve fiziksel Android testi çalıştırılmadı.

### Failed

- Tam `tsc --noEmit`, TASK-022 dışındaki önceden mevcut auth/legal render-test tip hataları nedeniyle
  başarısız; TASK-022 dosyalarına ait hata kalmadı.
- Standart `supabase db reset --local`, önceden mevcut `public.rls_auto_enable()` migration sorunu
  nedeniyle durdu. Migration geçmişi değiştirilmeden, sonraki forward migration'lar temiz yerel DB'ye
  sırayla uygulanıp TASK-022 SQL testi başarıyla çalıştırıldı.
- İlk genişletilmiş safe-area hedefli denemede `selectionSurfaces.inventory.test.ts`, TASK-021'in
  `SelectField` yerine `BodyConditionSelector` kullanmasına rağmen eski metni aradığı için 1 testte
  durdu. TASK-022 ortak `ActionSheet` safe-area render testi ayrıca eklendi ve geçti; ilgisiz eski
  inventory beklentisi bu görevde değiştirilmedi.

### Manual verification required

- Fiziksel Android kamera/picker/permission/persistence ve yeni native binary kabulü bekleyecek.
- TASK-017, TASK-018, TASK-020, TASK-021 ve TASK-022 remote migration'ları bir sonraki Android build
  öncesinde timestamp sırasıyla deploy edilip doğrulanacak.

## Human acceptance result

**Result:** NOT REVIEWED
**Reviewed by:** —
**Date:** —
**Notes:** Fiziksel Android kabulü bekliyor.
