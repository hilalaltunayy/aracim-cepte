# TASK-047 — Vehicle Assistant context grounding & coverage

Kaynak issue: `vehicle-assistant-context-grounding-05.md` (repo kökünde referans görselleriyle).
Bu dosya o issue'nun yaşayan execution planıdır.

## Goal

Araç Asistanı'nın Aracım Cepte'de kayıtlı olan veriyi (renk, gövde durumu, bakım, yakıt, gider,
belge, hatırlatıcı, kilometre) güvenilir biçimde yanıtlaması; Gemini'nin veri kaynağı değil, güvenilir
veri üzerinde dil katmanı olması.

## Current state (audit, 2026-09-07)

### Kök neden 1 — renk (deployment drift)

Deployed `vehicle-ai-assistant` (v11) context loader'ı yalnız
`.select('id,owner_id,brand,model,year,current_km')` yapıyor. `color`, `color_id`, `fuel_type`,
`body_type`, `plate` **seçilmiyor**; deployed context'in `vehicle` bloğu yalnız
`displayName/year/currentOdometer` içeriyor. Gemini gerçekten renk bilgisine sahip değildi, bu yüzden
"Sistemimde aracın rengine dair bir bilgi bulunmamaktadır." doğru bir cevaptı.

Commit'li kaynak bunu zaten düzeltmiş: renk/yakıt/kasa/plaka seçiliyor, `COLOR_LABELS`/`FUEL_LABELS`/
`BODY_LABELS` etiketleniyor ve `resolveDeterministicVehicleFact` provider'a hiç gitmeden yanıtlıyor.
**Deploy edilmemiş.** Bu görevde deployment gerekiyor.

### Kök neden 2 — gövde durumu (gerçek kod boşluğu)

`loadVehicleAssistantContext` `body_part_conditions` ve `body_part_condition_values` tablolarını
**hiç sorgulamıyor** — ne deployed ne commit'li sürümde. Context'te gövde durumu diye bir alan yok.
Asistan doğru biçimde "doğrudan veri yok" deyip `expertiseFacts.hasReport` üzerinden ekspertiz
raporuna düşüyor. Bu görevde kapatılacak asıl kod boşluğu budur.

### Diğer bulgular

1. Context tamamen **server-side** kuruluyor. `src/features/vehicleIntelligence/services/vehicleAssistantContext.ts`
   (`buildVehicleAssistantContext`) hiçbir yerden import edilmiyor — ölü istemci yolu.
2. Provider tüm context'i `JSON.stringify(input.context)` ile prompt'a koyuyor; context'e eklenen her
   alan modele gider. Plaka bu yüzden `privateFacts` içinde tutuluyor ve context'e girmiyor.
3. `canonicalEvidenceCatalog` dizileri atlıyor (`if (Array.isArray(value)) return;`), bu yüzden panel
   listesi için evidence kodları açıkça üretilmeli.
4. `resolveDeterministicVehicleFact` kasa tipini yalnız "kasa tipi"/"kasa turu" ile eşliyor; uygulama
   etiketi ise **"Gövde tipi"**. "gövde tipi" sorusu bugün eşleşmiyor; ayrıca "gövde durumu" ile
   karışmamalı.
5. Ekspertiz kapsamı yalnız `hasReport/latestDate/ageDays`; şirket, kilometre, not alanları
   context'e girmiyor. Bakım/yakıt/belge/hatırlatıcı yalnız toplu istatistik olarak var, "son kayıt"
   ayrıntısı yok.
6. Asistan ekranı zaten `<Screen scroll={false} backdrop={<AutomotiveBackdrop />}>` kullanıyor
   (commit `98c1678`) — Home ile aynı bileşen. Cihazdaki build eski. Yeni bileşen yazılmayacak.
7. `npx supabase migration list --linked`: 30/30 uygulanmış, drift yok. Bu görev **migration
   gerektirmiyor**; gövde durumu tabloları ve RLS politikaları zaten mevcut.

## Scope

- `VehicleAssistantContext`'e yapılandırılmış `bodyCondition` bloğu (panel bazlı durum + özet).
- Edge `_shared` içinde parça anahtarı → Türkçe etiket haritası + app kataloguyla drift-guard testi.
- Doğrudan gövde durumu verisinin ekspertize göre önceliği; `provenance` ile kaynak/tarih.
- Gövde durumu, "hangi parçalar hasarlı/boyalı", "tavan orijinal mi", özet için deterministik yanıt.
- "gövde tipi" ↔ "gövde durumu" ayrımı.
- Domain bazlı `retrievalStatus`: erişim hatası "veri yok" olarak sunulmayacak.
- Niyet duyarlı (Layer 2) sınırlı ayrıntı katmanı: son bakım/yakıt/belge/hatırlatıcı/ekspertiz/km.
- Gemini sistem talimatının güncellenmesi (§22).
- Testler + typecheck + lint + Android production bundle.
- `vehicle-ai-assistant` fonksiyonunun yeniden deploy'u (kök neden 1 ve 2 için zorunlu).

## Out of scope

- Reports/Vehicle/BodyCondition ekran tasarımları, Gemini değişimi, kota/fiyat değişikliği.
- Vector DB / RAG; Gemini'ye doğrudan DB erişimi; her istekte tam DB gönderimi.
- Reports hesap motorunun refactor'u. Asistan kendi sınırlı toplamlarını Deno içinde üretir; Reports
  ile sayısal uyum ayrı bir **conformance testiyle** kanıtlanır (Deno `@/` alias'ını çözemediği için
  `vehicleReports.ts` doğrudan import edilemez).

## Security/privacy impact

- Plaka context'e girmez (mevcut `privateFacts` sınırı korunur). Panel notları (`note`) serbest metin
  olduğu için context'e **alınmaz**; yalnız enum durumlar ve tarih gider.
- Tüm sorgular caller'ın RLS-scoped client'ı ile ve `.eq('owner_id', userId)` + `.eq('vehicle_id', …)`
  ile yapılır. Yeni tablo erişimi mevcut owner-scoped RLS politikalarının içindedir.
- Signed URL, dosya yolu, belge numarası, OCR ham metni prompt'a girmez.

## Rollback

Kod: `git revert`. Fonksiyon: önceki deployment'a `supabase functions deploy` ile dönülebilir.
Migration yok, veri değişikliği yok.
