# Türkiye akaryakıt fiyat verisi fizibilitesi

**Araştırma tarihi:** 13 Ağustos 2026
**Kapsam:** Yalnız düşük hacimli, herkese açık sayfa/dokümantasyon incelemesi. Üretim entegrasyonu,
scraping, toplu indirme veya erişim kontrolü aşma yapılmadı.

## Sonuç özeti

| Kaynak | Bulgu türü | Konum / güncellik | Risk | Üretim için sonuç |
| --- | --- | --- | --- | --- |
| Opet | Website-internal JSON endpoint; **resmî public API değil** | İl + ilçe, ürün ve sayfanın son güncelleme tarihi | **RED** | Yazılı lisans/izin olmadan kullanılmamalı. |
| Petrol Ofisi | Sayfaya gömülü veri; public API veya kararlı internal endpoint bulunmadı | İl + ilçe satırları; ayrı veri zaman damgası görünmedi | **YELLOW** | Teknik olarak okunabilir, fakat yeniden kullanım ve stabilite izni gerekir. |
| Aytemiz | Sayfaya gömülü şehir/İstanbul bölgesi verisi; public API veya kararlı internal endpoint bulunmadı | Şehir; İstanbul Anadolu/Avrupa ayrımı; sayfada güncelleme zamanı | **YELLOW** | Teknik olarak okunabilir, fakat yeniden kullanım ve stabilite izni gerekir. |
| EPDK | Resmî XML web servisi ve sorgu portalı | İl, marka, yakıt türü, fiyat; belgeli sorgu parametreleri | **GREEN** (ön inceleme) | İlk resmî aday; sözleşme, kapasite ve XML sözleşmesi yine doğrulanmalı. |
| Google Places API (New) | Belgeli ticari API | İstasyon bazlı `fuelOptions`/fiyat/zaman damgası alanı | **UNKNOWN** | Türkiye alan kapsamı ve maliyet gerçek bir proje ile doğrulanmadan aday sayılmamalı. |
| TomTom | Yakıt istasyonu POI aranabilir; fuel-price API bulunamadı | Türkiye fiyat kapsamına ilişkin resmî kanıt bulunmadı | **UNKNOWN** | Fiyat kaynağı olarak seçilmemeli. |

`GREEN`, hukuki/operasyonel uyumluluk garantisi değil; yalnız kaynak türü ve ilk teknik uygunluk
değerlendirmesidir. `robots.txt` izinleri de veri lisansı veya API sözleşmesi değildir.

## Sağlayıcı bulguları

### Opet

- [Akaryakıt fiyatları sayfası](https://www.opet.com.tr/akaryakit-fiyatlari) şehir/ilçe ve ürün
  fiyatlarını gösteriyor; sayfa fiyatların tavsiye fiyat olduğunu, bayinin nihai satış fiyatını
  bağımsız belirleyebildiğini söylüyor.
- Sayfa bileşeni herkese açık, kimlik doğrulamasız JSON çağrıları kullanıyor: `GET`
  `https://api.opet.com.tr/api/fuelprices/provinces`, `lastupdate` ve
  `prices?ProvinceCode=<il-kodu>&IncludeAllProducts=true`. İncelenen örnek yanıt il, ilçe,
  ürün adı/kodu ve `amount` içerdi. Sayfa `Channel: Web` ve dil başlığı gönderiyor; örnek çağrı
  oturum/cookie olmadan da yanıt verdi. Bu, endpoint'i **public API** yapmaz.
- `lastupdate` gün bilgisi sağlıyor; ürün satırında bağımsız zaman damgası yok. Para birimi sayfada
  TL olarak sunuluyor. Aşağıdaki hedef şekle dönüştürülebilir; `observedAt` fetch anı, bildirilen
  tarih ise ayrı kaynak metadatası olmalıdır:

  ```ts
  { provider, city, district, fuelType, pricePerLiter, currency: 'TRY', observedAt }
  ```

- [Opet kullanım koşulları](https://www.opet.com.tr/bilgi-toplulugu-hizmetleri/kullanim-kosullari),
  site verisinin kopyalanması/dağıtılması ve başka mecrada izinsiz kullanımını yasaklıyor. Bu nedenle
  sınıf **RED**: yazılı veri lisansı ve kullanım SLA'sı olmadan endpoint ya da sayfa verisine bağlı
  ürün özelliği yapılmamalı.

### Petrol Ofisi

- [Fiyat sayfası](https://www.petrolofisi.com.tr/akaryakit-fiyatlari) 81 il ve ilçe filtreleriyle
  litre başına V/Max Kurşunsuz 95, V/Max Diesel, PO/gaz LPG gibi değerler sunuyor.
- İncelenen sayfa HTML'inde ilçe kimlikleri/adları ve fiyat satırları gömülüydü. Sayfa/bağlı genel
  JavaScript içinde fiyatları alan belgeli ya da kararlı bir XHR/fetch endpoint'i saptanmadı.
  Dolayısıyla bulgu **embedded/static website data**dır; endpoint varsayılmamalıdır.
- Kimlik doğrulama gerekmeden sayfa okunuyor; satır bazlı `observedAt` görünmedi. İl/ilçe/fuel
  eşlemesi normalize edilebilir, ancak güncellik yalnız alınma zamanı ile temsil edilmelidir.
- Public API, yeniden kullanım lisansı veya rate-limit belgesi bulunmadı. `robots.txt` genel tarama
  izni veriyor fakat ticari veri yeniden kullanımına izin vermez. Sınıf **YELLOW**: yazılı izin ve
  değişiklik/rate-limit anlaşması olmadan sürdürülebilir kaynak değildir.

### Aytemiz

- [Ana fiyat sayfası](https://www.aytemiz.com.tr/akaryakit-fiyatlari/benzin-fiyatlari) şehir bazlı
  Optimum Kurşunsuz 95 ve dizel değerlerini KDV dahil olarak gösteriyor. [İstanbul sayfası](https://www.aytemiz.com.tr/akaryakit-fiyatlari/benzin-fiyatlari/istanbul-benzin-fiyati)
  Anadolu/Avrupa ayrımı ve bir sayfa güncelleme zamanını içeriyor.
- İncelenen HTML şehir tablosunu gömülü taşıyor; güvenle dayanılabilecek belgeli public API veya
  internal JSON endpoint bulunmadı. Bu nedenle bulgu **embedded/static website data**dır.
- Şehir/İstanbul bölgesi ve ürün/fiyat eşlemesi normalize edilebilir. Tüm ilçeler için kapsam ayrıca
  kanıtlanmadığından ilçe kapsamı vaat edilmemelidir.
- Public API, yeniden kullanım lisansı veya rate-limit belgesi bulunmadı. `robots.txt` veri lisansı
  değildir. Sınıf **YELLOW**: ancak yazılı izin + işletim anlaşması sonrasında aday olabilir.

## Resmî ve ticari alternatifler

### EPDK

[EPDK Web Servisleri](https://www.epdk.gov.tr/Detay/Icerik/3-0-226/web-servisler), illere göre
akaryakıt bayi fiyatları için XML servisini ve en yüksek işlem hacimli sekiz firmanın ortalama bayi
fiyatları servisini açıkça listeliyor. [EPDK fiyat sorgu/rapor alanı](https://www.epdk.gov.tr/Detay/Icerik/3-0-158/akaryak)
ise il, marka ve yakıt türü bazlı resmi veriye işaret ediyor. Bu, mevcut seçenekler içinde en iyi
başlangıç noktasıdır: önce resmi erişim şartları, sorgu sıklığı, marka/ilçe ayrıntısı, gecikme ve
ticari kullanım izni yazılı olarak doğrulanmalıdır. Bu araştırma XML servisine yük testi veya toplu
sorgu yapmadı.

### Google Maps Platform

Google'ın [Places API (New) alan dokümanı](https://developers.google.com/maps/documentation/places/web-service/data-fields)
`fuelOptions` alanını Place Details/Text Search/Nearby Search için Enterprise + Atmosphere katmanında
belgeliyor. [Alan sözleşmesi](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places)
istasyon başına yakıt türü, para birimli fiyat ve `updateTime` tanımlar. Bu gerçek, sözleşmeli bir
API'dir; ancak doküman Türkiye'de fiyat alanının her istasyonda döneceği garantisini vermiyor. Ücret
Enterprise + Atmosphere SKU'suna bağlıdır; güncel [fiyatlandırma](https://developers.google.com/maps/billing-and-pricing/pricing)
ile maliyet modeli karar öncesi ölçülmelidir. Türkiye kapsamı boş değerler de dahil olmak üzere
temsilî istasyonlarda, anahtar sunucu tarafında tutularak POC ile doğrulanmalıdır.

### TomTom

TomTom'un resmî Search API dokümantasyonu yakıt istasyonu POI/konum keşfi için aday olabilir; bu
araştırmada Türkiye pompa fiyatı sağlayan belgeli bir TomTom API'si bulunmadı. Dolayısıyla TomTom
rota/istasyon konumu araştırmasında tekrar değerlendirilebilir, fakat canlı fiyat sağlayıcısı olarak
seçilmemelidir.

## Önerilen gelecek karar ve tasarım sınırı

Uygulama henüz hiçbir sağlayıcıya bağlanmamalıdır. Sonraki onaylı görevde, sunucu tarafında
uygulanacak küçük bir `FuelPriceProvider` sözleşmesi kullanılmalıdır; mobil istemci sağlayıcı
credential'ı veya supplier endpoint'i doğrudan çağırmamalıdır.

Önerilen güvenli fallback sırası:

1. Lisanslı sağlayıcıdan ilçe + marka + yakıt türü fiyatı.
2. Aynı lisanslı sağlayıcıdan il + marka + yakıt türü fiyatı.
3. Aynı zaman penceresindeki birden fazla lisanslı kaynağın yerel ortalaması — kullanıcıya açıkça
   **TAHMİN** olarak etiketlenir.
4. Güvenilir canlı veri yok: canlı fiyat gösterilmez; kullanıcı manuel fiyat/kayıt kullanır.

Bu veri daha sonra ancak kaynak lisansı, güncellik/SLA ve coğrafi kapsam doğrulanırsa marka/ilçe
tahmini, fiyat-değişim bildirimi ve rota yakıt-maliyeti tahminine katkı sağlayabilir. Tavsiye/ortalama
fiyat hiçbir zaman istasyon pompa fiyatı veya rota maliyetinin kesin gerçeği olarak sunulmamalıdır.

## Sonraki insan kararı

1. EPDK ile resmi kullanım koşulu ve ürün gereksinimi (marka, ilçe, gecikme) eşleşmesini doğrulamak.
2. Google Places için Türkiye kapsama + Enterprise maliyet POC'sine izin verilip verilmeyeceğini
   belirlemek.
3. Opet/Petrol Ofisi/Aytemiz ile yalnız yazılı lisans ve SLA alınırsa ayrı entegrasyon değerlendirmesi
   açmak.
