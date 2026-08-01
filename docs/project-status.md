# Proje durumu

## Tamamlananlar

- Expo Router tabanlı beş sekmeli Türkçe mobil uygulama.
- Supabase e-posta/şifre Auth, oturum restorasyonu ve şifre yenileme başlangıcı.
- Çok araç uyumlu domain, aktif araç seçimi ve repository mimarisi.
- Araç oluşturma/düzenleme ve kilometre yükseltme kuralı.
- Yakıt, bakım ve masraf CRUD; filtreli geçmiş.
- Tarih/kilometre hatırlatıcıları, tamamlama/geri alma ve yerel bildirim yönetimi.
- Dashboard özetleri, altı aylık bar grafik, güvenli maliyet/km hesabı ve boş durumlar.
- Üç gövde tipi için etkileşimli SVG şeması ve parça durum özeti.
- Ekspertiz, düz metin notlar, belgeler, bitiş planı ve özel ek dosyaları.
- Kullanıcı kapsamlı RLS, özel Storage bucket ve imzalı URL.
- Ayarlarda hesap, bildirim durumu ve onaylı veri silme işlemleri.
- Saf iş mantığı için Vitest testleri.

## Doğrulama

- TypeScript: geçti.
- ESLint: geçti.
- Vitest: 9 test geçti.
- Expo Doctor: 20/20 kontrol geçti.
- Expo Router/web export: 26 statik rota ve web bundle başarıyla üretildi.
- Android bundle: Metro ile başarıyla üretildi.
- Expo başlangıç: `packager-status:running`, LAN portu 8081.
- Yerel Supabase: `db reset` geçti; iki migrasyon uygulandı, RLS/bucket SQL sorgularıyla
  doğrulandı; security ve performance advisors sorun bulmadı.

## Bilinen sınırlamalar

- Uzak Supabase projesi henüz bağlı değildir; `.env` değerleri kullanıcı hesabından alınmalıdır.
- Karmaşık çevrimdışı mutation kuyruğu yoktur.
- PDF ve belge önizlemesi işletim sisteminin desteklediği uygulamaya yönlendirilir.
- Web, cihaz bildirimleri ve dosya izinleri için yalnızca yardımcı görsel önizlemedir.
- Güvenli hesap silme sunucu tarafı yönetici işlemi gerektirdiği için UI’da sunulmaz.
- Store release/EAS build yapılandırması bu MVP’nin kapsamı dışındadır.
- npm audit, Expo’nun Xcode/config-plugin araç zincirindeki `uuid` için 12 orta seviye geçişli
  uyarı raporluyor. Önerilen otomatik çözüm Expo SDK’sını kırıcı biçimde düşürdüğü için
  uygulanmadı; uygulama runtime kodunda doğrudan `uuid` kullanımı yoktur.

## Sonraki önerilen iş

Gerçek Supabase projesini bağlayıp migrasyonları staging ortama uyguladıktan sonra fiziksel
Android cihazda uçtan uca kabul testi ve görsel inceleme yapmak.
