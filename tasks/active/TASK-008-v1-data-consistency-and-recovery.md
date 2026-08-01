# TASK-008 — V1 veri tutarlılığı ve recovery

**Status:** IMPLEMENTED — AWAITING FINAL PRE-BUILD AUDIT AND ANDROID DEVICE ACCEPTANCE
**Owner:** Codex
**Created:** 2026-08-01
**Updated:** 2026-08-01

## Task ID

TASK-008

## Title

TASK-006 D-11, D-12 ve D-13 veri tutarlılığı ve recovery düzeltmeleri.

## Goal

Kayıt-kilometre, database reminder-local notification ve Storage object-metadata sınırlarında
kısmi başarıyı önleyen veya güvenli biçimde uzlaştıran minimum V1 mimarisini uygulamak.

## User problem

TASK-006 üç cross-system riski açık bıraktı: kayıt ile araç kilometresi ayrı write'larda kalabiliyor,
database reminder ile cihaz bildirimi ayrışabiliyor ve Storage object/kota rezervasyonu/database
metadata yaşam döngüsü kısmi hatalarda orphan bırakabiliyor.

## Current behavior

- D-11: `saveRecord` önce record insert/update, sonra ayrı vehicle mileage update yapıyor.
- D-12: notification iptal/schedule bazı reminder database mutation'larından önce yürütülüyor.
- D-13: upload rezervasyonu ve object oluşturma server-side olsa da metadata completion ve bütün
  cleanup/reconciliation durumları tek idempotency sözleşmesinde birleşmiyor.
- Bağlı project ref `eiqxvvnqkbzbhzpthcwo` olarak doğrulandı; 2026-08-01 başlangıcında yedi local
  migration remote ile eşleşiyor ve `upload-attachment`/`delete-account` ACTIVE.

## Desired behavior

D-11 tek transaction-safe database RPC ile atomik/idempotent olur. D-12 database source-of-truth
ve retry edilebilir cihaz reconciliation modeli kullanır. D-13 açık upload state machine,
idempotency, cleanup ve orphan reconciliation ile tamamlanmamış işlemi başarı saymaz.

## Scope

- [x] D-11 record + mileage atomik/idempotent RPC ve owner/cross-user doğrulaması.
- [x] D-12 database-first reminder mutation, notification sync sonucu ve reconciliation.
- [x] D-13 reserved/uploaded/completed/failed-cleanup-required state machine ve idempotent cleanup.
- [x] Yalnız gerekli forward migration, Edge Function, istemci repository/store ve hedefli testler.
- [x] TASK-006 acceptance matrisi, ana akış kanıtı ve V1 release gate güncellemesi.
- [x] Doğrulanmış linked project'e güvenli deploy ve iki sentetik QA kullanıcıyla remote E2E.

## Out of scope

- D-01–D-10 ve D-14 davranışlarının yeniden tasarımı.
- UI redesign, dark-mode/theme değişikliği, billing, OCR, AI veya yeni ürün özelliği.
- Dashboard/geçmiş hesap formülleri ve düşük kilometre ürün kararının değiştirilmesi.
- Gerçek kullanıcı verisi, mevcut migration değişikliği, Expo/EAS build ve production artifact.

## Acceptance criteria

- [x] Record create/update ve gerekli vehicle mileage değişimi tek PostgreSQL transaction içindedir.
- [x] Aynı idempotency anahtarı aynı sonucu döndürür; duplicate record oluşturmaz.
- [x] Düşük record kilometresi reddedilir; açık vehicle correction davranışı korunur.
- [x] RPC başka kullanıcı vehicle/record erişimini reddeder.
- [x] Reminder önce database'e kaydolur; notification failure reminder'ı silmez ve güvenli uyarı üretir.
- [x] Notification retry/reconciliation duplicate oluşturmaz; edit eski schedule'ı, delete ilişkili
  schedule'ı temizler; denied permission sonsuz retry/crash üretmez.
- [x] Geçerli ve silinmiş/geçersiz reminder notification tap fallback'i korunur.
- [x] Upload yaşam döngüsü `reserved`, `uploaded`, `completed`, `failed`/`cleanup-required` durumlarıyla
  izlenir ve aynı request duplicate object/metadata oluşturmaz.
- [x] Object olup metadata completion başarısızsa cleanup veya reconciliation kaydı kalır.
- [x] Metadata olup object yoksa kullanıcıya geçerli attachment olarak sunulmaz.
- [x] Başarısız/yarım rezervasyon serbest bırakılır; delete ve reconciliation idempotenttir.
- [x] Private bucket, RLS, owner-scoped random PII-free path, MIME/magic byte, 5 MB, 10 belge/25 MB,
  kısa signed URL ve cross-user red sınırları korunur.
- [x] Hedefli local ve remote sentetik testler geçmeden release gate Passed yapılmaz.

## Security/privacy requirements

- `SECURITY DEFINER` yalnız zorunluysa, explicit caller/owner kontrolü, boş/güvenli `search_path` ve
  minimum `EXECUTE` grant ile kullanılabilir; `PUBLIC`/`anon` erişimi kapalıdır.
- Client service-role key içermez. Edge Function secrets yalnız server ortamında kalır ve değerleri
  çıktı/log/dokümana yazılmaz.
- Raw provider error, object path, signed URL, token, parola, PII veya QA credential'ı gösterilmez.
- RLS ve cross-user negatif testler pozitif akış kadar zorunludur.
- Reconciliation yalnız authenticated owner kapsamını veya minimum yetkili server akışını işler.

## Relevant screenshots or evidence

- [TASK-006 kabul matrisi](../../docs/qa/v1-acceptance-test-matrix.md)
- [TASK-006 ana kullanıcı akışı](../../docs/qa/v1-master-user-flow.md)
- [V1 release kapıları](../../docs/release/v1-release-gates.md)
- Bu görev backend/recovery odaklıdır; yeni görsel kanıt beklenmez.

## Relevant files

- `src/data/repositories/SupabaseAppRepository.ts`, `src/store/dataStore.ts`
- `src/features/reminders/notifications.ts`, reminder edit/list/store akışları
- `src/data/storage/attachments.ts`, document/expertise repository ve edit akışları
- `supabase/migrations/**`, `supabase/functions/upload-attachment/**`, shared function yardımcıları
- `scripts/qa-remote-*.mjs`, `supabase/tests/**`, ilgili Vitest/Deno testleri

## Execution plan

### Goal

D-11–D-13'ü transaction sınırları ve dürüst recovery modeliyle kapatıp deploy edilmiş sentetik remote
kanıt üretmek; build veya kapsam dışı ürün davranışı eklememek.

### Background

PostgreSQL transaction yalnız database write'larını atomik yapabilir. Local OS notifications ve
Storage object API çağrıları database transaction'ına katılamadığından source-of-truth, explicit
state, idempotency ve reconciliation gerekir.

### Current state

Linked ref onaylanan değerle eşleşiyor. Üç TASK-008 forward migration remote listede local ile
eşleşiyor; `upload-attachment` v3 ve `reconcile-attachments` v3 ACTIVE. Hedefli sentetik QA temizliği
tamamlandı; Android notification ve kesintili upload yaşam döngüsü manuel kabul bekliyor.

### Scope

Bu task'ın `Scope` ve `Acceptance criteria` bölümleri bağlayıcıdır.

### Out of scope

Bu task'ın `Out of scope` ve `Do not change` bölümleri bağlayıcıdır.

### Risks

- Public RPC/definer yetkisi cross-user bypass yaratabilir: invoker/RLS tercih edilir; zorunlu definer
  explicit auth/owner check ve revoke/grant ile sınırlandırılır.
- Idempotency anahtarı owner kapsamlı değilse kullanıcılar çakışabilir: unique key owner ile scope edilir.
- Notification reconciliation duplicate üretebilir: deterministic reminder eşleme ve schedule listesi
  karşılaştırması yapılır.
- Storage cleanup object'i yanlışlıkla silebilir: owner-scoped reservation/request/object eşleşmesi ve
  terminal state kontrolü gerekir.
- Deploy sonrası sentetik cleanup başarısız olabilir: QA kimlikleri/path'leri kaydedilip idempotent
  cleanup yeniden çalıştırılır; gerçek kullanıcı verisine dokunulmaz.

### Security/privacy impact

Cross-user izolasyon ve kısmi hata recovery güçlenir. Yeni server state'i yalnız teknik random ID,
owner UUID, boyut/MIME ve durum tutar; dosya içeriği veya PII loglanmaz.

### Relevant files

Task'ın `Relevant files` bölümü ve doğrudan hedefli testleri.

### Implementation steps

1. **Completed:** AGENTS, TASK-006/007, QA belgeleri, Supabase/Expo güncel dokümanları ve linked ref'i oku.
2. **Completed:** Mevcut schema, functions, notification/storage akışları ve test altyapısını haritala.
3. **Completed:** Forward migration ve D-11 transaction/idempotency RPC'sini uygula/test et.
4. **Completed:** D-12 database-first notification sync/reconciliation modelini uygula/test et.
5. **Completed:** D-13 upload state/idempotency/cleanup/reconciliation modelini uygula/test et.
6. **Completed:** Önce hedefli local testleri; sonra typecheck/lint ve remote sentetik E2E'yi çalıştır.
7. **Completed:** QA/release belgelerini gerçek kanıtla güncelle; diff/security/privacy review yap.
8. **Completed:** TASK status/completion report'u güncelle, commit et ve `origin/main` dalına push et.

### Validation commands

```powershell
npx vitest run src/features/reminders/notificationRecovery.test.ts src/features/reminders/notificationRouting.test.ts src/features/reminders/notificationRules.test.ts src/data/storage/attachmentRules.test.ts src/shared/utils/requestId.test.ts src/shared/utils/repositoryRules.test.ts
node --test supabase/functions/_shared/bodyReader.test.mjs supabase/functions/_shared/fileValidation.test.mjs supabase/functions/_shared/storageCleanup.test.mjs
npm test
npm run typecheck
npm run lint
npx supabase db lint --linked --level warning
$env:QA_REMOTE_CONFIRM='ARACIM_CEPTE_REMOTE_QA'
$env:QA_EXPECTED_PROJECT_REF='eiqxvvnqkbzbhzpthcwo'
node scripts/qa-task008.mjs
git diff --check
```

### Manual checks

- Android notification izni granted/denied, schedule failure/retry ve app-start/list reconciliation.
- Reminder create/edit/delete/tap lifecycle; killed/background/foreground.
- Android attachment upload interruption, retry, başarı mesajı ve missing-object recovery sunumu.
- Dashboard/geçmiş/kilometre ve signed URL/private viewer regresyonu.

### Rollback strategy

Uygulama commit'i revert edilebilir. Remote schema için mevcut migration değiştirilmez; gerekirse
ayrı forward rollback migration'ı hazırlanır. Yeni tablolar/state verisi gerçek kullanıcı verisini
silmeden compatibility korunarak devre dışı bırakılabilir.

### Expected output

Forward migration/function/client değişiklikleri, hedefli local+remote kanıt, güncel QA/release
durumu, sentetik cleanup kaydı, commit ve push sonucu.

### Do not change

D-01–D-10/D-14, dashboard/geçmiş hesapları, theme/UI sistemi, auth ürünü, package/lockfile,
`app.json`, EAS/Android build config, `.env*`, gerçek kullanıcı verisi ve mevcut migration dosyaları.

### Completion report

#### Completed

- D-11 transaction/idempotency RPC, D-12 DB-first notification recovery ve D-13 upload state/cleanup
  reconciliation uygulandı.
- Üç forward migration (`20260801165118`, `20260801171638`, `20260801172536`) doğrulanan
  `eiqxvvnqkbzbhzpthcwo` projesine uygulandı; önceki migration dosyaları değiştirilmedi.
- `upload-attachment` v3 ve `reconcile-attachments` v3 ACTIVE olarak doğrulandı.
- İki sentetik kullanıcıyla 15 hedefli remote kontrol geçti; idempotent/toplu belge temizliği ve
  araç cascade temizliği dahil Auth/DB/Storage QA verisi temizlendi.
- Son yerel doğrulamada 28 Vitest dosyası / 127 test, typecheck, lint ve `git diff --check` geçti.

#### Skipped

- Expo/EAS build, coverage ve kapsam dışı remote E2E paketleri çalıştırılmadı.
- Hukuk, theme, billing, OCR/AI ve dashboard/geçmiş hesapları değiştirilmedi.

#### Failed

- İlk reconciliation E2E koşusu eksik `service_role` metadata `SELECT` grant'i nedeniyle 500 verdi.
  Deploy edilmiş migration değiştirilmeden minimum forward-fix uygulanıp aynı test yeniden geçirildi.
- Supabase Management Advisor'ın final yeniden okuması connector yetkisiyle reddedildi; bu kontrol
  Passed sayılmadı. Bunun yerine linked `db lint` hatasız geçti ve ilgili RPC grant'leri doğrudan
  sorgulanarak yalnız `authenticated`/`service_role` minimum yetkileri doğrulandı.
- Final doğrulamada açık otomatik test hatası yoktur.

#### Manual verification required

- Android notification ve interrupted upload recovery kabulü.

## Commands to run

Execution plan `Validation commands` bölümü geçerlidir.

## Expected outputs

- D-11/D-12/D-13 kök neden, tasarım, migration/function, test/deploy/cleanup kanıtı.

## Manual device checks

Execution plan `Manual checks` bölümü bağlayıcıdır.

## Do not change

Execution plan `Do not change` bölümü bağlayıcıdır.

## Completion checklist

- [x] AGENTS, TASK-006/007 ve dört QA/audit belgesi okundu.
- [x] Linked project ref ve başlangıç migration/function durumu doğrulandı.
- [x] Execution plan oluşturuldu.
- [x] Yalnız onaylı kapsam uygulandı.
- [x] Acceptance criteria kanıtlandı veya manuel/başarısız olarak ayrıldı.
- [x] Hedefli local ve remote testler çalıştırıldı.
- [x] Diff ve security/privacy regression incelemesi tamamlandı.
- [x] QA/release dokümantasyonu güncellendi.
- [x] Completed/skipped/failed/manual kontroller ayrı raporlandı.

## Review checklist

- [x] D-11 database write atomik ve idempotenttir.
- [x] D-12 database source-of-truth ve local notification recovery dürüsttür.
- [x] D-13 object/metadata/quota state idempotent ve reconcile edilebilirdir.
- [x] Cross-user negatif testler geçmiştir.
- [x] D-01–D-10/D-14 ve kapsam dışı sistemlerde regresyon yoktur.
- [x] Remote ref/deploy/built-in function environment/QA cleanup kanıtı kaydedilmiştir.
- [x] Android kabulü olmayan sonuç Passed gösterilmemiştir.

## Human acceptance result

**Result:** IMPLEMENTED — HUMAN AND ANDROID ACCEPTANCE PENDING
**Reviewed by:** —
**Date:** —
**Notes:** Build başlatılmadı.
