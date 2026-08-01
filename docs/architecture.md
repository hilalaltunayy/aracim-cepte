# Mimari

## Katmanlar

- `src/domain`: Platformdan bağımsız entity’ler, draft tipleri ve repository sözleşmesi.
- `src/data`: Supabase istemcisi, SQL tipleri, snake_case/camelCase mapper’ları, repository ve
  özel Storage işlemleri.
- `src/features`: Bildirim ve gövde şeması gibi özellik odaklı iş mantığı.
- `src/shared`: Tema, Türkçe etiket kaynağı, saf hesaplamalar ve tekrar kullanılan UI bileşenleri.
- `src/store`: Oturum dışı uygulama verisi, hidratasyon ve aktif araç seçimi için Zustand.
- `src/app`: Expo Router ekranları. Rotalar doğrudan SQL/Supabase çağrısı yapmaz.

## Veri akışı

Ekran bir Zustand eylemi çağırır. Store, `AppRepository` sözleşmesi üzerinden
`SupabaseAppRepository` ile konuşur. Repository oturum sahibini doğrular, owner/vehicle kapsamlı
sorguyu yapar, mapper ile domain modelini döndürür. Başarılı mutation sonrasında aktif araç
verisi yeniden yüklenir; uzak kayıt başarısızsa UI başarı bildirmez.

AsyncStorage yalnızca Supabase oturumu, onboarding durumu ve son aktif araç kimliği gibi
hassas olmayan tercihleri saklar. Uzak Supabase kaynağı esas kaynaktır.

## Çok araç desteği

Store `vehicles: Vehicle[]` ve `activeVehicleId` taşır. Her ilişkili entity `vehicleId` ve
`ownerId` içerir. UI MVP’de yalnızca ilk/aktif aracı gösterir; gelecekte araç seçici ve premium
limit kontrolü repository/entity kimlikleri değişmeden eklenebilir.

## Gelecek entegrasyon noktaları

- Premium/RevenueCat: araç oluşturma use-case’inin önüne entitlement kontrolü eklenebilir.
- Onaylı paylaşım: araç kimliğini değiştirmeden ayrı `vehicle_permissions` ve süreli
  `share_codes` tabloları eklenebilir; mevcut owner RLS’i korunur.
- AI/OCR: ek dosya yolları ekspertiz ve belgelerde hazırdır. Gelecekte sunucu tarafı Edge
  Function işleme sonucu ayrı yapılandırılmış tablolarda tutulmalıdır; mobil istemciye ayrıcalıklı
  anahtar verilmemelidir.
- Satış raporu: mevcut kaynak entity’lerden türetilir; hesaplanan toplamlar veritabanında
  yinelenmez.

## Hata ve çevrimdışı davranışı

Repository hataları Türkçe güvenli mesajlara çevrilir. Form state’i uzak mutation tamamlanana
kadar ekranda kalır. Aktif araç ve onboarding tercihi yerelde kalıcıdır. Karmaşık offline
mutation kuyruğu bu MVP’de yoktur; uygulama kaydedilmemiş veriyi uzakta saklandı diye göstermez.
