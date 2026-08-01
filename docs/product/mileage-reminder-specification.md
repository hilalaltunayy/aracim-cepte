# Kilometre tabanlı hatırlatıcı spesifikasyonu

## Temel gerçek

V1 uygulaması, kullanıcı girişi veya ayrı bir araç entegrasyonu olmadan aracın gerçek kilometresini
bilemez. En son geçerli ve kullanıcı tarafından manuel girilmiş kilometre, **mevcut bilinen
kilometre** olur. Bu değer canlı telemetri değildir ve UI hiçbir yerde canlı araç takibi izlenimi
veremez.

## Kilometre kaynakları

Geçerli kilometre aşağıdaki kullanıcı işlemlerinden gelebilir:

- Araç düzenleme.
- Yakıt kaydı.
- Bakım/servis kaydı.
- Bağlamla ilgili olduğunda diğer kayıt.
- Hızlı kilometre güncelleme.

Her kaynak kaydın değeri, zamanı, araç kimliği ve mümkünse source type'ı tutarlı biçimde ele
alınmalıdır. Geçmiş tarihli/düşük kilometreli bir kayıt tarihçe için saklanabilir ancak mevcut bilinen
kilometreyi sessizce düşürmemelidir. Düşürme/düzeltme gerekiyorsa bunun ayrı, açık ve audit edilebilir
ürün davranışı tasarlanmalıdır.

## Karşılaştırma

Kilometre hatırlatıcısı `targetMileage - latestKnownMileage` farkını kullanır. Geçerli mevcut
kilometre yoksa durum hesaplanmaz; kullanıcıdan kilometre güncellemesi istenir. Örnek sunum
durumları:

| Fark         | Örnek durum                          |
| ------------ | ------------------------------------ |
| `> 1.000 km` | 1.000 km'den fazla kaldı / planlandı |
| `= 1.000 km` | 1.000 km kaldı                       |
| `= 500 km`   | 500 km kaldı / yaklaşıyor            |
| `= 0 km`     | Zamanı geldi                         |
| `< 0 km`     | Gecikti; mutlak fark kadar km aşıldı |

Ürün, aradaki mesafeler için tutarlı eşikler belirleyebilir; `1.000` ve `500` kritik sınırlarında
off-by-one davranışı test edilmelidir. Hem tarih hem kilometre hedefi varsa daha acil durumun nasıl
seçildiği hesaplama spesifikasyonuyla tek kaynaktan tanımlanmalıdır.

## Bildirim davranışı

- Bildirimler ancak uygulama daha yeni, geçerli bir kilometre aldığında yeniden hesaplanabilir.
- Araç kullanılmaya devam ederken uygulamaya veri girilmezse kilometre alarmı kendiliğinden
  ilerlemez; bu sınırlama UI'da anlaşılır olmalıdır.
- Aynı kilometre güncellemesi tekrar işlendiğinde duplicate notification üretilmemelidir.
- İzin reddi reminder kaydını başarısız saydırmamalı; bildirim durumu açıkça gösterilmelidir.
- Background job dahi gerçek kilometre verisi yokken yeni kilometre uyduramaz.

## Gelecek olasılıkları

- Tarihsel kilometre artışı, açıkça **tahmin** etiketiyle gelecekte due date tahmini üretebilir.
- Gelecek OCR, dashboard/kilometre sayacı görselinden aday değer çıkarabilir; kullanıcı onayı olmadan
  current mileage yapılamaz.
- OBD-II ve üretici/connected-car API entegrasyonları destek, izin, doğruluk, güvenlik, maliyet ve
  araç uyumluluğu için ayrı araştırma ve mimari karar gerektirir.

## Gelecek uygulama görevi için acceptance criteria

- [ ] Mevcut bilinen kilometre yalnız izin verilen manuel kaynaklardaki geçerli değerlerden türetilir.
- [ ] Başka aracın veya kullanıcının kilometresi hesaba katılmaz; RLS/owner negatif testi vardır.
- [ ] Yeni yüksek kilometre current value'ı günceller; geçmiş/düşük kayıt sessizce düşürmez.
- [ ] Kilometresi bilinmeyen araç için yanıltıcı due/overdue durumu gösterilmez.
- [ ] `>1000`, `1000`, `500`, `0` ve `<0` sınırları unit testle kanıtlanır.
- [ ] Tarih + kilometre kombinasyonunun öncelik kuralı test edilir.
- [ ] Yeni mileage geldiğinde reminder ve notification yeniden hesaplanır.
- [ ] Aynı event retry'ında duplicate notification oluşmaz.
- [ ] İzin reddi ve scheduling hatası Türkçe, güvenli ve kurtarılabilir durum üretir.
- [ ] UI mevcut bilinen değerin kaynağını/zamanını gösterebilir ve canlı tracking iddiası yapmaz.
- [ ] Kalıcılık uygulama yeniden açıldıktan sonra ve authenticated Supabase oturumunda doğrulanır.
- [ ] Android gerçek cihazda hızlı güncelleme, kayıt kaynakları ve notification davranışı manuel test
      edilir.
- [ ] Dokümantasyon ve [V1 release kapıları](../release/v1-release-gates.md) güncellenir.

## Kapsam dışı

Bu spesifikasyon OCR, tahmin motoru, OBD, üretici API'si veya otomatik sensör erişimini V1'e dahil
etmez.
