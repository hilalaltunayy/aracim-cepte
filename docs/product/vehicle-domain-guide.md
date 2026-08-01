# Türkiye araç belge ve kayıt alanı rehberi

Bu belge ürün sınıflandırması, güvenli metadata tasarımı, hatırlatıcılar ve gelecekteki OCR
araştırmaları için alan rehberidir. Hukuki doğrulama veya belgenin resmi geçerlilik kontrolü değildir.
OCR aday alanları V1 özelliği değildir; gelecekte dahi kullanıcı onayı olmadan authoritative kabul
edilmemelidir.

Güvenlik seviyeleri [veri sınıflandırmasına](../security/data-classification.md) dayanır:
`Personal`, `Sensitive personal/business document`. Bir belgede kimlik numarası, adres, imza,
finansal bilgi veya üçüncü kişi verisi varsa yüksek olan seviye uygulanır.

## Araç tescil belgesi / ruhsat

- **Amaç:** Aracın tescil ve teknik kimlik bilgisini gösterir.
- **Tipik alanlar:** Plaka, belge/tescil seri no, marka, tip/model, model yılı, VIN/şasi no, motor no,
  yakıt, renk, kullanım amacı, malik adı ve adres bilgileri.
- **Olası hassas kişisel veri:** Ad-soyad, adres, T.C. kimlik/vergi no, imza veya barkod içeriği.
- **Uygulama kategorisi:** `Tescil / Ruhsat`.
- **Süre sonu davranışı:** Genellikle periyodik expiry yerine değişiklik/devir/yenileme olayı izlenir.
- **Hatırlatıcı:** Devir, bilgi değişikliği veya kayıp/yenileme için isteğe bağlı.
- **Gelecek OCR adayları:** Plaka, VIN, marka/model, model yılı, belge seri no; kimlik alanları
  varsayılan olarak çıkarılmamalı veya saklanmamalı.
- **Güvenlik seviyesi:** Sensitive personal/business document.

## Zorunlu trafik sigortası

- **Amaç:** Zorunlu mali sorumluluk sigortası poliçesini kanıtlar.
- **Tipik alanlar:** Poliçe no, sigorta şirketi, plaka/VIN, sigortalı, başlangıç/bitiş, prim ve acente.
- **Olası hassas kişisel veri:** Ad, kimlik/vergi no, adres, telefon/e-posta, finansal tutarlar.
- **Uygulama kategorisi:** `Sigorta / Zorunlu trafik`.
- **Süre sonu davranışı:** Bitiş tarihinde süresi dolar; yenilenen poliçe ayrı kayıt olabilir.
- **Hatırlatıcı:** Bitişten önce ve bitiş gününde güçlü biçimde yararlı.
- **Gelecek OCR adayları:** Poliçe no, şirket, plaka, başlangıç/bitiş, prim.
- **Güvenlik seviyesi:** Sensitive personal/business document.

## Kapsamlı sigorta / kasko

- **Amaç:** İsteğe bağlı araç hasar/teminat poliçesini kaydeder.
- **Tipik alanlar:** Poliçe no, şirket, sigortalı, plaka/VIN, teminatlar, muafiyet, başlangıç/bitiş,
  prim ve acente.
- **Olası hassas kişisel veri:** Kimlik, iletişim, adres, finansal ve risk/hasar bilgileri.
- **Uygulama kategorisi:** `Sigorta / Kasko`.
- **Süre sonu davranışı:** Poliçe bitiş tarihinde süresi dolar.
- **Hatırlatıcı:** Yenileme, ödeme ve opsiyonel taksit tarihleri için yararlı.
- **Gelecek OCR adayları:** Poliçe no, şirket, başlangıç/bitiş, prim, temel teminat adları.
- **Güvenlik seviyesi:** Sensitive personal/business document.

## TÜVTÜRK muayene raporu

- **Amaç:** Periyodik araç muayenesinin sonucunu ve kusurları kaydeder.
- **Tipik alanlar:** Plaka/VIN, istasyon, muayene tarihi, geçerlilik/sonraki muayene, kilometre,
  sonuç, kusurlar ve rapor no.
- **Olası hassas kişisel veri:** Malik/sürücü adı, plaka/VIN, imza veya iletişim bilgisi.
- **Uygulama kategorisi:** `Muayene`.
- **Süre sonu davranışı:** Sonraki muayene tarihine göre due/expired olur.
- **Hatırlatıcı:** Sonraki muayeneden önce çok yararlı.
- **Gelecek OCR adayları:** Muayene tarihi, geçerlilik tarihi, kilometre, sonuç, kusur sınıfları.
- **Güvenlik seviyesi:** Sensitive personal/business document.

## Egzoz gazı emisyon ölçüm belgesi

- **Amaç:** Emisyon ölçümünün sonucunu ve geçerliliğini gösterir.
- **Tipik alanlar:** Plaka/VIN, ölçüm tarihi, geçerlilik tarihi, istasyon, rapor no ve sonuç.
- **Olası hassas kişisel veri:** Araç sahibi/işleten adı, plaka/VIN, tesis bilgisi.
- **Uygulama kategorisi:** `Muayene / Emisyon`.
- **Süre sonu davranışı:** Geçerlilik bitişinde süresi dolar.
- **Hatırlatıcı:** Bitiş öncesi yararlı.
- **Gelecek OCR adayları:** Tarihler, plaka, ölçüm/rapor no, sonuç.
- **Güvenlik seviyesi:** Sensitive personal/business document.

## Ekspertiz raporu

- **Amaç:** Aracın mekanik, elektronik, kaporta/boya ve genel durum değerlendirmesini saklar.
- **Tipik alanlar:** Firma/rapor no, tarih, kilometre, VIN/plaka, test sonuçları, değişen/boyalı
  parçalar, kusurlar ve değerlendirme.
- **Olası hassas kişisel veri:** Müşteri adı/iletişimi, plaka/VIN, imza, üçüncü kişi veya firma bilgisi.
- **Uygulama kategorisi:** `Ekspertiz`.
- **Süre sonu davranışı:** Hukuki expiry yerine tarihsel snapshot; yeni ekspertiz eskiyi geçersiz
  kılmadan güncellik sırasını değiştirir.
- **Hatırlatıcı:** Periyodik kontrol veya satış öncesi isteğe bağlı.
- **Gelecek OCR adayları:** Tarih, kilometre, firma, rapor no, parça durumları ve önemli kusurlar.
- **Güvenlik seviyesi:** Sensitive personal/business document.

## Servis ve bakım faturaları

- **Amaç:** Yapılan işlem, parça, işçilik, maliyet ve kilometre geçmişini kanıtlar.
- **Tipik alanlar:** Fatura/iş emri no, servis, tarih, kilometre, işlem ve parça kalemleri, vergi,
  toplam, garanti notu.
- **Olası hassas kişisel veri:** Müşteri adı, adres, telefon, e-posta, vergi/kimlik no, plaka/VIN.
- **Uygulama kategorisi:** `Servis / Bakım`.
- **Süre sonu davranışı:** Fatura süresiz tarihsel kayıttır; garanti veya sonraki bakım tarihi ayrı
  expiry/due alanıdır.
- **Hatırlatıcı:** Sonraki bakım tarihi/kilometresi ve garanti bitişi için yararlı.
- **Gelecek OCR adayları:** Tarih, kilometre, servis, kalemler, toplam, sonraki bakım.
- **Güvenlik seviyesi:** Sensitive personal/business document.

## Yakıt fişleri ve faturaları

- **Amaç:** Yakıt alımı, miktarı, birim fiyatı ve maliyetini destekler.
- **Tipik alanlar:** İstasyon, tarih/saat, ürün, litre, birim fiyat, toplam, plaka, ödeme türü.
- **Olası hassas kişisel veri:** Plaka, ödeme kartının maskeli bölümü, lokasyon, vergi/kimlik bilgisi.
- **Uygulama kategorisi:** `Yakıt belgesi`.
- **Süre sonu davranışı:** Expiry yok; tarihsel işlem kaydıdır.
- **Hatırlatıcı:** Belge için genellikle gerekmez; periyodik yakıt kaydı isteğe bağlıdır.
- **Gelecek OCR adayları:** Tarih, litre, birim fiyat, toplam, yakıt türü, istasyon.
- **Güvenlik seviyesi:** Sensitive personal/business document.

## Lastik değişim/saklama kayıtları

- **Amaç:** Lastik seti, değişim, rotasyon ve saklama konumunu izler.
- **Tipik alanlar:** Tarih, kilometre, lastik marka/model/ebat, DOT/seri, set tipi, diş derinliği,
  servis, depo/raf kodu ve ücret.
- **Olası hassas kişisel veri:** İsim, telefon, plaka, servis müşteri/depo numarası.
- **Uygulama kategorisi:** `Lastik`.
- **Süre sonu davranışı:** Sabit expiry olmayabilir; mevsim, tarih, kilometre veya kondisyonla due olur.
- **Hatırlatıcı:** Mevsimsel değişim, rotasyon ve saklama yenilemesi için yararlı.
- **Gelecek OCR adayları:** Tarih, kilometre, ebat, DOT, servis ve sonraki değişim önerisi.
- **Güvenlik seviyesi:** Sensitive personal/business document.

## Garanti kayıtları

- **Amaç:** Araç, parça veya servis garantisinin kapsamını ve süresini gösterir.
- **Tipik alanlar:** Sağlayıcı, belge/seri no, ürün/parça, başlangıç/bitiş, kilometre limiti, şartlar.
- **Olası hassas kişisel veri:** Müşteri adı/iletişimi, plaka/VIN, satın alma ve ödeme bilgileri.
- **Uygulama kategorisi:** `Garanti`.
- **Süre sonu davranışı:** Tarih ve/veya kilometre limitine göre sona erer.
- **Hatırlatıcı:** Bitişten önce kontrol/başvuru için yararlı.
- **Gelecek OCR adayları:** Sağlayıcı, kapsam, başlangıç/bitiş, kilometre limiti, belge no.
- **Güvenlik seviyesi:** Sensitive personal/business document.

## Kaza tespit tutanağı

- **Amaç:** Kazanın taraflarını, koşullarını ve ilk tespitini kaydeder.
- **Tipik alanlar:** Tarih/saat/konum, taraf ve araç bilgileri, poliçe, sürücü belgesi, olay anlatımı,
  kroki, kusur görüşü ve imzalar.
- **Olası hassas kişisel veri:** Kimlik, adres, telefon, ehliyet, imza, konum, üçüncü kişilerin tüm
  iletişim/araç/sigorta bilgileri.
- **Uygulama kategorisi:** `Kaza / Tutanak`.
- **Süre sonu davranışı:** Expiry yok; vaka dosyasının parçasıdır ve retention ayrıca belirlenmelidir.
- **Hatırlatıcı:** Sigorta ihbarı, evrak tamamlama ve takip tarihleri için yararlı.
- **Gelecek OCR adayları:** Tarih, plaka, poliçe no, taraf/araç referansları; yüksek riskli kimlik ve
  iletişim alanları varsayılan dışıdır.
- **Güvenlik seviyesi:** Sensitive personal/business document — çok yüksek hassasiyet.

## Hasar ve onarım kayıtları

- **Amaç:** Hasar olayını, onarım kapsamını, maliyetini ve ilgili servis/sigorta sürecini izler.
- **Tipik alanlar:** Olay/onarım tarihi, kilometre, hasarlı parçalar, yapılan işlemler, servis,
  dosya/hasar no, sigorta kararı ve tutarlar.
- **Olası hassas kişisel veri:** Plaka/VIN, kişi/iletişim, poliçe, finansal ve üçüncü taraf verileri.
- **Uygulama kategorisi:** `Hasar / Onarım`.
- **Süre sonu davranışı:** Tarihsel kayıt; onarım garantisi ayrı bitiş taşıyabilir.
- **Hatırlatıcı:** Servis takibi, eksper randevusu ve onarım garantisi için yararlı.
- **Gelecek OCR adayları:** Tarih, kilometre, dosya no, parça/işlem, servis, tutar.
- **Güvenlik seviyesi:** Sensitive personal/business document.

## HGS/yol kayıtları

- **Amaç:** Geçiş, bakiye, ihlal, ücret ve yol kullanımını takip eder.
- **Tipik alanlar:** Etiket/hesap no, plaka, tarih/saat, gişe/rota, ücret, bakiye, ihlal ve son ödeme.
- **Olası hassas kişisel veri:** Plaka, konum/hareket geçmişi, hesap no ve finansal işlem bilgisi.
- **Uygulama kategorisi:** `HGS / Yol`.
- **Süre sonu davranışı:** Geçiş kaydı tarihsel; ihlal/ödeme için due date olabilir.
- **Hatırlatıcı:** Bakiye, ihlal ve son ödeme için yararlı.
- **Gelecek OCR adayları:** Tarih/saat, geçiş noktası, ücret, bakiye ve son ödeme.
- **Güvenlik seviyesi:** Sensitive personal/business document.

## Satış, kiralama, yetki ve vekâlet belgeleri

- **Amaç:** Aracın satışına, kullanımına veya temsil yetkisine ilişkin hukuki ilişkiyi belgelemek.
- **Tipik alanlar:** Taraf kimlikleri, plaka/VIN, yetki kapsamı, başlangıç/bitiş, bedel, noter/kurum,
  belge no ve imzalar.
- **Olası hassas kişisel veri:** T.C. kimlik/vergi no, adres, iletişim, imza, finansal bilgi, üçüncü
  kişi ve noterlik verileri.
- **Uygulama kategorisi:** `Hukuki / Yetki`.
- **Süre sonu davranışı:** Sözleşme/yetki bitişinde expires; satış belgesi tarihsel kalır.
- **Hatırlatıcı:** Kiralama/yetki/vekâlet bitişi ve teslim işlemleri için çok yararlı.
- **Gelecek OCR adayları:** Belge türü/no, taraf referansları, plaka/VIN, tarih ve yetki süresi;
  kimlik/imza alanları otomatik çıkarım için varsayılan dışıdır.
- **Güvenlik seviyesi:** Sensitive personal/business document — çok yüksek hassasiyet.

## Uygulama notları

- Metadata alanları belge türüne göre açıkça gerekmedikçe ortak modele eklenmez.
- Belge görüntüsü ve çıkarılmış OCR metni aynı hassasiyet sınıfına girer.
- Expiry olmayan belgeler "süresiz" değil "bitiş tarihi uygulanamaz" olarak modellenmelidir.
- Hatırlatıcı, belgenin hukuki geçerliliğini doğruladığı izlenimini vermemelidir.
- Üçüncü kişilere ait alanlar görüntüleme, dışa aktarma, log ve AI aktarımında ek minimizasyon ister.

## Gelecek gövde tipi template notu

V1'de aynı desteklenen SVG/body template'ini kullanan **SUV / Crossover** tek seçenek olarak kalır.
Sedan, Hatchback, Station wagon, Coupe, Convertible, SUV/Crossover, Pickup, Van/Minivan ve Light
commercial ayrımı ancak her tip için ayrı, doğrulanmış ve erişilebilir template bulunduğunda ayrı bir
ürün ve mimari göreviyle değerlendirilebilir. Bu liste mevcut kullanıcı özelliği veya universal araç
silüeti desteği taahhüdü değildir; V1'de yeni silüet veya 3D model uygulanmaz.
