# Çoklu araç deneyimi

## Aktif araç

Uygulama tek bir kalıcı `activeVehicleId` kullanır. Açılışta bu kimlik kullanıcının erişebildiği
araçlarda yoksa oluşturulma sırası ile ilk geçerli sahip araç seçilir. Araç silinince aynı kural
uygulanır. Araç kapsamlı ekranlar yalnız aktif aracın bundle'ını gösterir; önceki yükleme sonucu
sonradan dönerse yeni seçimi ezemez.

## Plan sınırı ve veri koruma

| Plan | Yeni araç sınırı |
| --- | ---: |
| Free | 1 |
| Premium | 3 |

Sınır server tarafında authenticated kullanıcının güvenilir entitlement kaydından hesaplanır; mobil
istemci plan veya limit göndermez. Eksik, geçersiz veya okunamayan entitlement Free olarak ele alınır.

Premium'dan Free'ye düşüş hiçbir araç, kayıt, belge veya geçmiş verisini silmez ve mevcut araçlar
seçilebilir/okunabilir kalır. Yalnız yeni araç ekleme Free kapasitesinde engellenir.

## UX ilkesi

Tek araçta mevcut ana akış korunur. Birden çok araç olduğunda dashboard ve Araç ekranındaki kompakt
araç bağlamı kontrolü safe-area uyumlu seçim yüzeyini açar. Seçili araç; onay ikonu, erişilebilir
selected state ve metinle belirtilir; yalnız renge dayanmaz. Araç geçişinde yeni araç verisi yüklenene
kadar hafif yükleme durumu kullanılır; tüm dashboard yeniden tasarlanmaz.

## Gelecek tüketiciler

Araç oluşturma yalnız merkezi entitlement kapasitesi üzerinden kontrol edilir. Yeni premium
özellikler ekranlarda dağınık `isPremium` kontrolleri yerine entitlement/domain katmanını kullanır.
