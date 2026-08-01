# TASK-010 — Android crash, hatırlatıcı ve release blocker düzeltmeleri

**Status:** IMPLEMENTED — AWAITING ANDROID CRASH-REGRESSION APK ACCEPTANCE

## Task ID

TASK-010

## Title

Android crash, state recovery, reminder, dashboard, auth ve hukuk UX release blocker düzeltmeleri

## Goal

1–2 Ağustos 2026 gerçek Android cihaz kabulünde bulunan production-blocking crash ve beyaz ekranları
kaldırmak; V1 hatırlatıcı, dashboard, auth ve hukuk akışlarını onaylı davranışla tutarlı hale getirmek.

## User problem

Hızlı kayıt aksiyonları ve ekspertiz eki açma uygulamayı kapatabiliyor; toplu veri silme sonrasında tab
ekranları beyaz kalabiliyor. Hatırlatıcı nedenleri, bildirim zamanı, dashboard özetleri ve auth/hukuk
sunumu gerçek cihazda yanıltıcı veya eksik davranıyor.

## Current behavior

- Dashboard hızlı aksiyonları ham route parametresi gönderiyor; record route parametreleri runtime'da
  doğrulanmıyor ve art arda navigation engeli yok.
- Dosya açma doğrudan signed URL ile native `Linking` çağrısı yapıyor; native destek/expired/missing
  ayrımı ortak bir sonuç modeliyle yönetilmiyor.
- Dashboard, Vehicle, Reminders ve Body Condition aktif araç yokken `null` render ediyor.
- Mutation reload'u silinmiş `activeVehicleId` için güvenli yeni seçim/empty bundle garantilemiyor.
- Bootstrap; attachment metadata ve her reminder notification reconciliation işlemini ilk ekranın
  önünde bekletiyor.
- Hatırlatıcı badge'i tarih ve kilometre nedenlerini ortak `overdue/due` etiketlerine indiriyor.
- Tek notification yalnız due date günü 09:00'a kuruluyor; lead-time tercihi yok.
- Login başlığı her cihazda “Tekrar hoş geldiniz”; auth error ekran bağlamından bağımsız.
- Ayarlar beş ayrı hukuk satırı ve kullanıcıya dönük taslak inceleme uyarıları gösteriyor.

## Desired behavior

Kullanıcının onayladığı A–P kapsamındaki crash-safety, state recovery, tek-seçimli V1 notification
lead-time, reminder durum açıklaması, dashboard hesap/metin, auth state ve sade hukuk navigasyonu
eksiksiz uygulanır. Çalışan TASK-001/TASK-005/TASK-007/TASK-008 davranışları korunur.

## Scope

- Route param doğrulama, duplicate navigation guard ve minimum uygulama Error Boundary.
- Araçsız/null-safe tab ve form durumları; mutation sonrası merkezi reload/reconciliation.
- Bootstrap kritik yolunun ölçülebilir ve güvenli biçimde kısaltılması.
- Bildirim ayarlarına güvenli kısa yol ve app-active permission refresh.
- Merkezi tarih/km reminder durum modeli ve neden metinleri.
- Mevcut tek `notification_id` mimarisiyle tek-seçimli lead-time: 7/3/1/0 gün ve özel gün farkı;
  varsayılan 1 gün, yerel 09:00. Tercih cihazda PII içermeden saklanır.
- Dashboard source-of-truth hesap ve açıklama düzeltmeleri.
- History tür/ikon doğrulaması; auth local returning flag ve route-scoped error temizliği.
- Tek hukuk liste route'u ve generated canonical içeriği değiştirmeyen kullanıcı sunumu filtresi.
- Hedefli saf logic/state/route smoke testleri ve Android manuel kabul matrisi.

## Out of scope

- Expo/EAS build veya deploy; migration, schema, RLS, Storage policy ya da Edge Function değişikliği.
- Remote E2E/database reset, gerçek kullanıcı verisi, billing, OCR, AI ve tema redesign.
- Kanonik `docs/legal` metinlerini silmek veya hukuki uyumluluk iddiası.

## Acceptance criteria

- [x] Yakıt/bakım/masraf create ve history edit hedefleri doğrulanmış string parametre taşır;
      duplicate press engellenir ve missing vehicle/entity güvenli durum gösterir.
- [x] Ekspertiz/belge eki açma tüm native/promise hatalarında güvenli mesaj verir ve loading sonlanır.
- [x] Root Error Boundary beyaz ekran yerine güvenli geri dönüş UI'ı gösterir; hassas detay loglamaz.
- [x] Toplu silmeler double-tap korumalıdır; başarı sonrası store tutarlı reload edilir.
- [x] Araç yokken tab/body ekranları `null` yerine anlamlı empty state gösterir.
- [x] Bootstrap foreground için zorunlu olmayan reconciliation'ı beklemez; sabit timeout kullanmaz.
- [x] Notification settings shortcut hata güvenlidir ve app-active dönüşünde permission yenilenir.
- [x] Date-only, mileage-only ve combined badge/neden tablosu 30 gün/1.000 km eşikleriyle testlidir.
- [x] Tek-seçimli lead-time default 1 gün ve 09:00'dır; geçmiş trigger anlık bildirim üretmez.
- [x] Dashboard amount/liters/month/chart/comparison/cost-per-km senaryoları testlerle geçer.
- [x] Returning flag yalnız boolean local preference'tır; auth error ekranlar arasında sızmaz.
- [x] Kullanıcı UI'ında `HUKUK İNCELEMESİ BEKLİYOR` görünmez; canonical kaynaklar korunur.
- [x] Dirty-form onaylı davranışı regresyona uğramaz.
- [x] Android kabul matrisi yeni APK maddelerini Passed işaretlemeden içerir.

## Security/privacy requirements

- RLS/source-of-truth sınırı, private Storage, MIME/magic-byte, quota ve D-11/D-12/D-13 korunur.
- Secret, token, e-posta, signed URL, object path veya raw provider hatası loglanmaz/gösterilmez.
- Returning-user ve notification tercihleri yalnız PII içermeyen boolean/sayısal değerlerdir.
- UI sadeleştirmesi hukuk uyumluluğu iddiasına dönüştürülmez.

## Relevant screenshots or evidence

- 1–2 Ağustos 2026 tarihli 19 gerçek Android ekran görüntüsü ve kullanıcının ayrıntılı kabul notları.
  Görseller repository'ye alınmayacak/commit edilmeyecektir.
- TASK-006 route/theme audit, TASK-007 akış düzeltmeleri, TASK-008 consistency/recovery ve TASK-009
  preview öncesi denetim kanıtları.

## Relevant files

- `src/app/_layout.tsx`, tab/auth/record/reminder/expertise/legal route'ları.
- `src/store/dataStore.ts`, `src/store/authStore.ts`.
- `src/data/repositories/SupabaseAppRepository.ts`, `src/data/storage/attachments.ts`.
- `src/features/reminders/*`, `src/shared/utils/analytics.ts`, ortak UI/entity kartları.
- `docs/qa/v1-acceptance-test-matrix.md` ve ilgili QA/release belgeleri.

## Execution plan

### Goal

Android crash-regression APK'sına geçmeden önce repository blocker'larını minimum, merkezi ve geri
alınabilir V1 değişiklikleriyle kapatmak.

### Background

TASK-009 preview build'e izin vermişti; gerçek APK kabulü route/render/native ve silme sonrası state
kusurlarını ortaya çıkardı. Güncel manuel kanıt bağlayıcıdır.

### Current state

`null` tab render'ları, stale active ID riski, blocking reconciliation, unchecked params ve ortak
olmayan file-opening error sınırı kaynakta doğrulandı. Native stack trace mevcut olmadığından cihazda
yeniden doğrulanacak çıkarımlar ayrıca işaretlenecektir.

### Scope

Bu dosyanın Scope ve acceptance criteria maddeleri.

### Out of scope

Migration/deploy/build, remote E2E ve ürün kapsamı genişletme.

### Risks

- Lead-time tercihi mevcut tek-ID mimarisi nedeniyle tek seçimli ve cihaz-local kalır.
- Reconciliation kaldırılmaz; yalnız kritik ilk render sonrasına alınır.
- Error Boundary kök hatayı gizlemez; route/state/file nedenleri ayrıca düzeltilir.
- Native crash ancak yeni APK ile kesin kapatılabilir.

### Security/privacy impact

Server/RLS/policy değişmez. Hata sınırları veri sızıntısını azaltır; local tercihler PII içermez.

### Relevant files

Yukarıdaki Relevant files bölümü; uygulama sonunda exact listeyle güncellenecektir.

### Implementation steps

1. **Completed:** Talimat, Expo 57/Supabase docs, TASK-006–009 ve QA kanıtlarını oku.
2. **Completed:** Route/file/state/startup kök nedenlerini düzelt.
3. **Completed:** Reminder status ve notification lead-time modelini uygula.
4. **Completed:** Dashboard/auth/hukuk UI düzeltmelerini uygula.
5. **Completed:** Hedefli/tam test, diff ve privacy/security review çalıştır.
6. **In progress:** QA/release kanıtını güncelle, commit ve push et.

### Validation commands

`npx vitest run <hedefli testler>`, `npm run typecheck`, `npm run lint`, `npm test`,
`npx expo-doctor`, `git diff --check` ve source theme/secret/PII/log taramaları.

### Manual checks

QA matrisindeki TASK-010 bölümü yeni Android APK'da uygulanır. Native crash, file handler,
notification foreground/background/killed, app settings, startup wall-clock ve restart persistence
otomasyonla Passed sayılmaz.

### Rollback strategy

Tek TASK-010 commit'i `git revert` ile geri alınabilir. Local tercih bozuk/eksikse varsayılana döner;
schema/deploy olmadığı için remote rollback gerekmez.

### Expected output

Güvenli route/state/file akışları, tek-seçimli lead-time, doğru reminder/dashboard/auth/legal UI,
hedefli test kanıtları ve Android crash-regression kabul matrisi.

### Do not change

Migration, RLS, Storage policy, Edge Function, secrets/env, app/eas config, marka palette'i,
D-11/D-12/D-13 server sözleşmeleri ve dirty-form onaylı davranışı.

### Completion report

#### Completed

- Quick action/history route'ları merkezi string parametre helper'ına ve UUID alıcı doğrulamasına alındı.
- Attachment açma signed URL/native handler hatalarını tek güvenli utility'de topladı; ekspertiz kartı
  object path göstermeden genel ad, tür ve rapor tarihini sunuyor.
- Root Error Boundary, araçsız tab/form state'leri ve mutation sonrası stale-active-ID recovery eklendi.
- İlk render data sorguları paralel; attachment/reminder reconciliation kritik yol sonrasına alındı.
  Store bootstrap süresini ölçer; gerçek warm/cold wall-clock sonucu yeni APK'da kaydedilecek.
- Notification settings shortcut, app-active permission refresh ve izin sonrası reconciliation eklendi.
- Reminder eşikleri 30 gün/1.000 km; today/date-overdue/km-due/km-overdue/both-overdue modeli testli.
- Mevcut tek notification ID mimarisiyle 7/3/1/0/özel gün tek seçimi, varsayılan 1 gün ve 09:00
  uygulandı. Geçmiş trigger anlık bildirim üretmez.
- Dashboard litre/tutar ayrımı, 6 aylık toplam, sıfır karşılaştırma ve maliyet/km açıklaması testlendi.
- Returning-user boolean preference, screen-specific auth error temizliği ve genel login hatası korundu.
- Tek `/legal` liste route'u eklendi; canonical generated içerik değişmeden kullanıcı marker'ı filtrelendi.
- 14 hedefli dosyada 65 test ve tam pakette 37 dosyada 150 test geçti; typecheck, lint, Expo Doctor
  20/20, legal freshness, Markdown local links ve `git diff --check` geçti.
- Runtime hard-coded renk literal'i 0; yeni console/sensitive log, email/telefon/kimlik literal'i 0;
  secret şekli taraması temiz. `service-role` sözcüğü yalnız canonical hukuk/release dokümanında incelendi.

#### Skipped

- EAS/Expo build, Supabase deploy, remote E2E ve database reset: görev gereği çalıştırılmayacak.
- Yeni React Native renderer/dependency: mevcut Vitest `node` altyapısı korunarak saf route/state/native
  boundary testleri eklendi; gerçek component/native render sonucu Android APK matrisinde bırakıldı.

#### Failed

- Otomatik kontrol başarısızlığı yok.
- Mevcut 1–2 Ağustos APK'sı crash/beyaz ekran kabulünde başarısızdır; yeni APK sonucu bekleniyor.

#### Manual verification required

Yeni Android APK crash regression, native file handler, notification delivery/settings ve startup.

## Commands to run

Hedefli Vitest, typecheck, lint, full Vitest, Expo Doctor, diff/theme/secret/PII scan.

## Implemented files

- Route/state/crash sınırı: `src/app/_layout.tsx`, dashboard/history/vehicle/reminders/settings tab'leri,
  record/reminder/expertise/body route'ları, `AppErrorBoundary.tsx`, `routeParams.ts`, `vehicleState.ts`.
- Dosya açma/sunum: `attachments.ts`, `openAttachment.ts`, `attachmentPresentation.ts`, ekspertiz UI.
- Startup/recovery: `dataStore.ts`, `SupabaseAppRepository.ts`, `AppRepository.ts`.
- Reminder/notification: `analytics.ts`, `entityCards.tsx`, `notificationSchedule.ts`,
  `notificationPreferences.ts`, `notificationRecovery.ts`, `notifications.ts`, reminder formu.
- Dashboard/history/auth/legal/settings: `MiniBarChart.tsx`, record presentation, auth returning flag/store,
  `/legal` listesi, user-facing legal filter ve system settings helper'ı.
- Kanıt: hedefli `.test.ts` dosyaları, `docs/qa/v1-*`, `docs/release/v1-release-gates.md` ve bu task.

## Expected outputs

Blocker'ların kod/test kanıtıyla uygulanması; gerçek Android maddeleri ayrı kabul kapısı olarak kalır.

## Manual device checks

QA matrisindeki TASK-010 Android crash-regression bölümü.

## Do not change

Build/deploy, remote schema/data, gerçek kullanıcı verisi, canonical hukuk metni ve güvenlik sınırları.

## Completion checklist

- [x] A–P kapsamı uygulanmış veya gerçek teknik sınırla raporlanmış.
- [x] Hedefli ve tam otomatik kontroller geçmiş.
- [x] Security/privacy regression review tamamlanmış.
- [x] QA matrisi güncellenmiş; APK maddeleri Passed yapılmamış.
- [x] Status `IMPLEMENTED — AWAITING ANDROID CRASH-REGRESSION APK ACCEPTANCE`.

## Review checklist

- [x] Route/render/native crash ve null/stale state recovery kaynak incelemesi.
- [x] Reminder timezone/km/badge/duplicate notification kaynak ve saf-logic incelemesi.
- [x] Dashboard mapping, auth enumeration/PII, legal source-of-truth incelemesi.
- [x] Dirty form, theme, safe-area, Storage ve D-11/D-12/D-13 kaynak regresyonu yok.

## Human acceptance result

**AWAITING NEW ANDROID APK ACCEPTANCE**
