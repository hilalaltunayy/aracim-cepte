# TASK-042 — Premium polish + Vehicle Assistant

Kaynak: `01_premium_polish_and_vehicle_assistant_spec.md` (source of truth).
`02_premium_post_release_backlog.md` yalnız backlog'dur; bu görevde uygulanmaz.

## Goal

Premium raporları okunur bir dashboard'a dönüştür, Araç Asistanı sohbetini kalıcı-olmayan session
belleğiyle ChatGPT benzeri tek scroll'a taşı, temel araç bilgilerini deterministik olarak
cevaplanabilir kıl ve kotayı yalnız gerçekten cevaplanan sorularda düşür.

## Background

Spec'in şikayetleri repo'da doğrulandı. Rapor ekranı aynı `TrendChart`'ı üç kez kullanıyor,
dağılım için pie/donut yok ve 4 sütunlu bakım satırı dar cihazlarda TL taşırıyor. Asistan sohbeti
ekran-yerel `useState` içinde; route değişince kayboluyor. Asistan bağlamı araç tablosundan yalnız
`brand,model,year,current_km` seçiyor. Kota, cevabın *yapısal* geçerliliğine göre commit ediliyor —
"veri yok" cevabı da hak yakıyor.

## Current state (kanıtlanmış)

- `src/features/reports/components/VehicleReportsScreen.tsx:342,440,508` — üç ayrı `TrendChart`.
- `src/features/reports/components/VehicleReportsScreen.tsx:693` — `maintenanceLine` dört sütunlu
  `flexDirection:'row'`; alt `Text`'lerde `numberOfLines`/`flexShrink` yok → 360 px'te TL taşması.
- `src/features/vehicleAssistant/components/VehicleAssistantScreen.tsx:69` — `messages`
  bileşen-yerel `useState`; tab değişince unmount ile siliniyor.
- `supabase/functions/_shared/vehicleAssistantContext.ts:64` —
  `.select('id,owner_id,brand,model,year,current_km')`. `vehicles` tablosunda mevcut olmasına
  rağmen `color`, `color_id`, `fuel_type`, `body_type`, `plate` seçilmiyor.
  `vehicleAssistantContext.ts:236` marka ve modeli yalnız birleşik `displayName` olarak veriyor.
- `supabase/functions/_shared/vehicleAssistantHandler.ts:171` — `commitQuota`, yalnız
  `validateFinalVehicleAssistantResponse` geçtiği için çağrılıyor; sonucun *faydalı* olup olmadığı
  hiç sınıflandırılmıyor.
- `supabase/functions/_shared/vehicleAssistantProvider.ts:92,209` —
  `JSON.stringify(input.context)` bağlamın tamamını Gemini'ye gönderiyor.

## Scope

1. Raporlar: hero summary, donut dağılımı, tek aylık trend line, karşılaştırma bar chart, 2x3
   yakıt metrik grid'i, sadeleşmiş bakım özeti, taşma korumaları.
2. Asistan: session-only Zustand slice + kompakt sticky composer.
3. Deterministik araç bilgileri: bağlama marka/model/renk/yakıt/kasa; plaka **bağlama girmez**.
4. Kota: typed outcome sınıflandırması; yalnız `answered` commit eder.
5. Premium copy: `En fazla 3 araç` -> `3 araç ekleme özelliği`.

## Out of scope

Spec §7 korumalı alanları (RevenueCat, webhook, Supabase auth, password reset, OCR parser,
onboarding crash fix, 3D, notifications, documents, body condition, expert report, home screen),
spec §8 backlog maddeleri, schema/migration değişikliği, versionCode.

## Güvenlik kararı — plaka

`vehicleAssistantContext.ts:52-55` açıkça "Plate … are never selected" purpose-limitation
guardrail'ini taşıyor ve `vehicleAssistantProvider.ts` bağlamın tamamını üçüncü taraf sağlayıcıya
gönderiyor. Plakayı `VehicleAssistantContext`'e eklemek, AGENTS.md'nin yeni privacy incelemesi ve
açık onay gerektirdiği bir sınır ötesi PII aktarımı olurdu. Bu nedenle plaka **modele hiç
gönderilmez**; yalnız Edge Function içinde kalan, prompt'a ve evidence katalog'una girmeyen ayrı
bir `privateFacts` alanından deterministik olarak yanıtlanır. Kullanıcı "plakam ne?" cevabını alır,
plaka Gemini'ye gitmez.

## Acceptance criteria

- Rapor ekranı donut + tek line + bar chart içerir; mevcut `buildVehicleReport` hesapları değişmez.
- 360 px genişlikte TL değerleri kart dışına taşmaz (`numberOfLines` + `flexShrink` + `minWidth:0`).
- Route değişip geri dönünce sohbet korunur; hiçbir AsyncStorage/Supabase yazması olmaz.
- "Rengim ne?" / "plakam ne?" / "modelim ne?" deterministik cevap döner ve kota düşmez.
- `not_found`/`insufficient_data` sonucunda commit çağrılmaz, reservation release edilir.
- `answered` sonucunda commit çağrılır.
- Premium paywall `3 araç ekleme özelliği` gösterir.

## Risks

- RNSVG New Architecture Double-cast tuzağı (bkz. `c2374e0`). Azaltma: donut yalnız `Path d`
  string'i kullanır, bar chart tamamen düz RN `View`; hiçbir SVG elemanına dokunma handler'ı
  bağlanmaz.
- Kota davranışı değişikliği fazla cömert olabilir. Azaltma: sınıflandırma yalnız deterministik
  metin/evidence sinyallerine bakar, varsayılan `answered`'dır.

## Rollback

Her madde ayrı commit. `git revert <sha>` tek başına yeterlidir; migration veya remote mutasyon yok.
