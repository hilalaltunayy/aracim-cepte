# Veri sınıflandırması

## Amaç

Bu model hangi verinin toplanabileceğini, nerede saklanabileceğini, loglanıp loglanamayacağını,
kimlerin erişebileceğini ve silme/retention davranışını belirler. Bir kayıt birden fazla seviye
içeriyorsa en yüksek seviye tüm kayda ve türetilmiş kopyalarına uygulanır. OCR metni, thumbnail,
export, backup ve log kopyası kaynak veriden daha düşük sınıfa indirilemez.

## Seviyeler

| Seviye                               | Tanım                                                                                                                                                                                                                                         | Temel kullanım kuralı                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Public                               | Bilinçli olarak herkese açıklanması onaylanmış içerik.                                                                                                                                                                                        | Public erişim ancak açık ürün kararıyla; kullanıcı verisi varsayılan olarak Public değildir.                     |
| Internal                             | PII veya secret olmayan operasyon, dokümantasyon ve ürün içi metadata.                                                                                                                                                                        | En az yetki; gereksiz dış paylaşım ve production log kalıcılığı yok.                                             |
| Personal                             | Kimliği belirli/belirlenebilir kişi veya onun araç/kullanım davranışıyla ilişkili veri.                                                                                                                                                       | Auth + owner scope + RLS; amaç sınırlı işleme, minimizasyon ve silme/retention süreci.                           |
| Sensitive personal/business document | Kimlik, imza, adres, finans, konum, hasar, sigorta, hukuki ilişki ya da birden çok PII içerebilen dosya/kayıt. Bu etiket KVKK'daki “özel nitelikli kişisel veri” kategorisi hakkında hukuki iddia değildir; ürün içi yüksek koruma sınıfıdır. | Private Storage, kısa signed URL, sıkı erişim, içeriksiz log/metric, kısıtlı admin erişimi, deletion audit.      |
| Authentication secret                | Hesaba/sisteme erişim veya privilege sağlayan token, parola, secret/key.                                                                                                                                                                      | UI/log/analytics/repository dışında; güvenli secret/session mekanizması, rotasyon ve gerektiğinde derhal revoke. |

## Alan örnekleri

| Veri                                     | Varsayılan sınıf                     | Uygulama notu                                                                            |
| ---------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| E-posta adresi                           | Personal                             | Auth amacıyla; log ve analytics'te raw değer yok.                                        |
| Ad/soyad                                 | Personal                             | Gerekli değilse toplanmaz; belge içindeyse belge yüksek sınıfta kalır.                   |
| Telefon                                  | Personal                             | Açık kullanım amacı olmadan istenmez.                                                    |
| Plaka numarası                           | Personal                             | Kişi/araçla ilişkilendirilebilir; URL, object name ve analytics label'a konmaz.          |
| Araç verisi (marka, model, yıl, VIN vb.) | Personal                             | VIN ve benzersiz tanımlayıcılar daha sıkı minimizasyon ister.                            |
| Kilometre                                | Personal                             | Kullanım davranışı/tarihçe gösterebilir; owner scope gerekir.                            |
| Gider kayıtları                          | Personal                             | Tutar, tarih, lokasyon ve sağlayıcı finansal davranış gösterebilir.                      |
| Sigorta belgeleri                        | Sensitive personal/business document | Kimlik, iletişim, poliçe ve finansal alan içerebilir.                                    |
| Ruhsat/tescil belgeleri                  | Sensitive personal/business document | Adres, kimlik/vergi no, VIN ve imza içerebilir.                                          |
| Belgede görünen kimlik numarası          | Sensitive personal/business document | Ayrı metadata olarak çıkarılmamalı; OCR/AI aktarımı varsayılan kapalı.                   |
| Yüklenen görseller/dosyalar              | Sensitive personal/business document | İçerik bilinmese bile en yüksek olası belge sınıfı uygulanır.                            |
| Signed URL                               | Authentication secret                | Süresi boyunca dosya erişimi sağlayan bearer capability; loglanmaz/paylaşılmaz.          |
| Supabase access/refresh token            | Authentication secret                | Session mekanizması dışında saklanmaz veya görüntülenmez.                                |
| Publishable/anon key                     | Internal                             | Tek başına secret değildir ama RLS'in yerine geçmez; kötüye kullanım korumaları gerekir. |
| Service-role key                         | Authentication secret                | İstemcide, repository'de, logda veya fixture'da kesinlikle bulunamaz.                    |
| Veritabanı parolası / provider secret    | Authentication secret                | Yalnız yetkili server/secret manager; rotasyon ve access audit.                          |

## İşleme kuralları

### Toplama

- Alanın V1 kullanıcı akışına zorunlu olduğu gösterilmelidir.
- Serbest metin alanlarında kullanıcıya hassas veri girmeme uyarısı değerlendirilir.
- Belge yükleme varsayılan olarak yüksek hassasiyetlidir; görünmeyen EXIF/metadata da hesaba katılır.

### Saklama ve erişim

- Personal veri authenticated owner scope ve RLS olmadan saklanamaz.
- Yüklenen dosyalar yalnız private bucket'ta, random ID içeren PII-free path ile tutulur.
- Auth secret'ları uygulama veri modeli veya analytics'e kopyalanamaz.
- Admin erişimi istisna, zaman sınırlı, gerekçeli ve audit edilebilir olmalıdır.

### Log, test ve paylaşım

- Personal içerik ve authentication secret loglanmaz.
- Test/seed/screenshot için sentetik veri kullanılır; production kopyası kullanılmaz.
- Dış provider'a aktarım yeni purpose, notice, sözleşme, retention, bölge ve hukuki inceleme ister.

### Silme ve retention

- Kullanıcı/araç/belge silme, ilişkili database satırı, Storage object, türetilmiş içerik ve
  erişilebilir cache'i kapsamalıdır.
- Backup'tan anlık fiziksel silme mümkün değilse süre, erişim kısıtı ve yeniden yüklemeyi önleme
  davranışı belgelenir.
- Yasal/sözleşmesel retention gereği ürün ekibi tarafından varsayılmaz; hukuk incelemesi gerekir.

## Yeni veri alanı kontrolü

Her yeni alan için görevde şu sorular yanıtlanır: Neden gerekli? En düşük yeterli hassasiyet nedir?
Kim erişir? RLS/authorization testi nedir? Log/analytics'e girer mi? Ne zaman silinir? Export ve hesap
silmede ne olur? Üçüncü tarafa aktarılır mı? Cevapsız alan release kapsamına giremez.
