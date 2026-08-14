# AracımCepte Agent Operating System

Bu dosya repository'nin tamamı için birincil ajan talimatıdır. Daha alt dizinde daha özel bir
`AGENTS.md` bulunmadıkça bütün görevlerde bu kurallar geçerlidir. Kullanıcının açık talimatı bu
belgeyle çatışırsa çatışma görünür biçimde raporlanmalı; güvenlik, gizlilik veya geri döndürülemez
bir işlem söz konusuysa varsayım yapılmamalıdır.

## Projenin amacı

AracımCepte, Türkiye'deki araç sahiplerinin araç, yakıt, bakım, diğer gider, hatırlatıcı ve araç
belgelerini tek bir mobil uygulamada güvenli biçimde yönetmesini amaçlayan Türkçe bir üründür.
İlk yayın tek araçlı, ücretsiz ve güvenilir bir temel deneyime odaklanır.

## Mevcut ürün durumu

- Expo Router tabanlı Android öncelikli bir mobil uygulama ve bağlı Supabase-backed repository
  katmanı mevcuttur.
- E-posta/şifre kimlik doğrulama, araç ve kayıt CRUD'u, hatırlatıcılar, dashboard hesapları ve özel
  belge depolama için uygulama kodu bulunmaktadır.
- Güncel uygulama sürümü `1.0.0`'dır. Google Play Closed Testing'de kullanılan production Android
  AAB `versionCode: 2` ile başarıyla üretilmiştir; Closed Testing devam etmektedir.
- Build 2, production e-posta doğrulama ve parola sıfırlama deep-link düzeltmelerini içerir.
  Production callback'leri `aracimcepte://auth/confirm-email` ve
  `aracimcepte://auth/reset-password`; Supabase production Site URL değeri
  `https://aracimcepte.hilalaltunay.com` adresidir.
- Public hukuk sitesi yayındadır. Bu, hukukçu incelemesini, KVKK/yurt dışı aktarım kararlarını veya
  Google Play production kabulünü tek başına tamamlamaz.
- Kapalı test kaynak snapshot'ı `release/1.0.0-closed-test-b2` branch'i ve
  `v1.0.0-closed-test-b2` annotated tag'i ile korunur. `develop`, V1.1 ve sonrası için entegrasyon
  branch'idir.
- Yerel/otomatik test ve geçmiş QA kanıtları vardır; bunlar production kabulünün veya güncel gerçek
  cihaz testinin yerine geçmez.
- Güncel kanıt ve bilinen sınırlamalar için [proje durumu](docs/project-status.md),
  [release-readiness raporu](docs/release-readiness.md) ve
  [V1 release kapıları](docs/release/v1-release-gates.md) birlikte okunmalıdır.

## Güncel release hedefi

Güncel aşama Google Play Closed Testing'dir. Hedef, [V1 kapsamındaki](docs/product/v1-scope.md)
kritik akışları build 2 üzerinde gerçek Android cihazlarda doğrulayıp açık hukuk/operasyon
kapılarını kapatarak kontrollü production Android yayınına ilerlemektir. AAB üretimi veya Closed
Testing'in başlaması tam production ya da hukuki hazırlık iddiası değildir. V1.1 ve sonrası sıra
[development roadmap](docs/product/development-roadmap.md) tarafından yönetilir.

## Mimari özeti ve teknoloji yığını

- `src/app`: Expo Router rotaları ve ekran kompozisyonu.
- `src/domain`: platformdan bağımsız entity'ler ve repository sözleşmeleri.
- `src/data`: Supabase istemcisi, mapper'lar, repository ve Storage erişimi.
- `src/features`: özellik odaklı iş mantığı.
- `src/shared`: ortak UI, tema, etiketler, doğrulama ve saf hesaplamalar.
- `src/store`: Zustand ile oturum dışı uygulama durumu ve aktif araç seçimi.
- `supabase`: şema, RLS/Storage politikaları, migration'lar ve SQL güvenlik testleri.

Ana yığın Expo SDK 57, React Native 0.86, React 19, TypeScript, Expo Router, Supabase Auth/Postgres/
Storage/RLS, Zustand, AsyncStorage ve Vitest'tir. Herhangi bir Expo kodu yazmadan veya Expo
yapılandırmasını değiştirmeden önce tam sürümlü [Expo SDK 57 belgelerini](https://docs.expo.dev/versions/v57.0.0/)
okuyun; farklı veya `latest` sürüm belgelerini kaynak kabul etmeyin.

## Bilgi kaynakları

Çelişki yoksa aşağıdaki sıra kullanılır:

1. Kullanıcının mevcut görevdeki açık talimatları.
2. Bu `AGENTS.md` ve varsa hedef dosyanın üst dizimlerindeki daha özel `AGENTS.md` dosyaları.
3. `tasks/active/` altındaki onaylı görev dosyası ve [PLANS.md](PLANS.md) uyarınca aktif plan.
4. [V1 kapsamı](docs/product/v1-scope.md) ve [release kapıları](docs/release/v1-release-gates.md).
5. [Mimari](docs/architecture.md), [veritabanı](docs/database.md),
   [hesaplama spesifikasyonu](docs/calculation-specification.md) ve diğer konu belgeleri.
6. Kaynak kod, migration ve testlerin gözlemlenen davranışı.

Doküman ile uygulama çelişirse bunu gizlemeyin. Görev kapsamı izin veriyorsa ikisini uyumlu hale
getirin; izin vermiyorsa farkı completion report'ta insan kararı olarak kaydedin.

## Git workflow ve release güvenliği

- `main`: stabil/released çizgidir; doğrudan feature geliştirmesi yapılmaz.
- `develop`: sıradaki release için entegrasyon branch'idir.
- `feature/*`: `develop` üzerinden açılan tek ve izole ürün özelliğidir; PR ile `develop`'a döner.
- `chore/*`: dokümantasyon, tooling ve repository yönetişimi işidir; uygun base branch'e PR açılır.
- `hotfix/*`: güncel released/tested çizgi için kritik düzeltmedir; çözüm daha sonra `develop`'a da
  taşınır.
- `release/*`: immutable veya near-immutable release snapshot'ıdır.
- `v*`: doğrulanmış release commit'lerini işaretleyen version tag desenidir.

Zorunlu Git güvenlik kuralları:

- Feature geliştirmesi hiçbir zaman doğrudan `main` üzerinde yapılmaz.
- `main`, `develop`, `release/*` veya version tag'lerine force-push yapılmaz; yayınlanmış release
  geçmişi yeniden yazılmaz.
- Release tag'leri gelişigüzel silinmez veya başka commit'e taşınmaz.
- Stabil release yalnız açık ve review edilmiş release adımıyla `main`'e ulaşır.
- Her non-trivial görevden önce güncel branch ve worktree doğrulanır. Branch yanlışsa edit öncesi
  durulur.
- Kullanıcı işi ve dirty-worktree dosyaları korunur; ilgisiz değişiklikler stage edilmez.
- Her release artifact'ının geri getirilebilir source commit'i ve tercihen annotated tag'i olur.
- Riskli iş başlamadan rollback yolu bilinmeli ve execution plan'da kaydedilmelidir.

## Zorunlu çalışma akışı

Her non-trivial görevde sırayla:

1. `AGENTS.md` dosyasını okuyun.
2. Referans verilen görev dosyasını okuyun.
3. İlgili kodu ve belgeleri inceleyin.
4. [PLANS.md](PLANS.md) biçiminde bir execution plan yazın veya güncelleyin.
5. Yalnızca onaylanmış kapsamı uygulayın.
6. Göreve uygun zorunlu testleri çalıştırın.
7. Tam diff'i gözden geçirin.
8. Güvenlik ve gizlilik regression kontrolü yapın.
9. Etkilenen dokümantasyonu güncelleyin.
10. Tamamlanan, atlanan, başarısız olan ve insan tarafından yapılması gereken kontrolleri ayrı
    ayrı raporlayın.

Uzun veya riskli işlerde plan uygulama boyunca aktif tutulur. Kapsam değişikliği görev dosyasına ve
plana işlenmeden uygulanamaz. Tamamlanan görev bağımsız inceleme gerekiyorsa önce `tasks/review/`
altında review göreviyle doğrulanır, sonra `tasks/active/` içinden `tasks/completed/` içine taşınır.

## V1.1+ geliştirme mimarisi ilkeleri

Yeni geliştirmeler modüler, yapılandırılabilir, genişletilebilir, geriye uyumlu, rollback-friendly ve
minimum coupling ile tasarlanır. Büyük veya riskli işlevler feature flag arkasında ilerletilir.
External API ve servis entegrasyonları uygun olduğunda provider-independent abstraction kullanır;
örneğin `AiProvider`, `OcrProvider`, `FuelPriceProvider`, `RoutingProvider` ve
`ConnectedVehicleProvider`.

Ürün limitleri ve kataloglar dağınık hard-coded değerler olarak eklenmez. `maxVehicles`, AI/OCR
kotaları, premium entitlement availability, maintenance catalog, vehicle body types, fuel types ve
reminder thresholds gibi değerler tek, izlenebilir ve uygun güvenlik sınırında yapılandırılır.

## Veritabanı ve migration kuralları

- Additive ve forward-compatible migration tercih edilir; feature geliştirmesi V1 verisini yok
  edemez.
- Uygun kayıtlarda olay tarihi (`occurredAt`/event date) ile record creation timestamp ayrı tutulur.
- Replacement alanı eklendiğinde eski alan hemen kaldırılmaz; geçiş süresince geriye uyumluluk ve
  okuma/yazma stratejisi belgelenir.
- Her yeni kullanıcı-verisi tablosunda RLS, sahiplik, silme, retention ve cross-user negatif test
  etkisi değerlendirilir.
- Riskli migration için rollback yerine gerekirse ileri düzeltme/forward recovery dahil açık bir
  kurtarma stratejisi yazılır.

## Güvenlik kuralları

- Bütün kullanıcı verisi erişimlerinde sahiplik ve RLS sınırı korunmalıdır; yalnız pozitif CRUD
  testi yeterli değildir, başka kullanıcı erişimini reddeden negatif test gerekir.
- Mobil istemciye `service_role`, secret key, veritabanı parolası veya yönetici credential'ı
  konamaz. Sırlar commit, log, ekran görüntüsü, fixture veya hata mesajına yazılamaz.
- Belge bucket'ı private kalmalı; public URL kullanılamaz. Owner-scoped, tahmin edilemez yollar ve
  kısa ömürlü signed URL kullanılmalıdır.
- Yeni dosya kabulü MIME türü, boyut, kota ve sahiplik bakımından server/database tarafında
  doğrulanmalıdır. İstemci kontrolü tek başına güvenlik kontrolü değildir.
- SQL/RLS/Storage politikası değişiklikleri ayrı tehdit değerlendirmesi, negatif test ve rollback
  planı gerektirir.
- Ham provider/Supabase hata ayrıntıları kullanıcıya veya telemetriye sızdırılmaz.
- Bağımlılık veya credential açığı sessizce bastırılmaz; risk, etki ve çözüm kararı raporlanır.

Uygulama ayrıntıları için [veri sınıflandırması](docs/security/data-classification.md),
[tehdit modeli](docs/security/privacy-threat-model.md),
[Storage politikası](docs/security/storage-policy.md),
[KVKK readiness](docs/security/kvkk-readiness.md) ve
[ADR-001](docs/decisions/ADR-001-private-document-storage.md) kaynak kabul edilir. Kullanıcıya
sunulan hukuk metinlerinin kanonik kaynakları ve üretim akışı için
[hukuk içeriği dizinini](docs/legal/README.md) izleyin.

## Supabase Security Guardrails

- Expo/React Native/browser koduna veya `EXPO_PUBLIC_*` değişkenlerine Supabase secret/service-role,
  admin tokenı ya da veritabanı credential'ı konmaz; mobil istemci yalnız publishable/anon anahtar ve RLS kullanır.
- Privileged anahtarlar yalnız gerçekten gerekli, güvenilir server/Edge Function ortamında tutulur; tam değerler
  log, test snapshot'ı, doküman, PR veya completion report'a yazılmaz. Sızıntı şüphesinde durun, değeri redakte edin
  ve manuel rotation/revocation gereğini bildirin.
- Yeni user-owned tablo RLS etkin, owner-isolated ve negatif erişim testiyle gelir. RLS, bir özelliği çalıştırmak
  için zayıflatılamaz; istemci `user_id`, plan, entitlement, kota veya sahiplik beyanına güvenilmez.
- `SECURITY DEFINER` fonksiyonları sabit güvenli `search_path` kullanır, `auth.uid()` ve sahiplik doğrulaması yapar,
  yalnız gerekli role dar grant verir; privileged RPC'lere `PUBLIC`/anon execute verilmez.
- Entitlement, kota ve diğer hassas limitler server-authoritative uygulanır; downgrade/kota enforcement kullanıcı
  verisini otomatik silmez. Private Storage owner-scoped kalır ve mobil istemciden privileged Storage erişimi yapılmaz.
- Supabase'e dokunan görevler yeni erişim yolu eklemeden önce mevcut RLS/RPC mimarisini inceler; güvenlik duyarlı
  migration'lar additive olur, RLS/RPC fixture testi ve forward-recovery notu içerir.

## Gizlilik kuralları

- Amaçla sınırlılık ve veri minimizasyonu varsayılan davranıştır; "ileride gerekebilir" gerekçesiyle
  veri toplanamaz.
- PII dosya adına, object path'e, loga, analytics event'ine veya test fixture'ına konamaz.
- Gerçek kullanıcı verisi development, seed, demo, ekran görüntüsü veya AI/OCR denemesinde
  kullanılamaz.
- Silme, retention, yedek ve alt işleyen etkileri tasarımın parçasıdır; yalnız UI satırını silmek
  yeterli değildir.
- OCR, AI sağlayıcısı, paylaşım, telemetri veya sınır ötesi aktarım yeni bir privacy/security
  incelemesi ve açık onay olmadan eklenemez.
- "KVKK uyumlu" iddiası yapılamaz. Hazırlık belgeleri hukuki incelemenin yerine geçmez.

## Test kuralları

Feature geliştirmesinde varsayılan yaklaşım, değişen davranışı güvenilir biçimde kanıtlayan en dar
hedefli testleri önce çalıştırmaktır. Her küçük görevde geniş test paketini otomatik çalıştırmayın.
TypeScript, lint ve test kapsamı değişen dosya, ortak bağımlılık zinciri ve riskle orantılı seçilir.

Release candidate hazırlığı, shared infrastructure, security-critical veya database/RLS değişikliği,
native/platform değişikliği, broad refactor ya da kullanıcının açık talimatı daha geniş regression
gerektirir. Bu durumlarda uygun kombinasyon ayrıca değerlendirilir:

```powershell
npm run typecheck
npm run lint
npm test
```

Değişikliğe göre ayrıca:

```powershell
npm run test:coverage
npx expo-doctor
npx supabase db reset
npx supabase db query --linked --file supabase/tests/rls_negative.sql
npm run qa:remote:probe
npm run qa:remote
```

- Remote, destructive, seed, database reset, build veya deploy komutları ancak görev açıkça izin
  veriyorsa, hedef doğrulandıysa ve gerekli credential/ortam mevcutsa çalıştırılır.
- Android/iOS davranışı web export veya TypeScript ile kanıtlanamaz. Native değişiklikler gerçek
  cihaz/emülatör ve gerekiyorsa release artifact üzerinde manuel kontrol gerektirir.
- Ajanlar yalnız TypeScript ve lint geçti diye başarı iddia edemez. İlgili unit/integration,
  negatif güvenlik, kalıcılık, hata durumu, navigasyon ve manuel cihaz kontrolleri ayrıca ele alınır.
- Çalıştırılmayan her kontrol nedeni ile birlikte "Atlandı" veya "Manuel doğrulama gerekli"
  olarak raporlanır; geçmiş bir sonuç yeni çalıştırılmış gibi sunulamaz.
- Her completion report `Completed`, `Skipped`, `Failed` ve `Manual verification required`
  bölümlerini birbirinden ayırır.

## Dokümantasyon kuralları

- Davranış, veri modeli, güvenlik sınırı, komut veya release durumu değiştiğinde aynı görevde ilgili
  belge güncellenir.
- Kanıt tarihi, ortamı ve komutu belirtilir. Belirsiz veya geleceğe yönelik davranış mevcut özellik
  gibi yazılmaz.
- Bir kural tek bir source-of-truth belgede tanımlanır; diğer belgeler kısa özet ve bağlantı verir.
- Markdown bağlantıları repository-relative olmalı ve taşınan görevlerde yeniden doğrulanmalıdır.
- Release gate yalnız güncel repository kanıtı veya kaydedilmiş manuel kabul sonucu ile `Passed`
  yapılabilir.

## Kapsam kontrolü

- Görev dosyasındaki `Scope`, `Out of scope` ve `Do not change` alanları bağlayıcıdır.
- İlişkili görünse bile refactor, bağımlılık yükseltme, formatlama, adlandırma temizliği veya özellik
  ekleme kapsam dışına taşınamaz.
- Beklenmeyen zorunlu değişiklikte durun; gerekçeyi, seçenekleri ve riski yazıp insan onayı isteyin.
- Kullanıcının mevcut değişikliklerini koruyun. İlgisiz dirty worktree dosyalarını geri almayın,
  silmeyin, stage etmeyin veya yeniden biçimlendirmeyin.
- Geri döndürülemez veya üretim verisini etkileyen işlemler açık hedef ve izin olmadan yapılamaz.

## Açık izin olmadan değiştirilmemesi gerekenler

- `src/` uygulama kaynak kodu ve runtime davranışı.
- `supabase/migrations/`, production şeması, RLS ve Storage politikaları.
- `package.json`, lockfile'lar, dependency sürümleri ve npm scripts.
- `app.json`, `eas.json`, Expo/EAS/Android/iOS yapı ve imzalama ayarları.
- `.env*`, secret'lar, Supabase proje bağlantısı ve uzaktaki proje ayarları.
- Auth akışları, kullanıcı/veri silme davranışı, UI/navigation ve mağaza varlıkları.
- CI/CD, Play Console, deployment, production build ve yayın işlemleri.

Bir görev bu alanlardan birini açıkça kapsıyorsa yalnız belirtilen alt kapsam değiştirilebilir; bu
liste genel bir yasak değil, açık izin kapısıdır.

## Definition of done

Bir görev ancak aşağıdakilerin tümü doğruysa tamamlanmıştır:

- Acceptance criteria maddeleri kanıtla karşılanmış veya açıkça insan kabulüne bırakılmıştır.
- Uygulanan diff yalnız onaylı kapsamdadır ve kullanıcı değişikliklerini korur.
- İlgili otomatik testler geçmiştir; başarısız/atlanmış kontroller ayrı raporlanmıştır.
- Güvenlik ve gizlilik regression kontrolünde yeni açıklanmamış risk yoktur.
- İlgili belgeler ve aktif plan günceldir; bağlantılar geçerlidir.
- Rollback yolu anlaşılırdır.
- Completion report; `Completed`, `Skipped`, `Failed`, `Manual verification required` başlıklarını
  ayrı ayrı içerir.
- İnsan kabul sonucu gerekiyorsa görev tamamlanmış klasörüne taşınmadan kaydedilmiştir.

Yeni görevler [görev şablonundan](tasks/TASK-TEMPLATE.md) üretilir ve
`TASK-001-short-description.md` biçiminde adlandırılır.
