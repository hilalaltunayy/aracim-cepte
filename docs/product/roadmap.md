# Ürün yol haritası

> Bu belge V1 hazırlanırken yazılmış üst seviye ürün ufkunu korur. V1 sonrası güncel geliştirme
> sırası ve branch'lenebilir fazlar için source-of-truth
> [development roadmap](development-roadmap.md) belgesidir.

Bu yol haritası yön bildirir; tarih, fiyat, belirli araç/üretici desteği veya yayın garantisi değildir.
Her aşama ayrı araştırma, güvenlik/gizlilik değerlendirmesi, maliyet analizi ve onaylı görev ister.

## V1 — Güvenilir ücretsiz temel

- Stabil, ücretsiz, tek araçlı release.
- Temel yakıt, bakım/servis ve diğer gider kayıtları.
- Tarih ve bilinen manuel kilometre temelli hatırlatıcılar.
- Private Storage içinde güvenli belgeler.
- Temel ve doğrulanmış istatistikler.
- Google Play yayını.

V1'in bağlayıcı ayrıntıları [V1 kapsam belgesindedir](v1-scope.md). V1 ödeme, OCR, AI veya araç
entegrasyonu içermez.

## V1.1 — Premium temeli

- Premium entitlement ve paket temelinin tasarlanması.
- Birden fazla araç.
- Yapılandırılabilir depolama kotaları.
- Export ve rapor iyileştirmeleri.
- Google Play Billing / RevenueCat kararının verilmesi ve onaylanırsa entegrasyonu.

Fiyatlar ve nihai paketler bu aşamadan önce maliyet, komisyon, vergi ve destek analiziyle belirlenir.

## V2 — Akıllı veri girişi ve öngörü

- Yakıt fişi OCR.
- Araç belgesi OCR.
- Dashboard/kilometre sayacı görselinden kilometre tanıma.
- Akıllı alan doldurma.
- Tarihsel kayıtlardan kilometre artış tahmini.
- Tahmini bakım vade tarihi.
- Gelişmiş raporlar.

OCR/AI çıktısı güvenilir gerçek olarak kabul edilmez; kullanıcı onayı, confidence gösterimi,
provider veri aktarımı değerlendirmesi ve yanlış okuma güvenlik sınırları tasarlanır.

## V3 — Entegrasyon ve paylaşım araştırmaları

- OBD-II araştırması.
- Üretici API entegrasyonları.
- Connected-car desteği.
- Aile/ekip araç erişimi.
- İzin tabanlı araç paylaşımı.
- AI araç sağlığı içgörüleri.

Evrensel araç verisi erişimi vaat edilmez. Üretici API'leri, ülke, model, model yılı, donanım,
kullanıcı hesabı, sözleşme, araç bağlantısı ve teknik izinlere göre destek değişir. Her entegrasyon
destek matrisi, veri kaynağı, gecikme/doğruluk sınırı ve fallback davranışıyla ayrı onaylanır.
