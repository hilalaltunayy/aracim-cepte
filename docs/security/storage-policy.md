# V1 özel belge Storage politikası

## Kapsam

Bu politika kullanıcı tarafından yüklenen araç belgesi, fotoğraf ve PDF'lerin V1'de nasıl kabul
edileceğini, saklanacağını, erişileceğini ve silineceğini tanımlar. [ADR-001](../decisions/ADR-001-private-document-storage.md)
uyarınca private Supabase Storage kullanılır. Bu gereksinimlerin bir kısmının kodda bulunması release
kabulü değildir; [release kapıları](../release/v1-release-gates.md) güncel test kanıtı ister.

**Uygulama durumu:** Aşağıdaki 5 MB ve PDF/JPEG/PNG sınırları 2026-08-01 tarihli geçici V1 ürün
kararıdır. [TASK-002](../../tasks/active/TASK-002-storage-quota-and-kvkk-release-readiness.md)
kapsamında forward migration, authenticated Edge Function ve istemci akışı repository'de
uygulanmıştır. Bu, production ortamında çalıştığı veya release gate'in geçtiği anlamına gelmez;
local/QA database testleri, deploy, iki kullanıcılı negatif test ve gerçek cihaz kabulü beklemektedir.

## Zorunlu V1 kontrolleri

### Bucket ve erişim

- Yalnız private Supabase bucket kullanılır; `public = false` kalır.
- Public object URL oluşturulmaz, saklanmaz veya UI'da fallback olarak kullanılmaz.
- Object SELECT/INSERT/UPDATE/DELETE erişimi authenticated owner ile sınırlandırılır ve RLS/Storage
  policy server tarafında enforce edilir.
- Mobil istemci yalnız publishable/anon key kullanır. `service_role`, secret key ve DB parolası
  istemci koduna, `.env` public alanına veya bundle'a konamaz.

### Object path

Önerilen mantıksal yapı:

```text
<auth-user-id>/<vehicle-id>/<random-object-id>
```

- İlk segment authenticated owner ile eşleşir; araç sahipliği ayrıca doğrulanır.
- Object ID kriptografik olarak tahmin edilemez UUID/benzeri random değerdir.
- Orijinal dosya adı, e-posta, isim, plaka, VIN, belge no, tarih veya belge türü path'e konmaz.
- Display name gerçekten gerekiyorsa private ve owner-scoped database metadata'sında sanitize edilerek
  tutulur; loglanmaz.

### Signed URL

- Erişim yalnız owner check sonrası kısa ömürlü signed URL ile verilir.
- V1 varsayılan süre **60 saniyedir**; uzatma ayrı risk gerekçesi ve onay ister.
- URL bearer secret kabul edilir; log, analytics, crash report, notification veya support mesajına
  yazılmaz.
- Her açma isteğinde yetki yeniden doğrulanır; kalıcı URL cache'i tutulmaz.

### Dosya kabulü

- V1 hedef allow-list: `application/pdf`, `image/jpeg`, `image/png`. `.jpg` ve `.jpeg` dosya
  uzantıları aynı `image/jpeg` MIME türüne eşlenir. WebP dahil diğer türler kabul edilmez.
- Allow-list dışı türler deny-by-default reddedilir.
- Uzantı veya client `type` alanı tek başına güvenilmez; server/database'a yakın kontrol MIME,
  dosya imzası/magic bytes ve gerekirse güvenli parse ile doğrulanır.
- SVG, HTML, executable, script, office macro ve archive varsayılan olarak kabul edilmez.
- Dosya başına V1 hedef üst sınırı **5 MB**'dır; bucket/server config ve bypass edilemeyen testle
  kanıtlanır.
- Aşırı boyut, yanlış tür, bozuk dosya ve upload yarıda kesilmesi kullanıcıya güvenli Türkçe hata
  döndürür; orphan object bırakmaz.

### Upload öncesi görsel sıkıştırma

- JPG/JPEG ve PNG için upload öncesi sıkıştırma değerlendirilir; PDF bu kararın otomatik görsel
  sıkıştırma kapsamına girmez.
- Değerlendirme cihaz belleği/performansı, belge metninin okunabilirliği, JPEG kalite seviyesi, PNG
  şeffaflığı, EXIF/konum metadata'sının temizlenmesi ve yeniden kodlanan içeriğin doğrulanmasını
  kapsar.
- Sıkıştırma uygulanırsa kota ve 5 MB sınırı server'ın aldığı nihai byte değeri üzerinden hesaplanır.
- Sıkıştırma bir UX/maliyet optimizasyonudur; MIME/magic-byte, boyut, quota, owner ve RLS
  kontrollerinin yerine geçmez. 5 MB altına indirilemeyen dosya güvenli Türkçe mesajla reddedilir.
- **TASK-002 teknik kararı:** Kamera/galeri seçiminde mevcut Image Picker JPEG kalite ayarı `0.85`
  korunur. PDF ve PNG için kör/otomatik yeniden kodlama belge okunabilirliği, şeffaflık ve yeni
  dependency riski nedeniyle bu aşamada eklenmez. EXIF temizleme ve tutarlı sıkıştırma ayrıca cihaz
  testli bir görevde ele alınmalıdır. Server her durumda kendisine ulaşan nihai byte'ı doğrular.

### Kullanıcı kotası

- 2026-08-01 geçici V1 hedefi kullanıcı başına en fazla **10 belge** ve toplam **25 MB**'dır. İki
  sınır birlikte uygulanır; herhangi birinin aşılması upload'ı reddeder. Source of truth
  [monetization ve kota belgesidir](../product/monetization-and-quotas.md).
- Kota UI kontrolüyle sınırlı kalamaz. Yarış koşulunda paralel upload'ları da kapsayan
  server/database-side enforcement gerekir.
- Sayaç object içeriği, dosya adı veya PII içermeden kullanıcı owner scope'undaki object sayısı ve
  server'ın kabul ettiği byte toplamı üzerinden tutulur.
- Başarısız upload, delete ve orphan reconciliation kota hesabını tutarlı hale getirmelidir.

## Production enablement kararı

Belge yükleme production V1'de aşağıdaki iki yoldan biri seçilmeden yayınlanamaz:

1. Teknik kontroller, negatif testler ve [KVKK readiness blocker'ları](kvkk-readiness.md)
   tamamlanırsa upload etkinleştirilir.
2. Bunlardan biri tamamlanmazsa upload V1 release artifact'ında geçici olarak devre dışı bırakılır.
   Disabled state'in mevcut belge erişimi/silmesi, Türkçe kullanıcı mesajı ve store/privacy beyanı
   ürün sahibi tarafından ayrıca kabul edilir.

Private bucket, owner isolation veya deletion kontrolünü gevşetmek üçüncü bir seçenek değildir.

### Silme cascade'i ve retention

- Belge silme hem database metadata'sını hem Storage object'i kapsar; kısmi başarısızlık retry ve
  reconciliation kuyruğuna görünür biçimde girer.
- Araç silme ilişkili belge satırlarını ve object'leri; hesap silme kullanıcıya ait tüm satır,
  object, session ve türetilmiş verileri kapsar.
- Silme sonrası eski signed URL ve doğrudan object erişimi reddedilmelidir.
- Aktif veride ürün amacının ötesinde süresiz retention yoktur. Hesap açıkken kullanıcı belgeyi
  silene kadar saklama yaklaşımı privacy notice'ta açıklanmalı ve insan tarafından onaylanmalıdır.
- Backup/log retention süreleri provider ayarlarıyla envantere alınır. Backup'ta anlık silme mümkün
  değilse erişim kısıtı, azami süre ve restore sonrası yeniden silme prosedürü belgelenir.

### Logging ve gözlemlenebilirlik

- Dosya içeriği, original/display filename, object path, signed URL, user email, plaka/VIN ve belge
  metadata'sı loglanmaz.
- İzinli operasyon metrikleri random request ID, sonuç kodu, normalize hata kategorisi, byte bandı
  ve latency gibi içeriksiz alanlarla sınırlıdır.
- Raw Supabase/provider hatası kullanıcıya doğrudan gösterilmez; secret/PII redaction uygulanır.

### Yönetici erişimi

- Production project admin sayısı minimumda tutulur; paylaşılan hesap kullanılmaz.
- Proje yöneticileri için MFA kuvvetle önerilir ve release öncesi etkinlik kanıtı istenir.
- Destek amacıyla belge içeriğine rutin admin erişimi yoktur. İstisna erişim gerekçeli, zaman sınırlı,
  kullanıcı bağlamı ve audit kaydıyla yapılır.
- Service-role kullanılan server operasyonları dar kapsamlı, secret manager'da ve düzenli rotasyon/
  access review altındadır.

## Audit prosedürü

Release öncesinde ve en az üç ayda bir yetkili kişi:

1. Bucket'ın private olduğunu ve public URL/list/read'in reddedildiğini kontrol eder.
2. Storage policy'leri beklenen migration ile karşılaştırır; owner ve vehicle spoof negatif testini
   çalıştırır.
3. Random/PII-free object path örneklemi inceler.
4. PDF/JPEG/PNG allow-list'i, magic-byte, 5 MB/dosya, 10 belge ve 25 MB/kullanıcı sınırlarının alt/
   üst değerlerini ve paralel upload yarışını test eder.
5. Signed URL'nin 60 saniye sonra ve object/account delete sonrasında çalışmadığını doğrular.
6. Orphan row/object reconciliation raporunu inceler.
7. Client bundle/source ve CI secret taramasında service-role olmadığını doğrular.
8. Uygulama/provider log örnekleminde PII, filename, path, signed URL ve token arar.
9. Admin listesini, MFA durumunu ve ayrıcalıklı erişim kayıtlarını gözden geçirir.
10. Sonuçları tarih, ortam, komut ve kanıt bağlantısıyla release gate'e kaydeder.

Başarısız kontrol release gate'i `Failed` yapar; yalnız UI'nın doğru görünmesi güvenlik kabulü
değildir.
