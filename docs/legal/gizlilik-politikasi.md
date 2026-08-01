> **Durum:** HUKUK İNCELEMESİ BEKLİYOR — yayın öncesi taslak v0.1
> **Tarih:** 1 Ağustos 2026
> **Uygulama:** Aracım Cepte
> **Veri sorumlusu / geliştirici:** Hilal Yeşim Altunay
> **İletişim:** altunayhilal14@gmail.com
> **Planlanan yayın alanı:** `aracimcepte.hilalaltunay.com`
>
> Bu metin, mevcut repository dokümantasyonu ve 1 Ağustos 2026 tarihinde erişilen resmî kaynaklar temel alınarak hazırlanmıştır. Production yapılandırması, sağlayıcı ayarları ve gerçek uygulama davranışıyla karşılaştırılmadan yayımlanmamalıdır.
>
> **REPOSITORY DOĞRULAMA DURUMU:** İlgili migration ve Edge Function değişikliklerinin production'a deploy edildiği, RLS/Storage negatif testlerinin geçtiği veya gerçek Android cihaz kabulünün tamamlandığı bu metinle doğrulanmış sayılmaz. Bu kontroller release öncesinde ayrıca kanıtlanmalıdır.


# Aracım Cepte Gizlilik Politikası

## 1. Politikanın kapsamı

Bu Gizlilik Politikası, Hilal Yeşim Altunay tarafından sunulan **Aracım Cepte** Android uygulamasında kullanıcı verilerinin nasıl toplandığını, kullanıldığını, saklandığını, korunduğunu, aktarıldığını ve silindiğini açıklar.

Bu politika Google Play’de yayımlanacak uygulama, uygulama içi hukuk sayfaları ve Play Console Data Safety beyanlarıyla tutarlı olmalıdır.

## 2. Toplanan veriler

Kullandığınız özelliklere göre aşağıdaki veriler toplanabilir:

- Hesap e-postası, kullanıcı kimliği ve oturum bilgileri
- Araç bilgileri, plaka, kilometre ve araç notları
- Yakıt, servis, bakım ve diğer gider kayıtları
- Tarih ve kilometre tabanlı hatırlatıcılar
- Kaporta/araç kondisyon bilgileri ve ekspertiz kayıtları
- Yüklediğiniz PDF, JPEG veya PNG araç belgeleri ve bunlara ait sınırlı metadata
- Hesap doğrulama, güvenlik, hata ve silme işlemlerine ait minimum teknik kayıtlar

Uygulama V1 kapsamında:

- reklam profili oluşturmaz,
- kişisel verileri satmaz,
- pazarlama e-postası göndermez,
- belge OCR’ı veya AI belge analizi yapmaz,
- yüklenen belgeleri model eğitimi için kullanmaz,
- canlı araç sensörü, OBD-II veya üretici API verisi toplamaz.

## 3. Belgelerin işlenmesi

Belge yükleme özelliği için V1 sınırları:

- Kullanıcı başına en fazla 10 belge
- Kullanıcı başına toplam en fazla 25 MB
- Dosya başına en fazla 5 MB
- Yalnız PDF, JPEG/JPG ve PNG

Belgeler private Supabase Storage’da tutulacak şekilde tasarlanmıştır. Nesne yolu kullanıcı kimliği, araç kimliği ve rastgele UUID’den oluşur; orijinal dosya adı, e-posta, plaka veya belge numarası dosya yoluna eklenmez.

Belge erişimi, kullanıcı sahipliği doğrulandıktan sonra kısa ömürlü signed URL ile sağlanır. V1 hedef süresi 60 saniyedir. Signed URL bir erişim anahtarı gibi değerlendirilir ve loglanmaz.

> **YAYIN ÖNCESİ DOĞRULAMA:** Bu kontroller repository’de uygulanmış olsa da production migration/Edge Function deploy’u, RLS negatif testleri ve gerçek cihaz kabulü tamamlanmadan politika içinde “doğrulandı” şeklinde sunulmamalıdır.

## 4. Verileri kullanma amaçları

Veriler yalnızca:

- hesabı oluşturmak ve güvenli oturum sağlamak,
- kullanıcının araç kayıtlarını saklamak ve göstermek,
- hatırlatıcıları ve temel istatistikleri üretmek,
- özel araç belgelerini kullanıcı adına saklamak ve eriştirmek,
- parola sıfırlama ve işlemsel e-posta göndermek,
- kötüye kullanımı ve yetkisiz erişimi önlemek,
- veri bütünlüğü, hata yönetimi ve silme işlemlerini yürütmek,
- KVKK kapsamındaki talepleri karşılamak

amacıyla kullanılır.

## 5. Veri paylaşımı ve hizmet sağlayıcılar

Veriler, hizmetin teknik olarak sunulması için aşağıdaki sağlayıcılar tarafından işlenebilir:

### Supabase

- Kimlik doğrulama
- PostgreSQL veritabanı
- Private dosya depolama
- Edge Functions
- Yedekleme ve altyapı hizmetleri

Mevcut proje bölgesinin Frankfurt olduğu production Dashboard üzerinden doğrulanmalıdır.

### Resend

- E-posta doğrulama
- Parola sıfırlama
- Gerekli işlemsel hesap e-postaları

Resend’in bölge seçimi e-postanın gönderildiği bölgeyi etkiler; resmî açıklamasına göre hesap verileri, e-posta metadata’sı, loglar ve API kayıtları ABD’de saklanabilir.

Hizmet sağlayıcı listeleri ve alt işleyenler değişebileceğinden düzenli olarak gözden geçirilir.

Veriler reklam verenlere satılmaz veya kiralanmaz. Yetkili kamu kurumlarına ancak hukuken geçerli ve kapsamı belirli bir talep hâlinde aktarım yapılır.

## 6. Yurt dışı veri işleme

Supabase’in Almanya’daki altyapısı ve Resend’in ABD merkezli sistemleri nedeniyle kişisel veriler Türkiye dışında işlenebilir.

> **YAYIN ÖNCESİ ZORUNLU KARAR:** Düzenli yurt dışı aktarımın KVKK’nın 9’uncu maddesine uygun mekanizması belirlenmeden yalnızca bu politika veya bir “kabul” kutusu aktarım sorununu çözmez. Seçilen mekanizma, gerekli bildirimler ve sağlayıcı rolleri tamamlandıktan sonra bu bölüm nihai hâle getirilmelidir.

## 7. Güvenlik

Uygulama için öngörülen ve production’da doğrulanması gereken başlıca kontroller:

- Supabase tablolarında Row Level Security (RLS)
- Private Storage bucket
- Kullanıcıya/araç sahibine bağlı erişim politikaları
- Tahmin edilemez ve kişisel veri içermeyen dosya yolları
- Kısa ömürlü signed URL
- Dosya boyutu, MIME ve magic-byte doğrulaması
- Kullanıcı başına server-side kota
- Service-role anahtarının mobil istemcide bulunmaması
- Hassas veri, token, dosya adı ve signed URL içermeyen loglama
- Minimum sayıda production yöneticisi ve yönetici MFA’sı
- Hesap, araç ve belge silmede Storage temizliği

İnternet üzerinden veri aktarımının hiçbir yöntemi mutlak güvenlik garantisi vermez. Buna rağmen riskle orantılı teknik ve idari önlemler uygulanır ve düzenli olarak test edilir.

## 8. Saklama ve silme

- Kullanıcı içerikleri, hesap açık olduğu ve kullanıcı ilgili kaydı silmediği sürece saklanır.
- Belge silme, ilişkili veritabanı kaydının ve dosyanın silinmesini kapsar.
- Hesap silme, kullanıcı hesabı, uygulama kayıtları ve kullanıcıya ait Storage dosyalarının aktif sistemlerden silinmesini kapsar.
- Silme işlemlerinin ispat kayıtları en az üç yıl saklanabilir.
- Sağlayıcı yedekleri, sağlayıcının belgelenmiş yedek/retention döngüsü içinde erişime kapalı tutulup silinebilir.

Uygulama içi yol:

`Ayarlar → Hesabım → Hesabımı ve Verilerimi Sil`

Harici hesap silme sayfası:

`https://aracimcepte.hilalaltunay.com/hesap-silme`

Başvuru e-postası:

`altunayhilal14@gmail.com`

Başvurular en kısa sürede ve en geç 30 gün içinde cevaplandırılır. Uygulama içindeki doğrudan silme akışı başarılı olduğunda aktif sistemlerdeki silme işlemi bekletilmeden başlatılır.

## 9. Kullanıcının kontrolü

Kullanıcı:

- hesap ve araç bilgilerini düzenleyebilir,
- belge ve kayıtlarını tek tek silebilir,
- hesabını ve ilişkili verileri silebilir,
- KVKK kapsamındaki haklarını kullanmak için başvurabilir.

Kimlik doğrulamak için başvuru sahibinden yalnız gerekli ve ölçülü bilgiler istenir. E-posta ile gönderilen kimlik belgesi kopyaları varsayılan yöntem değildir.

## 10. Çocukların verileri

Aracım Cepte araç sahibi/kullanıcısı odaklı bir hizmettir ve özellikle çocuklara yönelik tasarlanmamıştır. Uygulamanın çocuklara yönelik hâle gelmesi veya yaş doğrulama gerektiren bir özellik eklenmesi durumunda politika ve uygulama akışı ayrıca güncellenir.

## 11. Politika değişiklikleri

Politika önemli ölçüde değişirse sürüm tarihi güncellenir ve gerekli durumlarda kullanıcılar uygulama içi bildirim veya e-posta yoluyla bilgilendirilir.

## 12. İletişim

- Veri sorumlusu: Hilal Yeşim Altunay
- E-posta: `altunayhilal14@gmail.com`
- Gizlilik sayfası: `https://aracimcepte.hilalaltunay.com/gizlilik-politikasi`
- KVKK başvuru sayfası: `https://aracimcepte.hilalaltunay.com/veri-basvurusu`
