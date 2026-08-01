# KVKK readiness

## Belgenin statüsü

Bu belge AracımCepte'nin KVKK açısından hazırlık konularını görünür kılar; hukuki görüş değildir ve
"KVKK uyumlu" sonucu vermez. **Supabase kullanmak tek başına hukuki uyumluluk sağlamaz.** Veri
işleme amaçlarını, araçlarını, saklama sürelerini, kullanıcı iletişimini ve sağlayıcı seçimlerini
belirleyen ürün sahibi sorumluluğunu sürdürür.

Halka açık yayından önce Türkiye'de kişisel verilerin korunması alanında yetkin profesyonel hukuk
incelemesi gerekir. Bu belgede "readiness" terimi kullanılır; nihai uygunluk iddiası yapılmaz.

## Uygulamadaki taslak metinler

Repository'de tek kaynaktan yönetilen [hukuk içeriği dizini](../legal/README.md),
[KVKK aydınlatma taslağı](../legal/kvkk-aydinlatma-metni.md),
[gizlilik politikası taslağı](../legal/gizlilik-politikasi.md),
[saklama ve silme politikası](../legal/saklama-ve-silme-politikasi.md),
[başvuru/hesap silme metni](../legal/kvkk-basvuru-ve-hesap-silme.md) ve
[ayrı açık rıza değerlendirme sınırları](../legal/explicit-consent-boundaries.md) bulunur. Uygulama içi
metinler de açıkça **HUKUK İNCELEMESİ BEKLİYOR** olarak işaretlidir. Bunlar yayınlanmış/onaylı hukuki
metin değildir; kayıt ekranındaki aydınlatma bağlantısı açık rıza beyanı veya zorunlu onay kutusu
olarak kullanılmaz.

## Mevcut sağlayıcı ve lokasyon varsayımları

- Ürün sahibi Supabase projesinin Frankfurt bölgesinde olduğunu belirtmiştir. Supabase resmi bölge
  belgesi Central EU (Frankfurt) seçeneğini listeler; ancak bu repository remote projenin gerçekten
  hangi region'da olduğunu kanıtlamaz. Production projesi Supabase Dashboard üzerinden doğrulanmalı
  ve redakte edilmiş kanıt release kaydına eklenmelidir.
- Frankfurt, Türkiye dışındaki bir veri lokasyonudur. Proje region'ı, backup, telemetry, support,
  e-posta ve alt işleyen akışları birlikte haritalanmadan yalnız “EU region” seçilmiş olması KVKK
  readiness veya uygun aktarım mekanizması sonucu vermez.
- Resend'in production e-posta sağlayıcısı olduğu ürün sahibi tarafından doğrulanmalı; repository
  içinde bunu tek başına kanıtlayan bir konfigürasyon yoktur. Kullanılıyorsa e-posta adresi, mesaj
  içeriği/metadata'sı, loglar, retention, transfer lokasyonları ve alt işleyenler değerlendirilmelidir.

Güncel inceleme başlangıç kaynakları: [Supabase regions](https://supabase.com/docs/guides/platform/regions),
[Supabase DPA](https://supabase.com/downloads/docs/Supabase%2BDPA%2B260601.pdf),
[Resend DPA](https://resend.com/legal/dpa),
[Resend subprocessors](https://resend.com/legal/subprocessors) ve
[Resend region/data residency açıklaması](https://resend.com/docs/dashboard/domains/regions).
Sağlayıcı belgeleri değişebileceği için hukuk incelemesi güncel sürüm ve gerçek hesap ayarlarıyla
yapılmalıdır.

## Açık release blocker'ları

Aşağıdakilerin hiçbiri bu belgeyle tamamlanmış sayılmaz. Her madde kapanmadan belge yükleme
production'a açılamaz; [TASK-002](../../tasks/active/TASK-002-storage-quota-and-kvkk-release-readiness.md)
ve [release kapıları](../release/v1-release-gates.md) kanıt kaynağıdır.

- [ ] **Supabase Frankfurt / yurt dışına veri aktarımı:** Gerçek region ve tüm veri akışı doğrulandı;
      Türkiye dışına aktarımın kapsamı ve uygulanabilir hukuki mekanizma profesyonel hukukçu
      tarafından değerlendirildi.
- [ ] **Supabase ve Resend alt işleyenleri:** Her iki sağlayıcının rolü, güncel DPA/privacy belgeleri,
      alt işleyen listesi, işleme ülkeleri, amaçları, güvenlik kontrolleri, retention/deletion ve
      değişiklik bildirim mekanizması incelendi. Resend'in fiili kullanım durumu doğrulandı.
- [ ] **KVKK aydınlatma metni:** Veri sorumlusu, amaç, veri kategorisi, toplama yöntemi, hukuki sebep,
      alıcı/aktarım, saklama/silme, ilgili kişi hakları ve başvuru kanalı hukuk incelemesiyle
      hazırlandı; doğru toplama anında sunuluyor.
- [ ] **Gizlilik politikası:** Uygulamanın gerçek veri akışı ve mağaza beyanlarıyla eşleşen, sürümlü,
      yayınlanmış ve app/Play listing'den erişilebilir politika hukuk incelemesinden geçti.
- [ ] **Saklama ve silme politikası:** Her veri kategorisi, aktif saklama süresi, silme tetikleyicisi,
      backup/log/provider istisnası ve restore sonrası deletion davranışı onaylandı.
- [ ] **Hesap ve kullanıcı verisi silme:** Auth user, DB satırları, Storage object'leri, session,
      cache/queue, e-posta/provider etkisi ve uygun backup davranışı E2E kanıtlandı.
- [ ] **Veri ihlali prosedürü:** Olay sahibi, triage, containment, key/session revoke, log koruma,
      etki analizi, sağlayıcı koordinasyonu, kullanıcı/otorite bildirim değerlendirmesi ve table-top
      testi hazır. Yasal süre ve yükümlülükleri hukukçu belirledi.
- [ ] **Profesyonel hukuk incelemesi:** Public release öncesi yukarıdaki kararlar yetkin hukukçu
      tarafından incelendi; açık riskler ve ürün sahibinin kararı sürümlü kayda bağlandı.

## Belge yükleme production kararı

Yalnız iki release yolu vardır:

1. Yukarıdaki hukuki blocker'lar ile [Storage teknik kontrolleri](storage-policy.md) tamamlanır ve
   kanıtlanırsa belge yükleme etkinleştirilir.
2. Bunlardan biri tamamlanmazsa V1'de belge yükleme geçici olarak devre dışı bırakılır. Disabled
   state, kullanıcıya doğru Türkçe bilgi vermeli ve mevcut belgelerin erişim/silme davranışı ürün
   sahibi tarafından açıkça karara bağlanmalıdır.

Belge yüklemeyi açık bırakıp yalnız disclaimer göstermek veya “Supabase kullanıyoruz” demek üçüncü
bir seçenek değildir.

## Release öncesi readiness alanları

### Privacy notice

- Kullanıcıya veri sorumlusu/ilgili roller, iletişim kanalı, işlenen veri kategorileri, amaçlar,
  hukuki dayanak değerlendirmesi, alıcı/alt işleyenler, saklama-silme, haklar ve başvuru yöntemi
  hakkında açık ve erişilebilir privacy notice sağlanmalıdır.
- Notice kayıt öncesinde/ilgili toplama anında erişilebilir, Türkçe, sürümlü ve yayın URL'si kalıcı
  olmalıdır.
- Store Data Safety beyanları ürünün gerçek veri akışıyla notice ve uygulama davranışına uymalıdır.

### Amaçla sınırlılık

- Araç kaydı, gider, hatırlatıcı ve özel belge verisi yalnız açık ürün amaçları için işlenir.
- Yeni analytics, reklam, OCR, AI, paylaşım veya model eğitimi amacı mevcut amaçtan türetilmez;
  ayrı değerlendirme, notice ve gereken kullanıcı/hukuki mekanizma ister.

### Veri minimizasyonu

- V1 akışı için zorunlu olmayan ad, telefon, T.C. kimlik no, adres, konum veya üçüncü kişi alanı
  yapılandırılmış veri olarak çıkarılmaz.
- Dosya içeriğinde bu verilerin bulunabileceği kabul edilir; filename/log/analytics'e çoğaltılmaz.
- Test ve destek süreçleri sentetik/redakte edilmiş veri kullanır.

### Retention ve silme

- Her veri kategorisi için amaçla uyumlu aktif saklama süresi ve hesap/belge silme davranışı
  belirlenmelidir.
- Kullanıcı uygulama içinden hesabını ve verisini silebilmelidir; DB, Storage, session, türetilmiş
  kayıt, queue/cache ve uygun ölçüde backup etkisi kapsanmalıdır.
- Kanun veya uyuşmazlık nedeniyle ayrı retention gerektiği varsayılmaz; kategori ve süre hukuk
  incelemesiyle belirlenir ve kullanıcıya açıklanır.
- Silme istekleri izlenebilir, idempotent, hata halinde tekrar denenebilir ve completion sonucu
  kullanıcıya bildirilebilir olmalıdır.

### İlgili kişi talebi yönetimi

- Erişim/bilgi, düzeltme, silme/yok etme, itiraz ve diğer ilgili kişi talepleri için doğrulanmış
  iletişim kanalı, kimlik doğrulama, kayıt, yanıt süresi ve escalation sahibi belirlenmelidir.
- Talep yanıtında başka kullanıcı verisi açıklanmamalı; export güvenli ve süreli teslim edilmelidir.
- Destek personeli için runbook ve talep kayıtlarında minimizasyon gerekir.

### Güvenlik kontrolleri

- RLS ve cross-user negatif testleri, private bucket, kısa signed URL, PII-free random path, file
  validation/kota, secret yönetimi, admin MFA/access review ve güvenli loglama uygulanmalıdır.
- Hesap ele geçirme, kayıp cihaz, silme cascade'i ve incident senaryoları test edilmelidir.
- Kontroller [tehdit modeli](privacy-threat-model.md), [Storage politikası](storage-policy.md) ve
  [release kapıları](../release/v1-release-gates.md) üzerinden kanıtlanır.

### Processor/subprocessor değerlendirmesi

- Supabase ve kullandığı barındırma/altyapı alt işleyenleri; Resend kullanılıyorsa Resend ve onun alt
  işleyenleri; EAS/Expo, crash/analytics, destek ve gelecekteki OCR/AI sağlayıcıları güncel veri
  akışında envantere alınmalıdır.
- Sözleşme, veri işleme koşulları, güvenlik taahhütleri, incident bildirimi, silme/retention,
  alt işleyen değişiklikleri ve veri lokasyonu incelenmelidir.
- Uygulamada bulunmayan bir sağlayıcı sırf roadmap'te diye notice'ta aktif alıcı gibi yazılmamalıdır.

### Sınır ötesi işleme

- Ürün sahibinin belirttiği Supabase Frankfurt region'ı Dashboard kanıtıyla doğrulanmalı; backup/
  telemetry/support erişimi, Resend kullanılıyorsa e-posta akışı ve build servisleri dahil gerçek
  veri akışı haritalanmalıdır.
- Kişisel verinin Türkiye dışına aktarılıp aktarılmadığı, uygulanabilir aktarım mekanizması ve bildirim/
  onay gereksinimleri profesyonel hukuk incelemesi gerektirir.
- Gelecek OCR/AI sağlayıcısı için ülke, training, retention ve subprocessor davranışı ayrıca incelenir.

### Olay müdahalesi

- Güvenlik olayı tanımı, on-call/karar sahibi, erişim revoke/key rotation, log preservation,
  kapsam/etkilenen kişi analizi, sağlayıcı koordinasyonu ve güvenli iletişim runbook'u bulunmalıdır.
- Yasal bildirim yükümlülüğü ve süreleri profesyonel hukuk danışmanıyla belirlenmelidir; ajan tahmin
  edemez.
- En az table-top hesap ele geçirme, public bucket ve service-role sızıntısı senaryosu yapılmalıdır.

## Readiness checklist

- [ ] Veri akış envanteri ve sınıflandırma ürün sahibi tarafından doğrulandı.
- [ ] Supabase Frankfurt region'ı ve yurt dışına aktarım değerlendirmesi kanıtlandı.
- [ ] Supabase ve Resend kullanım/alt işleyen/DPA değerlendirmesi güncel.
- [ ] KVKK aydınlatma metni profesyonel hukuk incelemesinden geçti ve doğru toplama anlarında sunuldu.
- [ ] Gizlilik politikası profesyonel hukuk incelemesinden geçti ve yayınlandı.
- [ ] Data Safety cevapları gerçek uygulama davranışıyla eşleştirildi.
- [ ] Saklama/silme matrisi ile hesap ve tüm kullanıcı verisi silme E2E kanıtı var.
- [ ] İlgili kişi talep kanalı ve runbook'u hazır.
- [ ] Processor/subprocessor listesi ve sözleşme incelemesi güncel.
- [ ] Sınır ötesi işleme soruları hukuk incelemesiyle karara bağlandı.
- [ ] Security release kapıları kanıtla kapandı.
- [ ] Veri ihlali prosedürü, sorumluları ve table-top sonucu kaydedildi.
- [ ] Store yayını öncesi profesyonel hukuk onayı/alınan risk kararı kaydedildi.

Bu maddeler tamamlanmadan readiness açık kalır; tamamlanmaları dahi tek başına hukuki uyumluluk
garantisi değildir.
