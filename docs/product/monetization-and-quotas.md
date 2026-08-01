# Monetization ve kota ilkeleri

Bu belge nihai fiyat veya satın alma ürünü tanımlamaz. Paket sınırları maliyet ölçümü, kullanıcı
araştırması, mağaza kuralları, vergi ve hukuki değerlendirmeden sonra yapılandırılmalıdır. Billing
V1'e açık insan onayı olmadan eklenemez.

## Free

- Bir araç.
- Temel yakıt, bakım/servis ve diğer gider kayıtları.
- Temel istatistikler.
- Sınırlı özel belge depolama.
- **2026-08-01 geçici ürün kararı:** Kullanıcı başına en fazla **10 belge**, toplam **25 MB** ve
  dosya başına en fazla **5 MB**.
- İzinli dosyalar yalnız PDF, JPG/JPEG ve PNG'dir. Teknik allow-list `application/pdf`,
  `image/jpeg` ve `image/png` MIME türlerinden oluşur; JPG ve JPEG aynı MIME türüne eşlenir.
- Belge adedi ve toplam byte kotası birlikte uygulanır; sınırların herhangi birini aşan upload
  reddedilir.
- Kota yalnız UI'da gösterilmez; server/database/Storage'a güvenli yakınlıkta atomik veya yarış
  koşullarına dayanıklı biçimde enforce edilir.
- JPG/JPEG ve PNG görseller için upload öncesi sıkıştırma; cihaz belleği, okunabilirlik, kalite,
  EXIF/metadata temizliği ve yeniden kodlama riskiyle birlikte teknik uygulama öncesinde
  değerlendirilir. Client-side sıkıştırma server-side kota ve dosya doğrulamasının yerine geçmez.

Bu karar V1 planlaması için geçicidir; nihai fiyat/paket kararı değildir. Repository uygulaması
[TASK-002](../../tasks/active/TASK-002-storage-quota-and-kvkk-release-readiness.md) kapsamında
hazırlanmıştır. Migration/Edge Function deploy'u, local/QA integration testi ve production upload
kararı tamamlanmadığı için bu durum release kabulü değildir.

## Belge yükleme release seçenekleri

Production V1 için yalnız iki kabul edilebilir seçenek vardır:

1. [Storage politikası](../security/storage-policy.md), [KVKK readiness](../security/kvkk-readiness.md)
   ve [release kapılarındaki](../release/v1-release-gates.md) hukuki/teknik kontroller tamamlanırsa
   belge yüklemeyi etkinleştirmek.
2. Bu kontroller tamamlanmazsa belge yüklemeyi V1'de geçici olarak devre dışı bırakmak. Kota veya
   privacy kontrollerini yalnız UI'ya bırakan bir upload yolu production'a açılamaz.

## Premium

- Birden fazla araç.
- Daha yüksek, yapılandırılabilir belge kotası.
- Gelişmiş raporlar.
- Export.
- Hazır ve onaylı olduğunda OCR özellikleri.
- Akıllı kilometre tahmini.
- Hazır ve onaylı olduğunda izin tabanlı paylaşım.

## Gelecek Pro

- Aile/ekip kullanımı.
- Daha yüksek depolama.
- Desteklenen araçlar için OBD/üretici entegrasyonları.
- Gelişmiş AI özellikleri.

## Bağlayıcı ilkeler

- Gerçek anlamda sınırsız depolama reklamı yapılamaz. Yüksek paketler dahi adil kullanım ve teknik
  sınırlarla açıkça belgelenir.
- Storage, egress, signed URL, OCR/AI token/işlem, bildirim, destek ve abuse maliyetleri kullanıcı ve
  paket düzeyinde içerik görmeden ölçülebilir olmalıdır.
- Fiyat; beklenen altyapı, mağaza komisyonu, vergi, destek, fraud/refund ve AI maliyetini makul
  güvenlik payıyla aşmalıdır.
- Google Play Billing, RevenueCat veya başka ödeme altyapısı V1'e açık onay olmadan eklenmez.
- Kotalar kod içine dağılmış sabitlerden değil, yetkili server-side yapılandırmadan yönetilmelidir.
- Kota artırımı authorization kontrolünü gevşetmez ve object ownership'i değiştirmez.
- Kullanım metrikleri belge içeriğini, dosya adını, OCR metnini, plaka/VIN'i veya PII'yi açığa
  çıkaramaz. Gerekli minimum değerler örneğin object sayısı ve byte toplamıdır.
- Silinen dosyanın kota kullanımı yarış koşulu ve başarısız silme senaryosuyla tutarlı hesaplanır.
- Abonelik düşüşünde veri aniden silinmez; salt-okunur/grace-period/indirme-silme davranışı ayrı
  ürün ve retention kararıyla açıkça tasarlanır.

## Production öncesi gereken kararlar

- Geçici kararın production öncesinde aynen korunacağı veya yeni ölçümle revize edileceği ürün sahibi
  tarafından onaylanmalı.
- Repository uygulamasında kota gerçek Storage object sayısı/byte toplamı ile kısa ömürlü upload
  rezervasyonlarını birlikte sayar; yarım rezervasyon beş dakika içinde geçersiz olur. Production
  orphan reconciliation/audit prosedürünün sahibi ve çalışma sıklığı ayrıca atanmalı.
- Paralel upload'lar kullanıcı UUID'si üzerinde transaction advisory lock ile seri hale getirilir;
  bu mekanizma local/QA concurrency testi geçmeden kabul edilmiş sayılmaz.
- Kamera/galeri JPEG seçiminde kalite `0.85` tutulur. PDF/PNG kör yeniden kodlanmaz; EXIF temizleme,
  cihaz belleği ve belge okunabilirliği için ayrı cihaz testli sıkıştırma kararı gerekir.
- Paket düşüşü, refund ve grace period davranışı nedir?
- Maliyet alarm eşikleri ve abuse rate limitleri nelerdir?
- Kullanıcı kendi kullanımını hangi gecikmeyle görecek?
