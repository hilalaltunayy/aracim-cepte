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


# Aracım Cepte KVKK Aydınlatma Metni

## 1. Veri sorumlusu

6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) kapsamında kişisel verileriniz, veri sorumlusu **Hilal Yeşim Altunay** tarafından Aracım Cepte uygulamasının sunulması amacıyla işlenmektedir.

Sorularınız ve KVKK kapsamındaki başvurularınız için:

- E-posta: `altunayhilal14@gmail.com`
- Başvuru sayfası: `https://aracimcepte.hilalaltunay.com/veri-basvurusu`

## 2. İşlenen kişisel veri kategorileri

Uygulamanın kullandığınız özelliklerine göre aşağıdaki veriler işlenebilir:

### Hesap ve iletişim verileri

- E-posta adresi
- Supabase tarafından oluşturulan kullanıcı ve oturum tanımlayıcıları
- E-posta doğrulama ve parola sıfırlama işlemlerine ilişkin teknik kayıtlar

### Araç ve kullanım verileri

- Araç markası, modeli, yılı, yakıt türü ve benzeri araç bilgileri
- Plaka ve kullanıcı tarafından girilirse diğer araç tanımlayıcıları
- Kilometre bilgileri ve kilometre geçmişi
- Yakıt, bakım, servis ve diğer gider kayıtları
- Hatırlatıcılar, tarihler, notlar ve araç kondisyon bilgileri

### Yüklenen belge ve dosyalar

- Ruhsat, sigorta, kasko, ekspertiz, muayene, servis faturası ve kullanıcı tarafından seçilen diğer araç belgeleri
- Belge kategorisi, yükleme zamanı, dosya boyutu ve belgeyle ilişkili araç kaydı
- Belge içeriğinde bulunabilecek ad-soyad, adres, telefon, plaka, araç şasi numarası, poliçe bilgileri, finansal bilgiler veya kimlik numarası gibi veriler

Aracım Cepte, V1 kapsamında belge içeriğinden otomatik OCR/AI çıkarımı yapmaz ve belgede görünen kimlik numarasını ayrı bir veri alanına dönüştürmez.

### Güvenlik ve işlem verileri

- Kimlik doğrulama ve oturum kayıtları
- İşlem sonucu, hata kategorisi, istek zamanı ve güvenlik denetimi için gerekli sınırlı teknik kayıtlar
- Hesap/veri silme ve KVKK başvurularına ilişkin işlem kayıtları

Dosya içeriği, dosyanın orijinal adı, signed URL, parola, oturum anahtarı veya servis anahtarı uygulama loglarına yazılmamalıdır.

## 3. Kişisel verilerin işlenme amaçları

Kişisel verileriniz aşağıdaki belirli amaçlarla işlenir:

- Hesap oluşturmak, e-posta doğrulamak, giriş ve parola sıfırlama işlemlerini yürütmek
- Araç, gider, bakım, kilometre ve hatırlatıcı kayıtlarını saklamak ve kullanıcıya göstermek
- Kullanıcının yüklediği araç belgelerini yalnızca kendi hesabı altında saklamak, görüntülemek ve sildirmek
- Temel dashboard istatistiklerini hesaplamak
- Yetkisiz erişimi, kötüye kullanımı ve güvenlik olaylarını önlemek
- Hesap ve veri silme işlemlerini gerçekleştirmek
- İlgili kişi başvurularını cevaplamak ve işlemlerin ispatını sağlamak
- Uygulamanın teknik olarak çalışmasını, hata yönetimini ve veri bütünlüğünü sağlamak

V1 kapsamında veriler reklam, kullanıcı profilleme, üçüncü taraf pazarlama, model eğitimi veya otomatik karar verme amacıyla işlenmez.

## 4. Toplama yöntemi ve hukuki sebepler

Kişisel veriler;

- kayıt, giriş ve parola sıfırlama ekranları,
- araç, gider, kilometre, hatırlatıcı ve belge formları,
- kullanıcının kamera, galeri veya dosya seçiciden yaptığı seçimler,
- kimlik doğrulama, güvenlik ve silme işlemleri sırasında oluşan teknik kayıtlar

aracılığıyla tamamen veya kısmen otomatik yöntemlerle elde edilir.

İşleme faaliyetleri, somut faaliyete göre KVKK’nın 5’inci maddesindeki aşağıdaki şartlara dayanır:

- **Bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması nedeniyle gerekli olma:** Hesap ve kullanıcı tarafından talep edilen uygulama özelliklerinin sunulması.
- **Veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi için zorunlu olma:** Mevzuattan doğan başvuru, güvenlik ve kayıt yükümlülükleri bulunduğu ölçüde.
- **Bir hakkın tesisi, kullanılması veya korunması için zorunlu olma:** Uyuşmazlık, kullanıcı başvurusu ve silme işlemlerinin ispatı için gerekli sınırlı kayıtlar.
- **İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla veri sorumlusunun meşru menfaati:** Hizmet güvenliği, kötüye kullanımın önlenmesi ve minimum teknik denetim kayıtları.

Uygulama sizden sağlık, biyometrik, siyasi görüş, din, ceza mahkûmiyeti gibi özel nitelikli kişisel verileri istemez. Araçla ilgisi olmayan veya gereksiz özel nitelikli veri içeren dosyaları yüklememeniz; mümkünse gereksiz alanları yüklemeden önce kapatmanız önerilir.

## 5. Verilerin aktarılması ve hizmet sağlayıcılar

Hizmetin sunulması için kişisel veriler, talimatlarımız doğrultusunda hizmet veren aşağıdaki veri işleyenlere aktarılabilir:

- **Supabase:** Kimlik doğrulama, PostgreSQL veritabanı, private dosya depolama ve server-side işlevler. Mevcut proje için planlanan/ifade edilen ana bölge Frankfurt, Almanya’dır.
- **Resend:** E-posta doğrulama ve parola sıfırlama gibi işlemsel e-postaların gönderimi. İrlanda gönderim bölgesi seçilse dahi Resend’in resmî açıklamasına göre hesap verileri, e-posta metadata’sı, loglar ve API kayıtları ABD’de tutulabilir.
- Yetkili kamu kurumları: Yalnızca hukuken zorunlu bir talep bulunması hâlinde ve talebin kapsamıyla sınırlı olarak.

Kişisel veriler satılmaz ve reklam verenlerle paylaşılmaz.

> **YAYIN ÖNCESİ ZORUNLU KARAR:** Supabase ve Resend üzerinden gerçekleşen düzenli yurt dışı veri aktarımı için KVKK’nın 9’uncu maddesine uygun aktarım mekanizması belirlenmeli, gerekli sözleşme/bildirim işlemleri tamamlanmalı ve bu bölüm gerçek mekanizmayla güncellenmelidir. Bu taslak tek başına yurt dışı aktarımını hukuka uygun hâle getirmez.

## 6. Saklama ve silme

- Hesap, araç, gider, hatırlatıcı ve belge verileri; kullanıcı hesabı aktif olduğu ve ilgili kayıt kullanıcı tarafından silinmediği sürece saklanır.
- Kullanıcı bir belgeyi sildiğinde ilişkili veritabanı kaydı ve Storage nesnesi de silinmek üzere işleme alınır.
- Kullanıcı hesabını sildiğinde hesap, kullanıcıya ait uygulama kayıtları ve Storage dosyaları aktif sistemlerden silinmek üzere işleme alınır.
- Silme işlemlerine ilişkin ispat kayıtları, diğer hukuki yükümlülükler saklı kalmak üzere, en az üç yıl saklanabilir.
- Sağlayıcı yedeklerinde anlık fiziksel silme mümkün değilse veri, erişime kapalı tutulur ve sağlayıcının belgelenmiş yedek döngüsü sonunda üzerine yazılır/silinir.

Ayrıntılar `https://aracimcepte.hilalaltunay.com/saklama-silme` adresindeki Saklama ve Silme Politikası’nda açıklanır.

## 7. KVKK kapsamındaki haklarınız

KVKK’nın 11’inci maddesi kapsamında;

- kişisel verinizin işlenip işlenmediğini öğrenme,
- işlenmişse bilgi talep etme,
- işleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme,
- yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,
- eksik veya yanlış işlenmişse düzeltilmesini isteme,
- şartları oluştuğunda silinmesini veya yok edilmesini isteme,
- düzeltme ve silme işlemlerinin aktarım yapılan üçüncü kişilere bildirilmesini isteme,
- münhasıran otomatik sistemlerle analiz sonucu aleyhinize bir sonuç doğmasına itiraz etme,
- kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde giderim talep etme

haklarına sahipsiniz.

Başvurularınızı `altunayhilal14@gmail.com` adresine “Aracım Cepte KVKK Başvurusu” konusu ile veya başvuru sayfası üzerinden iletebilirsiniz. Başvurular, niteliğine göre en kısa sürede ve en geç 30 gün içinde sonuçlandırılır.

## 8. Aydınlatma ve açık rıza ayrımı

Bu metin, kişisel verileriniz hakkında sizi bilgilendirmek için sunulur. “Aydınlatma metnini okudum” işlemi, genel veya belirsiz bir açık rıza beyanı değildir. Gelecekte açık rıza gerektiren bağımsız bir özellik eklenirse, rıza ayrı, belirli, bilgilendirmeye dayalı ve geri alınabilir bir süreçte istenir.

## 9. Değişiklikler

Metindeki değişiklikler sürüm ve tarih bilgisiyle yayımlanır. İşleme amacı veya veri alıcısı bakımından önemli bir değişiklik olursa kullanıcılar uygun yöntemle bilgilendirilir.

## Resmî dayanaklar

- 6698 sayılı KVKK’nın 4, 5, 7, 9, 10, 11, 12 ve 13’üncü maddeleri
- Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ
- Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ
- Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hâle Getirilmesi Hakkında Yönetmelik
