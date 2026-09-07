# TASK-045 — Premium entitlement & feature reliability remediation

Kaynak issue: `premium-entitlement-feature-reliability-03.md` (untracked, repo kökünde referans
görselleriyle birlikte). Bu dosya o issue'nun yaşayan execution planıdır.

## Goal

Aktif Premium hesabın uygulama yeniden başlatıldığında da anında ve tutarlı biçimde Premium
davranması; hatırlatıcı özel saat kaydı, belge oluşturma/yükleme, OCR ve belge dışa aktarma
akışlarının genel hata mesajı yerine gerçek nedeni gösteren, çalışan akışlar hâline gelmesi.

## Background

Play/RevenueCat test satın alması hesabı Premium yapıyor, ancak uygulama yeniden açıldığında
Premium-bağımlı ekranlar Free gibi davranıyor; dakikalar sonra veya tekrar tekrar gezinince
düzeliyor. Aynı dönemde hatırlatıcı özel saat kaydı, belge oluşturma ve OCR genel
`İşlem tamamlanamadı. Lütfen tekrar deneyin.` hatası veriyor.

## Current state (audit, 2026-09-07)

Doğrulanmış bulgular:

1. **İki bağımsız entitlement kaynağı, aralarında hiçbir bağ yok.**
   - `src/features/billing/store/billingStore.ts` RevenueCat `CustomerInfo`'yu tutar; `unknown`
     durumu vardır, canlı `CustomerInfoUpdateListener` bağlıdır, doğru ve hızlıdır.
   - `src/store/dataStore.ts` `entitlements` alanı **tek** feature-gating kaynağıdır ve yalnız
     Supabase `user_entitlements` aynasından (`loadCurrentEntitlements`) beslenir.
   - İkisi `src/app/_layout.tsx` içinde paralel iki `useEffect` ile aynı anda tetiklenir; birbirini
     hiç beslemez. RevenueCat "premium" derken `dataStore` "free" kalabilir.
2. **`unknown` durumu Free olarak render ediliyor.** `dataStore` başlangıç değeri
   `FREE_ENTITLEMENTS`; `loadEntitlementsWithFallback` her hata/eksik satırı Free'ye düşürür.
   `dataStore`'da `unknown` diye bir kavram yoktur.
3. **Ayna yalnız `bootstrap()` / `refresh()` / `mutate()` içinde okunur.** Cold start'ta Free
   okunduysa, bir mutation olana kadar bir daha okunmaz. "Gezinince/tıklayınca düzeliyor"
   davranışının doğrudan sebebi budur.
4. **Güvenli, istek üzerine mutabakat (reconciliation) yolu yok.** Ayna yalnız RevenueCat
   webhook'u ile yazılır (`supabase/functions/revenuecat-webhook`,
   `public.process_revenuecat_subscription_event`). Webhook gecikirse/başarısız olursa istemcinin
   sunucuya "beni yeniden doğrula" diyebileceği hiçbir güvenli uç yoktur. `src/app/premium.tsx`
   içindeki `waitForServerPremium` yalnız ~22 saniye kör polling yapar, sonra vazgeçer — referans
   görsel `01-premium-verifying-after-reentry.jpeg` tam olarak bu durumdur.
5. **Sunucu tarafı tüm Premium zorlamaları aynaya bağlıdır.** `private.effective_plan_for_user`
   sadece `public.user_entitlements` okur; hatırlatıcı tetikleyicisi, ek dosya/depolama kotaları,
   OCR kotası ve araç limiti hep bunu kullanır. Ayna bayatken **sunucu** reddeder.
6. **Hatırlatıcı kaydı hatasının kök nedeni.** `20260814133000_reminder_notification_preferences.sql`
   içindeki `enforce_reminder_due_time_entitlement` trigger'ı, plan Free görünürse
   `CUSTOM_REMINDER_TIME_PREMIUM_REQUIRED` (P0001) fırlatır.
7. **Genel hata maskeleme.** `src/shared/utils/errors.ts` `getFriendlyError` yalnız
   `vehicle_limit_reached` kodunu tanır. Backend'in ürettiği ~65 spesifik kodun tamamı generic
   `İşlem tamamlanamadı. Lütfen tekrar deneyin.` mesajına düşer (referans görsel
   `02-reminder-save-failure.jpeg`).
8. **OCR tamamen cihaz üstüdür** (`expo-mlkit-ocr`); signed URL / Edge Function yoktur. Gerçek
   başarısızlık yolları: (a) bayat ayna → Free kotası 3 → `OCR_MONTHLY_QUOTA_EXCEEDED`,
   (b) `provider_unavailable`, (c) yalnız *henüz yüklenmemiş* (`PendingAttachment`) görseller
   taranabilir; kaydedilmiş bir belge yeniden açıldığında "JPG/PNG ekleyin" denir.
9. **Belge dışa aktarma çalışma ağacında zaten var** (`DocumentCard.onDownload`, commit `6840dce`).
   Cihazdaki build eskidir. Gerçek eksikler: tek dosyada indirir ama çok dosyalı belgede sessizce
   editöre yönlendirir (aynı ikon iki farklı iş yapar), ve ikonun görünür bir metin etiketi yoktur.
10. **Migration drift yok.** `npx supabase migration list --linked` (2026-09-07): 30/30 local
    migration remote'ta uygulanmış.

## Scope

- Tek kanonik entitlement çözümü: `unknown | free | premium` + ayna/store kaynak ayrımı.
- RevenueCat → uygulama durumu köprüsü tek noktada (`src/app/_layout.tsx`).
- Güvenli, sunucu-otoriter mutabakat: yeni Edge Function + service-role RPC + additive migration.
- Backend guard kodlarının kullanıcıya anlaşılır Türkçe mesaja eşlenmesi.
- Premium ekranındaki kör polling'in gerçek mutabakatla değiştirilmesi.
- Reports / hatırlatıcı özel saat gate'lerinin `unknown` durumunda Free kilidi göstermemesi.
- OCR hata mesajlarının gerçek nedeni ayırt etmesi.
- Belge dışa aktarmanın keşfedilebilir ve çok dosyada anlaşılır olması.
- Hedefli testler + typecheck + lint + Android production bundle.

## Out of scope

- Reports görsel tasarımı, dönem kalıcılığı, PDF export (TASK-044 korunur).
- Vehicle Assistant floating entry (ayrı iş, korunur).
- Paywall/fiyat/ürün kimliği değişikliği, RevenueCat veya Supabase değişimi.
- Sunucu tarafı zorlamaların gevşetilmesi, istemcinin kendine Premium vermesi, kota bypass'ı.
- Bekleyen tüm migration'ların toplu push'u; yalnız bu hatanın gerektirdiği additive migration.

## Acceptance criteria

Bkz. issue bölüm 16. Otomatik olarak doğrulanabilenler hedefli testlerle, cihaz gerektirenler
completion report'ta "Manual verification required" altında raporlanır.

## Risks

- **Edge Function secret'ı yok.** `REVENUECAT_SECRET_API_KEY` bu ortamda mevcut değil; fonksiyon
  webhook ile aynı desende **fail-closed** (503 `BILLING_SYNC_DISABLED`) davranır ve secret
  ayarlanana kadar mutabakat yapmaz. Bu, insan yetkisi gerektiren manuel adım olarak raporlanır.
- **İstemcinin store durumuna güvenmesi.** Yalnız *UI affordance* için; sunucu zorlaması aynen
  korunur. İstemci hiçbir yerde kendine Premium yazamaz.
- **Migration additive**: yalnız yeni bir service-role RPC eklenir; mevcut tablo/politika
  değişmez, veri silinmez. Forward recovery: RPC `drop function` ile geri alınabilir.

## Security/privacy impact

- Yeni Edge Function caller'ın JWT'sinden `auth.uid()` çözer; caller-supplied `user_id` kabul
  etmez. RevenueCat secret'ı yalnız fonksiyon ortamında tutulur, cevaba/loga yazılmaz.
- Yeni RPC `security definer`, `search_path=''`, yalnız `service_role`'a grant. `authenticated`
  execute yok → istemci self-upgrade yolu açılmaz.
- Hata eşlemesi ham provider/Postgres detayını kullanıcıya sızdırmaz; yalnız bilinen sabit kodları
  sabit Türkçe metne çevirir.

## Rollback

Her faz ayrı commit. Kod: `git revert <sha>`. Backend: yeni RPC `drop function`; yeni Edge Function
`npx supabase functions delete sync-entitlement`. Mevcut webhook yolu değişmediği için geri
alındığında sistem bugünkü davranışına döner.

## Backend rollout execution plan (2026-09-07)

### Goal

Yalnız `20260907120000_entitlement_reconciliation_rpc.sql` migration'ını bağlı production
Supabase projesine uygulamak, güvenlik doğrulamasını çalıştırmak ve gerekli RevenueCat sync
secret'ları varsa yalnız `sync-entitlement` Edge Function'ını deploy etmek.

### Scope

- Bağlı proje, migration geçmişi, Edge Function ve secret adlarını doğrula.
- Bekleyen tek reconciliation migration'ını dry-run sonrası uygula ve remote geçmişini doğrula.
- RPC'nin `SECURITY DEFINER`, boş `search_path` ve yalnız `service_role` execute sınırını test et.
- Gerekli secret'lar eksikse Function deployment'ından önce dur.
- Mevcut `revenuecat-webhook` sürüm/hash/durumunu değişmeden doğrula.

### Out of scope / Do not change

Uygulama kodu, diğer migration/RLS/RPC/Storage nesneleri, mevcut Edge Function'lar, RevenueCat/Play
ürünleri ve secret değerleri değiştirilmeyecek; secret değerleri okunmayacak veya raporlanmayacak.

### Risks and recovery

Migration additive ve veri silmez. Beklenmeyen migration kapsamı dry-run'da görülürse uygulama
durdurulur. RPC kaynaklı production sorunu için forward recovery, yalnız yeni imzayı
`drop function public.reconcile_revenuecat_subscriber_state(...)` ile kaldırmaktır. Function ancak
iki gerekli değişken de mevcutsa deploy edilir; deployment mevcut webhook'a dokunmaz.

### Validation

- `npx supabase migration list --linked`
- `npx supabase db push --linked --dry-run`, ardından yalnız beklenen migration için gerçek push
- `supabase/tests/entitlement_reconciliation.sql` içeriğini transaction + rollback ile remote çalıştırma
- Remote function privilege/definition kontrolleri ve security advisor
- Secret adları kontrolü; değerler raporlanmaz
- `revenuecat-webhook` deployment kimliği, version, hash ve ACTIVE durumu öncesi/sonrası karşılaştırma

### Rollout result

#### Completed

- Bağlı production proje `eiqxvvnqkbzbhzpthcwo` (`ACTIVE_HEALTHY`, eu-central-1, PostgreSQL
  17.6) olarak doğrulandı.
- Dry-run yalnız `20260907120000_entitlement_reconciliation_rpc.sql` migration'ını gösterdi; bu
  migration remote'a uygulandı ve remote history/RPC varlığı bağımsız olarak doğrulandı.
- Remote RPC: `SECURITY DEFINER`, `search_path=""`, advisory lock, auth-user doğrulaması, support
  override ve upsert içeriyor; ACL yalnız `postgres` ve `service_role` execute veriyor. `anon` ve
  `authenticated` execute kapalı.
- Handler testleri 12/12 geçti.
- `revenuecat-webhook` migration öncesi/sonrası `ACTIVE`, v3 ve aynı deployment hash'iyle kaldı.

#### Skipped

- `sync-entitlement` deploy edilmedi. Remote secret envanterinde `REVENUECAT_SECRET_API_KEY` ve
  `REVENUECAT_SYNC_ENABLED` bulunmadığı için fail-closed deployment kapısı uygulandı.
- İlgisiz security-advisor uyarıları bu dar rollout kapsamında değiştirilmedi.

#### Failed

- `npx supabase db push --linked`, migration'ı uyguladıktan sonra yerel Docker engine bulunamadığı
  için Edge Runtime image kontrolünde hata koduyla sonlandı. Remote migration history ve RPC
  varlığı migration'ın commit olduğunu doğruladı; hiçbir Edge Function değişmedi.
- Transactional remote fixture, connector read-only transaction sınırı nedeniyle ilk test
  `INSERT`'ünde reddedildi; fixture verisi oluşmadı. Eşdeğer privilege/definition kontrolleri
  salt-okunur sorguyla geçti, ancak mutation senaryoları remote üzerinde tekrar çalıştırılmalıdır.

#### Manual verification required

- Supabase Edge Function secrets'a `REVENUECAT_SECRET_API_KEY=<RevenueCat server-side secret API key>`
  ve `REVENUECAT_SYNC_ENABLED=true` eklenmeli; değerler repository'ye veya rapora yazılmamalı.
- Secret'lar eklendikten sonra yalnız `sync-entitlement` deploy edilmeli ve transactional
  `supabase/tests/entitlement_reconciliation.sql` testi yazma yetkili, rollback-capable bağlantıyla
  yeniden çalıştırılmalı.

### Rollout continuation result (2026-09-07)

#### Completed

- `REVENUECAT_SECRET_API_KEY` ve `REVENUECAT_SYNC_ENABLED` secret adlarının remote projede mevcut
  olduğu, değerleri okunmadan doğrulandı.
- Yalnız `sync-entitlement`, API bundling ile deploy edildi; function `ACTIVE`, v1,
  `verify_jwt=false`, import map etkin ve deployment hash'i
  `60b9ea2541b28f4759d51a5c2ba315a2a2f0036a1e4691caf64f1708080571a6`.
- `supabase/tests/entitlement_reconciliation.sql` linked, write-capable Management API yolu ile
  başarıyla çalıştı. Dosyanın `ROLLBACK` adımı sonrasında iki fixture user, entitlement ve webhook
  event sayıları ayrı sorguyla sıfır doğrulandı.
- Entitlement handler testleri yeniden çalıştırıldı: 12/12 geçti.
- `revenuecat-webhook` deploy öncesi ve sonrası `ACTIVE`, v5 ve kaynak hash'i
  `26b072809a50ed79c4bedbb4f75457c509adacacdbb1dc98a8604709aee8566e` olarak değişmeden kaldı.
  Önceki kayıttaki v3'e göre version metadata secret ayarlarından sonra zaten v5 idi; bu rollout
  webhook'u deploy etmedi ve source hash'i değişmedi.
- Final migration dry-run remote veritabanının güncel olduğunu doğruladı.

#### Skipped

- Gerçek kullanıcı/RevenueCat subscriber çağrısı test verisini değiştireceği için otomatik olarak
  tetiklenmedi; cihazdaki satın almış test hesabıyla acceptance kapsamındadır.
- İlgisiz Supabase schema, RLS, function ve secret'ları değiştirilmedi.

#### Failed

- Yok.

#### Manual verification required

- Satın almış bir license tester hesabıyla uygulamayı cold-start ederek `sync-entitlement`
  çağrısının gerçek RevenueCat subscriber kaydını Premium aynasına taşıdığı doğrulanmalı.
