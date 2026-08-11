# TASK-025 — Document OCR Foundation with Safe Review Flow

**Status:** IMPLEMENTED — OCR PROVIDER PENDING AND ANDROID ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-11
**Updated:** 2026-08-11

## Goal

Desteklenen araç belgelerinde OCR çıktısını yalnız kullanıcı tarafından başlatılan, geçici ve
düzenlenebilir öneriler olarak sunmak; açık `Forma Aktar` eylemi ve mevcut ayrı `Kaydet` akışı
olmadan hiçbir değeri doğrulanmış gerçek gibi forma veya veritabanına yazmamak.

## Background

TASK-022 private/owner-scoped attachment hattını, TASK-023 belge türü kataloğu ile normalize alanları
sağladı. Expo SDK 57 ve mevcut bağımlılıklarda onaylı, güvenli bir OCR motoru veya dış sağlayıcı
entegrasyonu yoktur. Bu görev kararsız native dependency ya da onaysız dış veri aktarımı eklemeden
sağlayıcı sınırı, deterministik parser ve review/apply deneyimini kurar.

## Current state

- Belge formu tür bazlı alanları ve kamera/galeri/dosya eklerini destekler.
- Pending JPEG/PNG ekleri upload edilmeden yerel URI taşır; metadata yalnız mevcut açık Save ile
  kalıcılaştırılır.
- Uygulamada OCR provider, parser, suggestion modeli veya review UI yoktur.
- SDK 57 belgelerinde birinci taraf OCR modülü bulunmadığı ve repository'de onaylı backend/provider
  olmadığı için gerçek OCR motoru bu görevde güvenle etkinleştirilemez.

## Scope

- `DocumentOcrProvider` sınırı ve merkezi invocation servisi.
- Raw text ile type-specific structured parsing ayrımı.
- Sigorta, kasko, muayene, ruhsat ve ekspertiz için mevcut TASK-023 alanlarına konservatif parser.
- Pending JPEG/PNG üzerinde açık kullanıcı eylemi; PDF/uygunsuz tür için güvenli fallback.
- Düzenle, seç/çıkar, iptal ve açık `Forma Aktar` review paneli.
- Parser/provider/review güvenliği için hedefli unit ve render testleri.

## Out of scope

- Fuel/maintenance OCR, AI/LLM, external OCR provider, premium/quota, auto-save veya schema genişletme.
- Supabase migration/deploy, public Storage, dependency upgrade, EAS build ve geniş UI redesign.

## Acceptance criteria

- [x] OCR yalnız kullanıcının açık eylemiyle başlar.
- [x] Provider ve parser route bileşeninden ayrıdır; raw text kalıcılaştırılmaz veya loglanmaz.
- [x] Yalnız TASK-023 destekli alanlar için anlamlı ve konservatif öneriler üretilir.
- [x] Öneriler geçici, düzenlenebilir, çıkarılabilir ve iptal edilebilirdir.
- [x] Dolu form alanları sessizce overwrite edilmez; kullanıcı öneriyi açıkça seçmelidir.
- [x] `Forma Aktar` yalnız unsaved form state'ini değiştirir; DB yazımı mevcut Save'e bağlı kalır.
- [x] Provider yokluğu, no-result, unsupported tür ve hata manuel girişi engellemez.
- [x] TASK-023 validation uygulanmaya devam eder.
- [x] Yeni dependency/migration/secret veya dış belge aktarımı yoktur.

## Risks

- Gerçek cihaz OCR motoru bulunmadığından kullanıcı bu sürümde provider-unavailable fallback görür;
  parser/review mimarisi gerçek OCR olarak pazarlanamaz.
- OCR etiket varyasyonları deterministik parser'ın kapsamını aşabilir; bilinmeyen metin uydurulmaz.
- Persisted-only attachment için signed URL indirip OCR yapmak privacy kapsamını büyüteceğinden ilk
  sürüm pending yerel JPEG/PNG ile sınırlıdır.

## Security/privacy impact

- Belge içeriği cihaz dışına gönderilmez; external provider veya client secret eklenmez.
- Raw OCR text loglanmaz, analytics'e yazılmaz, Supabase'e kaydedilmez ve yalnız çağrı ömründe tutulur.
- Private Storage, owner scope, signed URL, MIME/magic-byte ve kota kontrolleri değişmez.
- İleride dış sağlayıcı seçimi ayrı privacy/security ve yurt dışı aktarım kararı gerektirir.

## Relevant files

- `src/app/documents/edit.tsx`: geçici önerilerin mevcut forma açıkça uygulanması.
- `src/features/documents/ocr/`: provider, service, parser, review UI ve testler.
- `src/features/documents/config/documentTypes.ts`: izinli mevcut alanların source-of-truth'u.
- `src/features/attachments/`: TASK-022 pending attachment sözleşmesi.
- `docs/security/privacy-threat-model.md`: gerçek provider eklenmediği sınırın belgelenmesi.

## Implementation steps

1. **Completed:** Git/SDK57, TASK-022/023, form, attachment ve privacy sözleşmeleri incelendi.
2. **Completed:** Provider/service/parser ve transient suggestion domaini oluşturuldu.
3. **Completed:** Review/apply bileşeni document create/edit akışına bağlandı.
4. **Completed:** Hedefli parser/provider/render testleri ve changed-file kontrolleri çalıştırıldı.
5. **In progress:** Diff/security/privacy incelemesi, commit/push/PR ve güvenliyse develop merge
   yapılıyor.

## Validation commands

```powershell
npx vitest run <TASK-025 targeted test files>
npx eslint <TASK-025 changed TypeScript/TSX files>
npx tsc --noEmit --pretty false
git diff --check
```

Tam suite, coverage, remote Supabase, EAS build veya deploy çalıştırılmaz.

## Manual checks

- [ ] Android'de supported belgeye JPEG/PNG ekleyip taramayı açıkça başlatma.
- [ ] Öneriyi düzenleme/çıkarma/iptal/forma aktarma ve Save öncesi DB'nin değişmediğini doğrulama.
- [ ] Dolu alanın sessiz overwrite edilmemesi; unreadable/unsupported/provider unavailable fallback.
- [ ] Legacy manuel belge create/edit/save akışının çalışması.

## Rollback strategy

Feature commit revert edilerek OCR section/provider/parser tamamen kaldırılabilir. Database veya
dependency değişikliği olmadığı için veri rollback'i yoktur; mevcut manuel belge ve attachment
akışları aynı kalır.

## Expected output

Provider-independent, privacy-first OCR foundation; konservatif type-specific parser; açık review ve
apply akışı; provider bulunmadığında dürüst manuel-entry fallback; hedefli test kanıtı.

## Do not change

- Fuel/maintenance/body/reminder/3D/auth/legal/premium davranışları.
- Supabase schema/migration/RLS/Storage, production proje veya remote ayarlar.
- Dependencies, package/lockfile, `app.json`, `eas.json`, main/release/tag.

## Completion report

### Completed

- Trafik sigortası, kasko, muayene, ruhsat ve ekspertiz için TASK-023 alanlarına sınırlı konservatif
  parser'lar; provider sınırı ve merkezi invocation servisi eklendi.
- Pending JPG/JPEG/PNG için kullanıcı tarafından başlatılan tarama, transient editable review,
  dolu alanlarda varsayılan seçimsiz öneri ve ayrı `Forma Aktar` davranışı eklendi.
- Production default provider güvenli biçimde `unavailable` kaldı; dış aktarım, raw OCR persistence,
  log, analytics, secret, dependency veya migration eklenmedi.
- Targeted Vitest 32/32, changed-file ESLint ve `git diff --check` geçti. Source taramasında OCR
  katmanında DB write, Supabase çağrısı, log veya credential bulunmadı.

### Skipped

- Tam test/coverage, remote Supabase, EAS build ve deploy kapsam gereği çalıştırılmadı.
- Gerçek provider/native OCR testi, güvenli SDK/provider kararı olmadığı için çalıştırılmadı.

### Failed

- Tam `tsc --noEmit`, TASK-025 hatası bırakmadan yalnız önceden mevcut auth/legal render testlerindeki
  7 bilinen tip hatasıyla başarısızdır.

### Manual verification required

- Fiziksel Android'de JPEG/PNG ekleme, taramayı başlatma, unavailable fallback, review/apply ve Save
  ayrımı ile light/dark/dar ekran kontrolü bekliyor.
- Gerçek OCR provider entegrasyonu ayrı SDK, privacy/security, KVKK/yurt dışı aktarım ve hukuk kararı
  gerektirir.
- Bir sonraki Android build öncesi TASK-017–TASK-024 pending migration'ları kronolojik deploy ve
  doğrulamadan geçmelidir; TASK-025 migration eklemedi.

## Human acceptance result

**Result:** NOT REVIEWED
**Reviewed by:** —
**Date:** —
**Notes:** Fiziksel Android ve gerçek OCR provider kararı bekliyor.
