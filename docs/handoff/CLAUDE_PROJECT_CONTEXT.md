# Claude Project Context

**Checkpoint date:** 2026-09-02

**Accepted source commit:** `82cf2590dd42b7ed12e74ae1ca7ef42db42dad67`

**Checkpoint tag:** `pre-claude-handoff-2026-09`

Bu belge güncel checkpoint'in teknik bağlamıdır. Değişen remote/store durumunu işlemden önce tekrar
doğrula. Release kabul durumu için `CLAUDE_CURRENT_STATE.md`, remote Supabase eşleşmesi için
`CLAUDE_SUPABASE_MAP.md` kullan.

## PRODUCT OVERVIEW

Aracım Cepte, Türkiye'deki bireysel araç sahipleri için araç profili ve kilometre takibi; yakıt,
bakım ve diğer gider kayıtları; belgeler, ekspertiz, notlar, fotoğraflar ve hatırlatıcılar sunan
Android-öncelikli mobil uygulamadır. Kullanıcı kayıt olur, e-postasını doğrular, araç kurar, aktif
aracı üzerinden kayıtlarını yönetir ve yalnız kaydedilmiş gerçek verilerden özet/rapor alır.

Free plan güvenilir kayıt/takip çekirdeğidir. Premium plan merkezi entitlement ile en fazla üç araç,
daha yüksek OCR/AI/ek/fotoğraf kotaları, gelişmiş rapor ve özel reminder saati sağlar. RevenueCat
satın alma kaynağı, Supabase `user_entitlements` hassas authorization kaynağıdır. Ödeme foundation'ı
uygulanmış olsa da gerçek mağaza satın alma kurulumu ve kabulü tamamlanmamıştır.

## CURRENT USER JOURNEY

1. İlk açılışta onboarding görülür; sonra Supabase e-posta/şifre auth ekranına gidilir.
2. Signup e-posta doğrulaması ister. Confirmation callback uygulamanın dedicated ekranına döner;
   otomatik login yapmaz. Kullanıcı manuel giriş yapar.
3. Recovery e-postası dedicated reset callback'ine gelir; callback recovery session'ı kurar, yeni
   parola + doğrulama alınır, `updateUser` sonrası session kapatılıp Login'e dönülür.
4. Girişten sonra remote araç listesi bootstrap edilir. Araç yoksa kurulum formu; varsa son seçili
   veya ilk sahip olunan araç active vehicle olur.
5. Alt navigasyon: Ana Sayfa, Geçmiş, Araç, Hatırlatıcılar, Ayarlar. Ayrıntı route'ları kayıt,
   belge, ekspertiz, not, gövde durumu, rapor, Premium ve Araç Asistanı ekranlarını açar.
6. Home mevcut kilometre ve dönem özetlerini gösterir; persistent araç asistanı girişi vardır.
7. Geçmiş ve kayıt formu yakıt/bakım/diğer giderleri yönetir. Bakım; servis ayrıntısı, paket,
   custom operation, line item ve private attachment destekler.
8. Belgeler Active / Expiring Soon / Archive filtrelerini kullanır; expired kayıtlar silinmez.
9. Hatırlatıcılar tarih/km hedefini ve local notification ID/durumunu yönetir. Free yeni saat 09:00,
   Premium özel saat seçebilir.
10. Premium Reports gerçek kayıtları seçili dönem ve araç bazında toplar. Araç Asistanı tek seferlik
    ASK → RESPONSE, evidence ve öneriler sunar; chat history tutmaz.
11. Settings hesap/veri işlemleri, tema, Premium ekranı ve yasal içerik girişlerini içerir.

## CURRENT FREE FEATURES

- Bir aktif/sahip olunan araç; marka/model/yıl, 14 body type taksonomisi, renk ve high-water km.
- Yakıt, bakım ve diğer gider CRUD'u; tarihsel km current km'yi geriye düşürmez.
- Cihaz üzerinde yakıt, bakım ve desteklenen araç belgesi OCR'ı; editable review ve explicit save.
- Bakım paketleri, kullanıcı paketleri ve custom operasyonlar.
- Hatırlatıcı CRUD'u, ay/yıl hızlı tarih seçimi, local notification ve yeni kayıtta sabit 09:00.
- Belge/ekspertiz/not/gövde durumu ve private attachment akışları.
- Araç başına 1 fotoğraf; signed URL ile private gösterim.
- Aylık 3 başarılı OCR kullanımı; aylık 1 başarılı AI Assistant yanıtı.
- Entity başına 5 ek, ek başına 15 MB uygulama plan limiti, kullanıcı başına 25 MB; server-side
  Storage doğrulaması ayrıca 5 MB fiziksel dosya sınırı uygular.
- Temel Home/geçmiş deneyimi, belge archive UX, light/dark/system tema ve yasal ekranlar.
- Premium rapor ekranı Free kullanıcıya kilitli/CTA durumu gösterir.

## CURRENT PREMIUM FEATURES / FOUNDATION

### Implemented in source and entitlement-gated

- En fazla 3 araç, araç başına 5 fotoğraf.
- Aylık 30 OCR ve 50 AI yanıtı.
- Entity başına 10 ek, ek başına 30 MB plan limiti ve kullanıcı başına 100 MB plan limiti.
- `advancedReports`: dönem, trend, kategori ve gerçek 2–3 araç karşılaştırması.
- `customReminderTime` / `advancedNotifications`: 24 saat biçiminde özel bildirim zamanı.
- Premium paywall route'u; current Offering'den monthly/annual paket ve store fiyatı gösterimi,
  purchase/restore adapter'ı, Settings ve limit girişleri.

### Configured foundation, not production-accepted

- RevenueCat SDK adapter'ı authenticated Supabase UUID'yi App User ID yapar; logout/account switch
  state'i temizler.
- `premium` RevenueCat entitlement ID'si normalize edilir. Client CustomerInfo UI içindir; server
  access `user_entitlements` üzerinden çözülür.
- Billing migration remote geçmişte vardır. `revenuecat-webhook` kaynakta vardır fakat 2026-09-02
  remote function listesinde yoktur.
- Public platform key ve `EXPO_PUBLIC_REVENUECAT_PURCHASES_ENABLED=true` olmadan purchase fail-closed.
- Google Play subscription/base plan/Offering/entitlement/credentials ve license-test purchase
  repository kanıtıyla doğrulanmamıştır. Current closed-test build RevenueCat native SDK içermeyen
  eski artifact olabilir; yeni native build gerekir.

Gelecek `advancedTrips`, `fuelPriceAlerts`, `mechanicSharing`, `obdAccess` ve
`connectedVehicleAccess` capability alanları config'te bulunur; bunları implement edilmiş özellik
veya paywall vaadi sayma.

## AUTH ARCHITECTURE

- `src/store/authStore.ts` Supabase session bootstrap, auth event, signup/login/recovery/update/signout
  eylemlerinin merkezi store'udur. Client yalnız public/anon key + user JWT kullanır.
- Signup `emailRedirectTo=aracimcepte://auth/confirm-email` gönderir. Session dönen fakat confirmation
  beklenmeyen ortam fail-closed; confirmation devre dışı bırakılmaz.
- Confirmation parsing dedicated route'tadır; callback başarısı kullanıcıyı login'e yönlendirir.
- Forgot Password `resetPasswordForEmail` ile `aracimcepte://auth/reset-password` yollar.
- `passwordRecovery.ts`, query ve fragment parametrelerini birlikte okur: PKCE `code` için
  `exchangeCodeForSession`, `token_hash&type=recovery` için `verifyOtp`, implicit recovery tokenları
  için `setSession`. Untyped PKCE callback'te `PASSWORD_RECOVERY` olayı gerekir.
- Auth store `recoveryMode` tutar; route decision ve session guard recovery ekranını cold start'ta
  normal authenticated/home/login yönlendirmesinden önce korur. Callback tek component akışında
  işlenir ve token değerleri loglanmaz.
- Reset ekranı iki eşleşen, 8–72 karakter parola ister; `updateUser({password})` sonrası global/local
  sign-out ve Login dönüşü uygular.
- Settings'teki mevcut “Şifre yenile” girişi hâlâ forgot-password e-posta akışına gider. Bu,
  authenticated direct password-change/re-auth UX'i değildir; `CLAUDE_CURRENT_STATE.md` bunu açık
  kalan UX olarak işaretler.

Android cold-start recovery düzeltmesi kaynakta ve odaklı testlerde vardır; fresh email → app →
reset → old/new password matrisi güncel checkpoint'ten üretilen APK'da henüz fiziksel kabul
edilmemiştir. Dashboard Site URL/redirect/template/SMTP teslimi ayrıca insan kontrollüdür.

## DATABASE / SUPABASE ARCHITECTURE

Ana user-owned tablolar: `profiles`, `vehicles`, `vehicle_records`, `reminders`,
`body_part_conditions`, `body_part_condition_values`, `expertise_reports`, `vehicle_notes`,
`vehicle_documents`, `maintenance_items`, `maintenance_templates`, `attachments`,
`vehicle_photos`. Operasyon tabloları: `attachment_upload_reservations`,
`record_mutation_requests`, `attachment_cleanup_queue`, `ocr_usage_reservations`,
`ai_usage_reservations`, `user_entitlements`, `billing_webhook_events`.

User-owned erişim `auth.uid()` + `owner_id`/parent vehicle sahipliği ile RLS-scoped'dur. Çocuk insert
ve RPC'leri parent aracın da aynı kullanıcıya ait olduğunu doğrular. Client plan veya `user_id`
beyanı authorization kaynağı değildir. Atomic/versioned RPC'ler record+km, maintenance item seti,
document/expertise attachment, photo, reminder time entitlement ve kota yaşam döngülerini yönetir.

`vehicle-attachments` private bucket'tır. Path owner UUID ile başlar ve parent-scoped sürümde
`<owner>/<vehicle>/<parent-type>/<parent-id>/<random-id>.<ext>` kullanılır. Upload Edge Function
magic bytes/MIME/size/kota doğrular; download owner kontrolünden sonra kısa signed URL kullanır.

2026-09-02 read-only CLI envanterinde 28 local migration'ın tamamı remote history ile eşleşmiştir.
Remote aktif functions: `upload-attachment` v6, `delete-account` v1,
`reconcile-attachments` v3, `vehicle-ai-assistant` v1. Ayrıntı ve doğrulama komutları
`CLAUDE_SUPABASE_MAP.md` içindedir.

## OCR ARCHITECTURE

Üç workflow ortak cihaz-içi recognizer/preprocessing yaklaşımını paylaşır ama ayrı parser ve review
surface'leri kullanır:

- Fuel: total, litres, unit price, station/brand, date; güvenilir olduğunda saat/konum/belge no.
- Maintenance/service: provider, date, invoice/work-order no, birden çok item, quantity, unit/line
  total, parts/labor/grand total.
- Vehicle documents: registration, traffic/comprehensive insurance, inspection, expertise ve
  desteklenen tax/fine/other türlerinin normalize form alanları.

Image preprocessing on-device'dır. Parser partial result döndürür; null bilinmeyendir, sıfır değildir.
Kullanıcı suggestion alanını doğrudan edit/clear eder ve dolu değerleri açık “Forma aktar” eylemiyle
normal forma geçirir. OCR raw text transient kalır; auto-save yoktur. Normal form `Kaydet` ve private
attachment akışı tek persistence kapısıdır.

## MAINTENANCE ARCHITECTURE

`vehicle_records(record_type='maintenance')` bakım event source-of-truth'udur. Tarih, event km,
toplam ve açıklama yanında servis türü/adı, parts/labor, invoice no ve attachment ilişkisi taşır.
`maintenance_items` final operasyon setidir; `maintenance_templates` kullanıcı preset'idir.

Default catalog merkezi config'tedir. Template seçimi item'ları forma kopyalar; event edit'i template'i
değiştirmez. `custom:<trimmed label>` kimlikleriyle kullanıcı operasyonları seçilebilir/pakete
kaydedilebilir. `save_maintenance_record_with_details` event, item seti, servis ayrıntısı ve uploaded
attachment listesini owner-scoped transaction zincirinde bağlar. Legacy sıfır-item/null-detail
kayıtları uydurma veri eklenmeden okunur.

## DOCUMENT ARCHITECTURE

`vehicle_documents` merkezi document type kimliği, title/number, issuer, issue/start/event/expiry
tarihleri, note ve legacy attachment fallback'i taşır. Ortak `attachments` tablosu yeni private ekleri
parent'a bağlar. Detail/edit/open/delete mevcut owner-scoped akışını korur.

Status persist edilmez; `getDocumentStatus` ile 30 günlük eşikte `active`, `expiring_soon`, `expired`
ve `no_expiry` türetilir. UI bunları Active, Expiring Soon ve Archive filtrelerine mutually-exclusive
dağıtır. `no_expiry` Active/current görünümde kalır. Archive view/filter'dır: expired belgeler
otomatik taşınmaz, silinmez veya erişilemez yapılmaz. Legacy eksik issuer/expiry güvenli fallback ile
gösterilir.

## 3D VEHICLE ARCHITECTURE

14 desteklenen body type merkezi mapping ile yedi procedural düşük poligonlu family'ye gider:
sedan, hatchback, SUV/crossover, wagon, coupe/roadster, pickup/light-commercial ve MPV/van family
varyantları. Model vehicle color tokenını kullanır; unsupported/legacy değer güvenli fallback alır.

`@react-three/fiber/native` canvas demand rendering kullanır; geometry/material yaşam döngüsü dispose
edilir. Orbit yatay/dikey açıları bounds içinde, pinch zoom scale bounds içinde tutar. Gesture
arbitration yalnız viewport gesture'ı aktifken parent scroll'u askıya alır. Error boundary ve static
fallback düşük yetenekli/başarısız render'ı crash yerine güvenli yüzeye çevirir. Tüm family'ler source
ve unit/render testlerinde kapsanmıştır; Android GPU/gesture/scroll performansı fiziksel beklemededir.

## VEHICLE INTELLIGENCE / AI ARCHITECTURE

Vehicle Intelligence, vehicle-scoped source veriden deterministik facts, recent/prior trends, typed
signals, 0–1 confidence/data-quality ve internal 0–100 subscore/overall score üretir. Eksik domain
skoru `null` olur; health 0 kabul edilmez ve overall yalnız available domain'leri reweight eder.
Expertise yalnız record varlığı/latest date/age olarak kullanılır; attachment içinden teşhis çıkmaz.

Assistant context adapter yalnız vehicle display facts, normalize maintenance/document/fuel/cost/
reminder facts, data quality ve öncelikli typed signal'ları alır. Plate, email/name, notes, OCR text,
attachment/body/document number/raw rows gönderilmez. Canonical evidence code allowlist'i dışında
provider evidence reddedilir; human label/value trusted context'ten yeniden kurulur.

Mobil yalnız explicit user question ile `vehicle-ai-assistant` çağırır. Edge Function JWT kimliği ve
vehicle ownership doğrular; açık araç-dışı veya live price/nearby mechanic/traffic isteğini provider
öncesi deterministik döndürür ve kota tüketmez. Fren/direksiyon/duman/yangın/hararet/yakıt kaçağı
gibi risklerde deterministic safety override provider'dan üstündür. Provider fail/schema/evidence
hatasında reservation release edilir. Başarılı cevapta tam 1 kullanım commit edilir.

Adapter Gemini Interactions API `gemini-3.6-flash`, stateless `store=false` kullanır; provider türleri
ürün contract'ına sızmaz. Remote function aktif olsa da `AI_VEHICLE_ASSISTANT_ENABLED=true`,
`AI_PROVIDER_PRIVACY_APPROVED=true`, provider seçimi ve backend-only `GEMINI_API_KEY` birlikte
olmadan fail-closed. Free Tier gerçek-user privacy approval sayılmaz. Chat history persist edilmez.

## BILLING / REVENUECAT ARCHITECTURE

`BillingProvider` normalize subscription/Offering/purchase/restore/observer contract'ıdır.
`RevenueCatBillingProvider`, platform public SDK key'iyle configure olur ve stable Supabase user UUID
ile `logIn`; signout/account switch'te listener/package/local state temizler. RevenueCat active
entitlement identifier `premium`dir.

Paywall fiyat hard-code etmez; current Offering `monthly`/`annual` paket metadata'sını gösterir.
Purchase API sonucu tek başına unlock değildir: CustomerInfo active entitlement UI state'i günceller,
server-side capability ise trusted webhook → service-role-only
`process_revenuecat_subscription_event` → `user_entitlements` yolundan gelir. Event ledger duplicate
ve stale event'i yönetir; downgrade user data silmez.

Repository/mobile purchase gate varsayılan kapalıdır. Remote billing migration uygulanmıştır, fakat
webhook function ve store/RevenueCat production/test configuration kanıtlanmamıştır. Google Play
subscription ürünleri, monthly/yearly base plan, Offering package'ları, webhook auth ve license-test
purchase/restore tamamlanmadan Premium billing production-ready sayılmaz.

## ENTITLEMENT / QUOTA ARCHITECTURE

Merkezi güncel limitler:

| Capability                     |                    Free | Premium |
| ------------------------------ | ----------------------: | ------: |
| Araç                           |                       1 |       3 |
| OCR başarılı kullanım / ay     |                       3 |      30 |
| AI başarılı yanıt / ay         |                       1 |      50 |
| Entity başına ek               |                       5 |      10 |
| Entity başına plan byte limiti |                   15 MB |   30 MB |
| Kullanıcı Storage              |                   25 MB |  100 MB |
| Araç fotoğrafı                 |                       1 |       5 |
| Advanced Reports               |                   Hayır |    Evet |
| Custom reminder time           | Hayır; yeni kayıt 09:00 |    Evet |

OCR ve AI kotaları UTC calendar month + reservation/commit/release ile server-authoritative'dır.
Storage/vehicle/photo/reminder limitleri plan resolver + owner-scoped RPC/Edge sınırında uygulanır.
Free/Premium UI entitlement snapshot'ı yalnız sunum içindir. Downgrade mevcut araç/fotoğraf/ek/
reminder verisini silmez; yeni limit üstü action'ı engeller.

## EAS / ANDROID BUILD ARCHITECTURE

`app.json`: scheme `aracimcepte`, package/bundle ID `com.hilalaltunay.aracimcepte`, version `1.0.0`,
Android `versionCode: 2`. `eas.json`: `preview` = internal distribution + APK; `production` = AAB.
Signing ve EAS credential'ları repository'de secret olarak tutulmaz/değiştirilmez.

EAS environment yalnız public runtime config'i sağlamalı; service-role/provider/webhook secret mobil
bundle'a giremez. RevenueCat public platform SDK key'i istisna olarak mobil public config'dir, secret
değildir; purchase enabled gate ayrıca gerekir.

Yakın tarihli Metro blocker'ında `src/app/documents/index.test.tsx` Expo Router eager
`require.context` tarafından runtime route sayıldı. Test `vitest` → `vite/dist/node/module-runner.js`
Node runtime'ını Metro'ya çekti ve dynamic `import(filepath)` Android bundle'ını kırdı. Test aynı
semantikle `tests/routes/documentsArchive.render.test.tsx` konumuna taşındı. Runtime route ağacı test/
Node utility'den arındırıldı ve `npx expo export:embed --eager --platform android --dev false`
checkpoint'te geçti. Yeni EAS build öncesi bu komutu yeniden çalıştır.

## CURRENT PRODUCTION READINESS

### Implemented and repository-backed

- P0 signup/confirmation messaging, recovery deep-link/session/guard ve data-load error ayrıştırma.
- Remote schema parity (28/28 migration), photo upload contract/function v6 ve Free AI quota 1.
- Physical QA source batch: onboarding, 3D families/gestures, OCR review/parsers, custom maintenance
  operations, reminder title, assistant entry/UI, Premium discoverability.
- Premium Reports, document archive, reminder scheduling, Vehicle Intelligence, AI/provider safety,
  RevenueCat foundation ve EPDK fail-closed foundation.
- Accepted state GitHub'da `origin/feature/physical-android-qa-batch` ve checkpoint tag ile korunur.

### Remotely present at checkpoint

- Tüm 28 migration.
- `upload-attachment` v6, `delete-account` v1, `reconcile-attachments` v3,
  `vehicle-ai-assistant` v1.

### Still requires acceptance/configuration

- Güncel checkpoint'ten yeni preview APK; auth, vehicle/photo/OCR/3D/reminder/AI/paywall dahil fiziksel
  Android regression matrisi.
- Signup/recovery email delivery, exact Dashboard URL/template ve production SMTP/log kabulü.
- Authenticated password-change UX ayrı düzeltme.
- Gemini production privacy/commercial approval + trusted secret/gates; gerçek trafik şu anda kapalı.
- RevenueCat public credentials, webhook deploy/secrets, Google Play products/base plans/Offering,
  license-test purchase/restore/account switch ve yeni native build.
- EPDK reuse/legal/attribution/cache review ve trusted backend; canlı trafik kapalı.
- Final APK acceptance, final production AAB ve Google Play production rollout insan kararı.

## IMPORTANT HISTORICAL DECISIONS

- `main` released/stable, `develop` integration; feature/hotfix işi doğrudan `main`e gitmez.
- Closed-test freeze sırasında remote/store/build değişiklikleri ertelendi. Sonraki QA batch'inde
  remote migrations parity'ye getirildi ve gerekli function revizyonları uygulandı; bu, fiziksel veya
  production kabul değildir.
- Existing RLS/private Storage/client-secret sınırı bir feature'ı çalıştırmak için gevşetilemez.
- Historical odometer event saklanabilir ama `vehicles.current_km` high-water geriye düşmez.
- Expired document ve Premium downgrade user data'yı otomatik silmez.
- OCR sonucu öneridir: editable review ve explicit save olmadan gerçek kayıt sayılmaz.
- AI facts/evidence ile ground edilir; live external data/teşhis uydurmaz; iç health score TASK-034'te
  kullanıcıya büyük gauge olarak gösterilmez.
- RevenueCat client state server Premium authorization değildir; webhook reconciliation gerekir.
- Preview APK ve fiziksel Android kabulü production AAB/rollout'tan önce gelir.
- Büyük QA/bug batch'inde ilgili Markdown dosyalarının tamamı önce okunur, gereksinimler izlenebilir
  tutulur ve root cause kanıtlanmadan ad-hoc düzeltme yapılmaz.
