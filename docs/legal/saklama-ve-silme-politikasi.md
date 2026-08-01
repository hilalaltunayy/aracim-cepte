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


# Aracım Cepte Kişisel Veri Saklama ve Silme Politikası

## 1. Amaç

Bu politika, Aracım Cepte kapsamında işlenen kişisel verilerin hangi ortamlarda tutulduğunu, hangi süre veya ölçüte göre saklandığını, silme/yok etme işlemlerini ve sorumlulukları tanımlar.

Bu politika hazırlanmış olsa dahi teknik uygulamanın doğru çalıştığı anlamına gelmez. Production deploy, test ve düzenli denetim kanıtı gerekir.

## 2. Kapsam

Politika aşağıdaki ortamları kapsar:

- Supabase Auth
- Supabase PostgreSQL Database
- Supabase Storage
- Supabase Edge Functions ile yürütülen işlem kayıtları
- Resend üzerinden oluşan işlemsel e-posta kayıtları
- Uygulama cihazındaki geçici oturum/cache verileri
- Gerekli olduğu ölçüde güvenlik ve silme işlem kayıtları
- Sağlayıcı yedekleri ve felaket kurtarma kopyaları

## 3. Temel ilkeler

- Veriler yalnız belirli ve meşru amaçlarla saklanır.
- Amaç için gerekli olmayan veri toplanmaz.
- Belge içeriği, orijinal dosya adı, signed URL ve authentication secret loglanmaz.
- Saklama sebebi ortadan kalktığında veriler resen veya kullanıcı talebi üzerine silinir, yok edilir ya da uygun hâlde anonimleştirilir.
- Silme işlemleri erişilemezlik ve tekrar kullanılamazlık sağlayacak şekilde yürütülür.
- Silme/yok etme işlemlerine ilişkin kayıtlar en az üç yıl saklanır.
- Kullanıcı verisi test, demo veya destek için production’dan kopyalanmaz; sentetik veya redakte edilmiş veri kullanılır.

## 4. Roller

- **Veri sorumlusu ve karar sahibi:** Hilal Yeşim Altunay
- **Teknik uygulama sorumlusu:** Hilal Yeşim Altunay
- **Başvuru ve silme kanalı:** `altunayhilal14@gmail.com`
- **Sağlayıcılar:** Supabase ve Resend, sözleşme ve talimatlar ölçüsünde veri işleyen/hizmet sağlayıcı olarak değerlendirilir.

Production erişimi kişisel hesaplarla ve MFA ile korunmalı; paylaşılan yönetici hesabı kullanılmamalıdır.

## 5. Saklama ve silme matrisi

| Veri kategorisi | Saklama ölçütü / hedef süre | Silme tetikleyicisi | Silme yöntemi |
|---|---|---|---|
| Hesap e-postası ve Auth kullanıcı kaydı | Hesap aktif olduğu sürece | Hesap silme işlemi veya geçerli talep | Auth kullanıcısının ve aktif oturumların iptali/silinmesi |
| Araç, kilometre, gider, bakım ve hatırlatıcı kayıtları | Kullanıcı kaydı silene veya hesabını kapatana kadar | Kayıt, araç veya hesap silme | Owner-scoped DB satırlarının silinmesi |
| Araç belgeleri ve görseller | Kullanıcı belgeyi silene, aracı silene veya hesabını kapatana kadar | Belge/araç/hesap silme | Storage nesnesi ve metadata kaydının silinmesi |
| Geçici signed URL | En fazla 60 saniye hedefi | Süre dolumu veya nesne silme | URL’nin geçersizleşmesi; kalıcı cache tutulmaması |
| Mobil oturum ve geçici cache | Oturum süresi / uygulamanın teknik ihtiyacı | Çıkış, token expiry veya hesap silme | Güvenli yerel temizleme ve token revoke |
| İşlemsel e-posta kayıtları | Sağlayıcının doğrulanmış retention ayarı kadar | Hesap silme, sözleşme sonu veya sağlayıcı döngüsü | Sağlayıcı prosedürleri; veri minimizasyonu |
| Güvenlik ve hata kayıtları | **Yayın öncesi kesinleştirilecek**, operasyonel hedef azami 90 gün | Süre dolumu veya olay kapanışı | Otomatik silme/rotasyon; PII redaction |
| KVKK ve hesap silme başvuru kayıtları | Başvurunun sonuçlanmasından sonra en az 3 yıl | Süre dolumu | Güvenli silme/yok etme |
| Silme/yok etme işlem kayıtları | En az 3 yıl | Süre dolumu | Güvenli silme/yok etme |
| Sağlayıcı yedekleri | Sağlayıcının doğrulanmış backup döngüsü | Aktif sistemden silme + backup döngüsü | Erişime kapatma, yeniden kullanımın önlenmesi ve döngü sonunda üzerine yazma/silme |

> **YAYIN ÖNCESİ TAMAMLANACAK:** Supabase backup retention, log retention, Resend e-posta/log retention ve Expo/EAS tarafından production kullanıcı verisi işlenip işlenmediği gerçek hesap ayarlarıyla doğrulanmalı ve tabloya kesin süreler eklenmelidir.

## 6. Kullanıcı tarafından başlatılan silme

### Tek kayıt veya belge silme

- Kullanıcı uygulama içinden ilgili kaydı siler.
- Belge için Storage nesnesi önce güvenli biçimde kaldırılır; ardından metadata silinir.
- Kısmi hata oluşursa kullanıcıya başarılı mesaj gösterilmez; işlem retry/reconciliation kaydına alınır.
- Eski signed URL’nin nesne silindikten sonra erişim sağlamadığı test edilir.

### Araç silme

Araç silme işlemi, araca bağlı kayıt ve belgelerin etkisini açıkça gösteren bir onay ekranından sonra yürütülür. İlişkili dosyaların orphan kalmaması gerekir.

### Hesap silme

- Kullanıcı uygulama içinden hesabını ve verilerini silme işlemini başlatabilir.
- Kullanıcının Storage prefix’i, uygulama tabloları, profil ve Auth hesabı silinir.
- Oturumlar geçersizleştirilir.
- İşlem geri alınamaz.
- Başarısız alt adımlar izlenebilir ve güvenli biçimde yeniden denenebilir.
- Tamamlanma sonucu kullanıcıya bildirilir.

## 7. İlgili kişi talebi üzerine silme

E-posta veya web sayfası üzerinden gelen talepler:

1. Kayıt altına alınır.
2. Talep sahibinin kimliği ölçülü yöntemlerle doğrulanır.
3. İşleme şartlarının devam edip etmediği kontrol edilir.
4. Talep en kısa sürede ve en geç 30 gün içinde sonuçlandırılır.
5. Sonuç elektronik ortamda bildirilir.
6. Yapılan silme/yok etme işlemi kayda alınır.

Veri sorumlusunun hatasından kaynaklanmayan ve ek maliyet doğuran işlemlerde mevzuattaki tarifeler uygulanabilir; normal elektronik talepler için ücret alınmaz.

## 8. Resen ve periyodik silme

VERBİS’e kayıt yükümlülüğü bulunup bulunmadığından bağımsız olarak, işleme amacı sona eren veriler silinmelidir.

Aracım Cepte için iç kontrol hedefi:

- Üç ayda bir veri envanteri, başarısız silme, orphan Storage nesnesi ve gereksiz log denetimi
- İşleme sebebi sona eren verilerin en geç izleyen periyodik kontrolde silinmesi
- Periyodik imha aralığının hiçbir durumda altı ayı aşmaması

## 9. Yedekler ve sağlayıcılar

Aktif sistemden silinen bir veri, teknik olarak sağlayıcı yedeğinde geçici süre bulunabilir. Bu durumda:

- Yedeğe günlük operasyon erişimi kapalı olmalıdır.
- Veri yeni bir işleme amacıyla kullanılamaz.
- Yedekten geri dönüş yapılırsa daha önce silinen verileri yeniden silen prosedür çalıştırılmalıdır.
- Sağlayıcıların azami yedek ve log süreleri yıllık olarak gözden geçirilmelidir.

## 10. Güvenli silme ve kanıt

- DB satırı, Storage nesnesi, cache ve session birlikte değerlendirilir.
- Silinen nesneye public URL veya eski signed URL ile erişim denenir ve reddedilmelidir.
- İki farklı kullanıcıyla cross-user erişim testi yapılır.
- Silme kayıtlarında belge içeriği, dosya adı, e-posta, plaka veya token tutulmaz.
- Kanıt; tarih, işlem türü, anonim request ID, sonuç kodu ve hata kategorisiyle sınırlıdır.

## 11. Politika gözden geçirme

Politika;

- yeni sağlayıcı,
- OCR/AI özelliği,
- ödeme/analytics SDK’sı,
- yeni veri kategorisi,
- güvenlik olayı,
- mevzuat veya sağlayıcı retention değişikliği

olduğunda ve en az yılda bir gözden geçirilir.
