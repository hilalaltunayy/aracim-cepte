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
