# AracımCepte V1 ürün kapsamı

## Release amacı

İlk Google Play yayını, tek araç kullanan bir kişinin temel araç kayıtlarını ve hatırlatıcılarını
güvenilir, anlaşılır ve kalıcı biçimde yönetebildiği ücretsiz Android sürümüdür. V1'in başarı ölçütü
özellik sayısı değil; kritik akışların gerçek cihazda çalışması, kullanıcı verisinin Supabase'de
kalıcı ve kullanıcıya özel olması, açık hata/boş/yükleme durumları ve mağaza yayın hazırlığıdır.

## V1'de çalışması gereken akışlar

- Kayıt olma.
- E-posta doğrulama.
- Giriş yapma.
- Çıkış yapma.
- Parola sıfırlama.
- Araç oluşturma ve düzenleme.
- Yakıt kayıtları.
- Bakım/servis kayıtları.
- Diğer gider kayıtları.
- Hatırlatıcı oluşturma, düzenleme ve silme.
- Tarih tabanlı hatırlatıcılar.
- En son bilinen ve kullanıcı tarafından manuel girilmiş kilometreyi kullanan kilometre tabanlı
  hatırlatıcılar.
- Doğru temel dashboard istatistikleri.
- Kalıcı Supabase depolama.
- Güvenilir geri navigasyon.
- Android mobil navigasyon.
- Anlamlı boş durumlar.
- Görünür ve tutarlı yükleme durumları.
- Teknik ayrıntı veya hassas veri sızdırmayan açık Türkçe hata mesajları.
- Uygulama ikonu.
- Splash screen.
- Yayınlanmış privacy policy.
- Hesap silme.
- Kullanıcı verisi silme.
- Store ekran görüntüleri ve listing varlıkları.
- Gerçek Android cihaz kabul testi.
- Production Android build.
- Play Console yüklemesi.

Özel araç belgeleri V1'de sunuluyorsa [Storage politikası](../security/storage-policy.md) ve
[ADR-001](../decisions/ADR-001-private-document-storage.md) eksiksiz uygulanmalı; belge kotası ve
dosya doğrulaması server/database tarafında enforce edilmelidir.

## V1 belge yükleme koşulu

2026-08-01 tarihli geçici Free ürün kararı:

- Kullanıcı başına en fazla 10 belge.
- Kullanıcı başına toplam en fazla 25 MB.
- Dosya başına en fazla 5 MB.
- Yalnız PDF, JPG/JPEG ve PNG.
- Hem belge adedi hem toplam byte kotası server/database tarafında, client bypass ve paralel upload
  yarışına dayanıklı biçimde uygulanır.
- JPG/JPEG ve PNG için upload öncesi görsel sıkıştırma; okunabilirlik, kalite, cihaz maliyeti ve
  metadata temizliği açısından değerlendirilir. Sıkıştırma server-side güvenlik kontrolünün yerine
  geçmez.

Bu kararın repository uygulaması [TASK-002](../../tasks/active/TASK-002-storage-quota-and-kvkk-release-readiness.md)
içinde hazırlanmıştır; migration/Edge Function deploy edilmeden ve local/QA/device doğrulamaları
tamamlanmadan production davranışı veya release kabulü sayılmaz.

Belge yükleme production V1 için koşulludur:

1. Kota/file validation, private Storage, owner isolation, signed URL, deletion ve log kontrolleri
   ile [KVKK readiness blocker'ları](../security/kvkk-readiness.md) tamamlanırsa etkinleştirilir.
2. Bu teknik veya hukuki kontroller tamamlanmazsa V1'de belge yükleme geçici olarak devre dışı
   bırakılır. Eksik kontrolle upload yayınlamak kabul edilemez.

Özellikle Supabase Frankfurt nedeniyle yurt dışına veri aktarımı değerlendirmesi, Supabase/Resend
alt işleyen incelemesi, KVKK aydınlatma metni, gizlilik politikası, saklama/silme politikası, hesap ve
tüm kullanıcı verisi silme, veri ihlali prosedürü ve profesyonel hukuk incelemesi açık
[release blocker'dır](../release/v1-release-gates.md). Bu belge hukuki uyumluluk iddiası oluşturmaz.

## V1 dışında

- OCR.
- AI ile belge çıkarımı.
- Yakıt fişi ayrıştırma.
- Otomatik kilometre sayacı tanıma.
- OBD-II.
- Üretici araç API'leri.
- Connected-car entegrasyonları.
- Herkese açık araç sorgulama.
- Alıcıyla paylaşım.
- Çok kullanıcılı araç erişimi.
- Premium ödeme uygulaması.
- RevenueCat.
- Google Play Billing.
- Gelişmiş AI sağlık raporları.
- Otomatik araç sensörü erişimi.
- Ayrı tasarlanıp onaylanmadıkça uçtan uca şifreli belge depolama.

V1, bu alanlar için temiz interface'ler veya migration gerektirmeyen genişleme noktaları
hazırlayabilir; kullanıcıya görünür özellik, veri toplama, üçüncü taraf aktarımı, ödeme kodu ya da
çalışmayan placeholder uygulayamaz. Gelecek özellikler mevcutmuş gibi pazarlanamaz.

## Kapsam kararı

Yeni bir öneri yukarıdaki çalışan akışlardan birini release blocker olmaktan çıkarmıyorsa V1'e
eklenmez. Kapsam değişikliği ayrı görev, risk değerlendirmesi ve insan onayı gerektirir. Yayın
durumu [V1 release kapılarında](../release/v1-release-gates.md) izlenir.
