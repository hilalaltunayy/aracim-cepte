# Gizlilik ve güvenlik tehdit modeli

## Kapsam ve varlıklar

V1 için korunan varlıklar kullanıcı hesabı/session'ı, profil ve araç verisi, kilometre/gider geçmişi,
hatırlatıcılar, belge metadata'sı, yüklenen özel dosyalar, silme hakları ve yönetici credential'larıdır.
Güven sınırları mobil istemci, Supabase Auth, Postgres/RLS, Storage, signed URL alıcısı, proje
yöneticileri, log/monitoring ve backup/alt işleyenler arasındadır.

Bu belge uygulama odaklı risk kaydıdır; penetration test veya hukuki değerlendirme değildir.

## Temel güvenlik varsayımları

- Mobil istemci ve cihaz ele geçirilebilir; client validation ve gizlenmiş değerler güven sınırı
  değildir.
- Publishable/anon key halka açık kabul edilir; authorization RLS/policy ile sağlanır.
- Signed URL'yi bilen kişi süre boyunca dosyaya erişebilir.
- Production admin hesapları ve dashboard en yüksek ayrıcalıklı yüzeylerdir.
- Kullanıcının yüklediği her dosya kötü amaçlı veya yanlış etiketli kabul edilir.

## Tehditler ve V1 kontrolleri

| Tehdit                           | Olası etki                                                                  | Zorunlu kontrol                                                                                                                  | Doğrulama kanıtı                                                                |
| -------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Cross-user veri sızıntısı        | Başka kişinin araç/kayıt/belgesi görünür veya değişir.                      | Her tablo/object için owner scope, deny-by-default, child ownership kontrolü.                                                    | İki kullanıcıyla read/insert/update/delete ve ownership spoof negatif testleri. |
| Broken RLS                       | Client sorgusu tüm satırlara veya yetkisiz mutation'a ulaşır.               | Tüm public uygulama tablolarında RLS; `authenticated` policy; `USING` + `WITH CHECK`; migration review.                          | `supabase/tests/rls_negative.sql`, schema/policy envanteri ve remote eşleşme.   |
| Public bucket exposure           | Belge auth olmadan indirilebilir/listelenebilir.                            | Private bucket; public URL yok; anon list/read reddi.                                                                            | Unsigned/public URL ve anon list/read negatif testleri.                         |
| Tahmin edilebilir object path    | ID/plaka/dosya adı üzerinden object keşfi veya PII sızıntısı.               | Random object ID, owner-scoped path, PII-free object name; policy yine zorunlu.                                                  | Path format unit/integration testi ve object envanteri audit'i.                 |
| Signed URL sızıntısı             | Süre dolana kadar bearer erişim.                                            | URL'yi log/analytics/clipboard history'ye yazmama; TLS; yalnız kullanıcı aksiyonunda üretme.                                     | Log taraması, link paylaşım senaryosu review'u, expiry testi.                   |
| Uzun ömürlü signed URL           | Kaybedilmiş linkle uzun süre erişim.                                        | V1 varsayılanı 60 saniye; gerekçesiz artırmama; yeniden auth/owner check ile yenileme.                                           | Üretim konfigürasyonu ve süre dolumu testi.                                     |
| Admin/dashboard erişimi          | Toplu veri ve secret ifşası/değişikliği.                                    | En az admin, ayrı hesap, MFA, kişisel hesap paylaşmama, access review/audit.                                                     | Üç aylık erişim listesi ve olay/audit kaydı.                                    |
| Loglarda PII                     | Kalıcı, geniş erişimli ikincil veri kopyası.                                | Allow-list log alanları; raw error/payload/path/URL/token yok; redaction.                                                        | Source scan + test log incelemesi + production örneklemi.                       |
| Dosya adı sızıntısı              | İsim, plaka, belge türü object/log/CDN metadata'sında görünür.              | Client filename'i Storage path'e koymama; random ID; display name gerekirse private DB metadata.                                 | Upload sonrası object adları ve loglar üzerinde audit.                          |
| Zararlı dosya yükleme            | Parser/viewer istismarı, phishing veya diğer kullanıcıya zarar.             | Allow-list MIME + magic-byte doğrulama, uzantıya güvenmeme, download disposition, aktif içerik reddi; gelecekte malware scan.    | Sahte MIME, çift uzantı, bozuk dosya ve aktif içerik negatif testleri.          |
| Aşırı büyük dosya                | Maliyet/DoS, cihaz belleği ve upload çökmesi.                               | Bucket/server file-size limit, kullanıcı kotası, timeout/cancel; client kontrolü yalnız UX.                                      | Limit altı/üstü ve paralel upload testleri.                                     |
| Desteklenmeyen tür               | Güvensiz viewer veya bilinmeyen veri işleme.                                | V1 allow-list: JPEG, PNG, PDF; WebP dahil diğer türleri deny by default reddet.                                                  | Tür/uzantı/magic-byte kombinasyon testleri.                                     |
| Hesap ele geçirme                | Tüm kişisel dosya ve silme yetkisine erişim.                                | E-posta doğrulama, güvenli reset/deep link, leaked-password protection, session revoke, rate limit; provider/admin MFA.          | Auth E2E, eski/bozuk reset linki ve session invalidation kontrolleri.           |
| Kayıp cihaz                      | Açık session üzerinden veri erişimi.                                        | OS secure session storage imkânları, logout/revoke, hassas cache minimizasyonu, app switcher/screenshot kararı.                  | Kilitli/kayıp cihaz senaryosu ve logout sonrası cache kontrolü.                 |
| Silinen hesapta kalan dosya      | Kullanıcı talebine aykırı retention ve maliyet.                             | Hesap silme orkestrasyonu: DB + Storage + türetilmiş veri + erişim revoke; retry/reconcile/audit.                                | Fixture hesap silme, object count ve eski URL erişim negatif testi.             |
| Backup/retention riski           | Silinen veya eski verinin backup'ta gereksiz tutulması.                     | Belgeli süre, sınırlı erişim, restore sonrası deletion replay/reconciliation, provider ayarı review'u.                           | Retention envanteri, restore prosedürü ve periyodik audit.                      |
| Gelecek OCR                      | Kimlik/finans/üçüncü kişi verisinin fazladan çıkarılması ve yanlış sonuç.   | V1 dışı; opt-in, minimizasyon, local/server/provider kararı, confidence + kullanıcı onayı, raw output retention sınırı.          | Ayrı DPIA/threat model, redacted test seti ve yanlış okuma testleri.            |
| Gelecek AI sağlayıcısına aktarım | Alt işleyen, cross-border transfer, training/retention ve prompt sızıntısı. | V1 dışı; provider sözleşmesi, bölge/retention/training ayarı, notice/consent veya hukuki dayanak review'u, içerik minimizasyonu. | Ayrı ADR, hukuk incelemesi, data-flow ve provider konfigürasyon kanıtı.         |

## Abuse ve hata senaryoları

- Kullanıcı `owner_id`, `vehicle_id` veya object prefix'i değiştirerek istek gönderir: server/RLS
  reddetmeli; UI mesajı başka kaydın varlığını doğrulamamalıdır.
- Upload database kaydından sonra başarısız olur veya tersi: orphan object/row reconciliation ve
  idempotent cleanup gerekir.
- Aynı silme isteği tekrar gelir: işlem idempotent olmalı, kullanıcıya yanlış başarı/başarısızlık
  göstermemelidir.
- Signed URL delete'den önce üretilir: object silindikten sonra URL çalışmamalıdır; CDN/cache
  davranışı test edilmelidir.
- Offline/kayıp ağ: uygulama uzakta saklanmayan veriyi kalıcı kaydedilmiş gibi göstermemelidir.

## TASK-025B on-device OCR sınırı

TASK-025B, Android'de `expo-mlkit-ocr` üzerinden Google ML Kit Text Recognition'ı yalnız kullanıcı
aksiyonuyla ve yerel attachment URI'si üzerinde çağırır. Bu adapter belge byte'larını veya tanınan
metni Supabase'e, analytics'e, loglara ya da üçüncü taraf bir OCR/AI sağlayıcısına göndermez. Raw OCR
metni yalnız provider çağrısı ve mevcut parser boyunca geçicidir; persistence yoktur. Öneriler
düzenlenebilir ve seçilidir; açık `Forma aktar` yalnız unsaved form state'ini değiştirir, normal belge
`Kaydet` eylemi ise tek persistence kapısı olarak kalır. PDF başlangıçta desteklenmez. Gerçek Android
binary/device kabulü gereklidir; gelecekte cloud provider, raw output retention veya farklı bir veri
akışı için ayrı privacy/security ve hukuk incelemesi gerekir.

TASK-026 yakıt fişi OCR'ı aynı sınıra tabidir: fiş yalnız kullanıcının başlattığı yerel tarama
girdisidir; raw text, istasyon/tutar/litre/tarih önerileri ve deterministic hesaplanan değerler
Supabase'e, loglara veya analytics'e yazılmaz. Kullanıcı forma aktarıp ayrıca yakıt kaydını kaydetse
bile, fiş attachment'ı bu görevde kalıcı olarak saklanmaz.

## Security/privacy regression kontrolü

Her ilgili görevde completion report şu sorulara cevap verir:

1. Yeni/veri alanı veya üçüncü taraf aktarımı var mı?
2. Cross-user ve anon negatif test sonucu nedir?
3. Bucket, path, signed URL süresi veya file allow-list değişti mi?
4. Log, analytics, hata mesajı veya ekran görüntüsünde PII/secret var mı?
5. Silme, retention, quota ve backup etkisi nedir?
6. Auth/session/reset veya admin yüzeyi değişti mi?
7. Manuel olarak kim, hangi ortamda neyi doğrulamalı?

## Açık V1 odakları

Release öncesi [release kapıları](../release/v1-release-gates.md) güncel kanıtla kapanmalıdır.
Özellikle gerçek authenticated upload/signed URL/delete, hesap silme cascade'i, dosya içerik
doğrulaması, kota enforcement ve admin MFA/audit sonuçları insan tarafından doğrulanmalıdır.
