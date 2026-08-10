# V1 sonrası geliştirme yol haritası

Bu belge Aracım Cepte'nin V1 sonrası geliştirme sırası için source-of-truth'tur. Fazlar yayın tarihi,
nihai fiyat, kalıcı kota veya evrensel entegrasyon vaadi değildir. Her madde ayrı task, tehdit/risk
değerlendirmesi, kabul kriterleri ve gerektiğinde feature flag ister.

## Phase 0 — Release güvenliği

- Recoverable Git snapshot ve annotated release tag'i.
- `main`, `develop`, `feature/*`, `chore/*`, `hotfix/*` ve `release/*` branch modeli.
- Branch/tag korumaları ve review edilmiş release adımları.
- Her riskli değişiklik için bilinen rollback veya forward-recovery yolu.

## V1.1 — Tarihsel kayıt ve yapılandırılabilir bakım temeli

- Historical odometer/event mileage modeli.
- Timeline-aware mileage validation.
- Bilinmeyen tarihsel kilometre desteği.
- Maintenance event ve maintenance items ayrımı.
- Yapılandırılabilir bakım paketleri.
- Kullanıcı tarafından oluşturulan bakım paketleri.
- Genişletilmiş vehicle body taxonomy.
- Araç rengi yapılandırması.

## V1.2 — Generic 3D vehicle proof of concept

- Tek bir sedan ile sınırlı generic 3D POC.
- Touch rotation.
- Araç rengi.
- Seçilebilir body panels.
- POC teknik, performans ve erişilebilirlik kabulünden geçmeden başka body type'lara genişlememe.

## V1.3 — Cihaz üzerinde OCR

- On-device yakıt fişi OCR.
- Manual ve OCR veri girişinin birlikte korunması.
- OCR review/confirmation ekranı.
- Tutar, litre ve birim fiyat için kullanıcı onaylı smart calculation.
- Yakıt fişi akışı doğrulandıktan sonra maintenance invoice OCR değerlendirmesi.

OCR çıktısı doğrulanmış gerçek kabul edilmez; kullanıcı incelemesi ve düzeltmesi zorunludur.

## V1.4 — Smart Trips V1

- Route, distance ve duration.
- Yakıt gereksinimi ve estimated fuel cost.
- Fuel stop ve rest stop önerileri.
- Temel preference profile.

Routing ve fiyat sağlayıcıları provider abstraction arkasında tutulur; kapsama, doğruluk veya canlı
veri erişimi evrenselmiş gibi sunulmaz.

## V2.0 — Premium

- Entitlement-based architecture.
- Yapılandırılabilir maksimum araç sayısı.
- Sınırlı free AI trial.
- Premium AI vehicle assistant.
- Gelişmiş vehicle health analysis.
- Personalized trip optimization.
- Advanced reports.
- Premium OCR quota.
- Premium notifications.

Bu faz nihai fiyat veya kalıcı kota belirlemez. Entitlement ve limitler merkezi, ölçülebilir ve
yapılandırılabilir olmalıdır.

## Later V2.x

- Live fuel prices.
- Mechanic sharing.
- Advanced AI memory.
- Travel/holiday road-trip planning.

## V3+

- OBD araştırması ve destek matrisi.
- Connected vehicle integrations.
- Lisanslı real vehicle/360 assets.
- Ayrı mechanic/service B2B product.

Üretici, model, ülke ve sağlayıcı desteği değişir; universal vehicle-data access vaat edilmez.

## Ürün ilkesi

**Free:** record and track.

**Premium:** scan, ask, plan, automate, predict.

Bu ayrım fiyat, store paketi veya permanent quota kararı değildir. Nihai ticari kararlar maliyet,
mağaza komisyonu, vergi, destek, storage ve AI kullanım verisiyle ayrıca onaylanır.
