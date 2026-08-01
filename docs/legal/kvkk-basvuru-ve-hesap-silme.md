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


# Aracım Cepte KVKK Başvuru, Hesap ve Veri Silme Metni

## 1. Başvuru kanalları

Aracım Cepte hesabınız ve kişisel verilerinizle ilgili taleplerinizi aşağıdaki kanallardan iletebilirsiniz:

- Uygulama içi hesap silme: `Ayarlar → Hesabım → Hesabımı ve Verilerimi Sil`
- Web: `https://aracimcepte.hilalaltunay.com/hesap-silme`
- KVKK başvuru sayfası: `https://aracimcepte.hilalaltunay.com/veri-basvurusu`
- E-posta: `altunayhilal14@gmail.com`
- Önerilen e-posta konusu: **Aracım Cepte KVKK Başvurusu**

Web sayfası, Google Play’deki hesap silme bağlantısı olarak kullanılabilir. Sayfa herkese açık, giriş gerektirmeyen ve mobil uyumlu olmalıdır.

## 2. Başvuruda bulunması gereken bilgiler

Başvurunun güvenli ve doğru sonuçlandırılabilmesi için aşağıdaki bilgiler istenebilir:

- Ad ve soyad
- Aracım Cepte hesabında kullanılan e-posta adresi
- Talebin açık açıklaması
- Talebe ilişkin tarih veya kayıt kategorisi
- Cevabın gönderilmesini istediğiniz yöntem
- Başvuruyu yapan kişinin hesap sahibi olduğunu doğrulamaya yarayan ölçülü bilgiler

Kimlik belgesinin tam kopyası varsayılan olarak istenmez. Ek doğrulama gerekirse yalnız zorunlu alanların göründüğü, diğer alanları kapatılmış bir belge veya hesap üzerinden doğrulama gibi daha az müdahaleci yöntem tercih edilir.

Başvuruda parola, doğrulama kodu, access token, banka bilgisi veya yüklediğiniz araç belgesinin tamamını e-postayla göndermeyiniz.

## 3. Talep edebileceğiniz işlemler

KVKK’nın 11’inci maddesi kapsamında:

- Verinizin işlenip işlenmediğini öğrenme
- İşlenen veriler hakkında bilgi alma
- İşleme amacı ve amaca uygun kullanımı öğrenme
- Verinin aktarıldığı alıcıları öğrenme
- Eksik veya yanlış veriyi düzeltme
- Şartları oluştuğunda veriyi silme veya yok etme
- Düzeltme/silme işlemlerinin alıcılara bildirilmesini isteme
- Münhasıran otomatik analiz sonucu aleyhinize bir sonuca itiraz etme
- Kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme

haklarınızı kullanabilirsiniz.

## 4. Hesap silme kapsamı

Hesap silme işlemi tamamlandığında aktif sistemlerden aşağıdaki veriler silinmek üzere işleme alınır:

- Supabase Auth hesabı ve aktif oturumlar
- Kullanıcı profili
- Araç kayıtları
- Kilometre, yakıt, servis, bakım ve diğer gider kayıtları
- Hatırlatıcılar, notlar ve kondisyon kayıtları
- Ekspertiz ve belge metadata’sı
- Kullanıcıya ait private Storage dosyaları
- Uygulamanın ürettiği ve kullanıcıyla ilişkilendirilebilir türetilmiş kayıtlar

Hesap silme geri alınamaz. Silme tamamlandıktan sonra aynı e-posta ile yeni hesap açılması eski verileri geri getirmez.

## 5. Ayrı kayıt veya belge silme

Hesabınızı silmeden tek tek:

- araç,
- gider/bakım kaydı,
- hatırlatıcı,
- not,
- ekspertiz kaydı,
- belge

silebilirsiniz.

Belge silindiğinde yalnız ekrandaki kayıt değil, ilişkili Storage nesnesi de silinmelidir. Silinen belgenin eski signed URL’si erişim sağlamamalıdır.

## 6. Saklanabilecek sınırlı kayıtlar

Hesap silme sonrasında aşağıdaki veriler yalnızca zorunlu ve ölçülü ölçüde tutulabilir:

- Silme işleminin gerçekleştirildiğini gösteren, belge içeriği taşımayan işlem kaydı
- KVKK başvurusuna verilen cevabın ispatı
- Bir hakkın tesisi, kullanılması veya korunması için zorunlu kayıt
- Kanunen saklanması açıkça gereken kayıtlar

Silme/yok etme işlemlerine ilişkin kayıtlar, diğer hukuki yükümlülükler saklı kalmak üzere en az üç yıl saklanabilir.

Sağlayıcı yedeklerinde anlık fiziksel silme mümkün değilse veri erişime kapatılır, yeniden işlenmez ve belgelenmiş yedek döngüsü sonunda silinir/üzerine yazılır.

## 7. İşlem ve cevap süresi

Başvurular:

- niteliğine göre en kısa sürede,
- en geç 30 gün içinde,
- kural olarak ücretsiz

sonuçlandırılır.

Talep kabul edilirse gerekli işlem yapılır ve başvuru sahibine elektronik ortamda bilgi verilir. Talep reddedilirse ret gerekçesi açıklanır.

Uygulama içindeki doğrudan hesap silme işlemi başarılıysa aktif sistemlerdeki silme, 30 günlük sürenin sonuna bırakılmadan derhâl başlatılır.

## 8. Güvenlik nedeniyle reddedilebilecek veya ek doğrulama gerektirebilecek talepler

- Başka bir kullanıcıya ait veriyi talep eden başvurular
- Hesap sahipliği doğrulanamayan talepler
- Başkasının adına yetkisiz yapılan talepler
- Sisteme zarar vermeyi veya güvenlik kontrollerini aşmayı amaçlayan talepler
- Yerine getirilmesi başka kişilerin haklarını ihlal edecek talepler

Bu durumlarda ek ve ölçülü doğrulama istenebilir veya talep gerekçeli olarak reddedilebilir.

## 9. Kurula şikâyet hakkı

Başvurunun reddedilmesi, cevabın yetersiz bulunması veya süresinde cevap verilmemesi hâlinde, KVKK’daki süreler içinde Kişisel Verileri Koruma Kuruluna şikâyet hakkınız bulunmaktadır. Genel olarak şikâyet; veri sorumlusunun cevabının öğrenilmesinden itibaren 30 gün ve her hâlde başvuru tarihinden itibaren 60 gün içinde yapılabilir.

## 10. Web sayfası için kısa hesap silme açıklaması

Aşağıdaki metin, Google Play dış hesap silme sayfasının üst bölümünde kullanılabilir:

> Aracım Cepte hesabınızı uygulama içinden **Ayarlar → Hesabım → Hesabımı ve Verilerimi Sil** yoluyla silebilirsiniz. Uygulamaya erişemiyorsanız, hesap e-posta adresinizden `altunayhilal14@gmail.com` adresine “Aracım Cepte Hesap Silme” konulu bir e-posta gönderin. Talebinizi doğruladıktan sonra hesabınız ve ilişkili uygulama verileriniz silinir. Silme işleminin ispatı veya kanunen saklanması gereken sınırlı kayıtlar, açıklanan süre boyunca tutulabilir.
