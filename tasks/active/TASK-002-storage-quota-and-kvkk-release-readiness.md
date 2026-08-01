# TASK-002 — Storage kotası ve KVKK release readiness

**Status:** IMPLEMENTED — AWAITING DATABASE, DEVICE AND LEGAL VERIFICATION  
**Owner:** Unassigned  
**Created:** 2026-08-01  
**Updated:** 2026-08-01

## Task ID

TASK-002

## Title

V1 belge yükleme kotasını teknik olarak enforce etmek ve KVKK release blocker'larını kapatmak.

## Goal

Belge yükleme production'a açılmadan önce geçici Free kota kararını server-side güvenlik kontrolleriyle
uygulamak, silme ve kullanıcı izolasyonunu kanıtlamak ve KVKK readiness için gerekli insan/hukukçu
kararlarını release kanıtına bağlamak.

## User problem

Kullanıcı özel araç belgelerini saklarken yetkisiz erişim, kontrolsüz maliyet, aşırı/beklenmeyen dosya
yüklendiği veya silinen hesaba ait dosyanın tutulduğu bir sistemle karşılaşmamalıdır. Ürün sahibi de
belge yüklemeyi hukuki ve teknik hazırlık tamamlanmadan production'a açmamalıdır.

## Implementation öncesi current behavior

2026-08-01 tarihli repository incelemesine göre:

- `vehicle-attachments` bucket'ı migration'da private tanımlıdır ve owner prefix'li Storage
  policy'leri vardır.
- Mevcut migration dosya başına 10 MB ve JPEG, PNG, WebP, PDF kabul eder; yeni geçici ürün kararıyla
  uyumlu değildir.
- Document picker `image/*` kabul eder; yeni allow-list'i istemci tarafında daraltmaz.
- Object path kullanıcı/araç prefix'ine ek olarak timestamp ve sanitize edilmiş orijinal dosya adını
  içerir; PII-free random object ID hedefine uymaz.
- Signed URL 60 saniye için üretilir.
- Belge/ekspertiz/araç silme kodunda Storage object kaldırma girişimleri vardır; atomik olmayan hata,
  orphan ve hesap silme senaryoları production kanıtına sahip değildir.
- Kullanıcı başına hem belge adedini hem toplam byte'ı atomik biçimde enforce eden server/database-side
  kota kanıtı yoktur.
- Supabase proje bölgesinin Frankfurt olduğu ürün sahibi tarafından belirtilmiştir; bu değer remote
  dashboard kanıtıyla doğrulanmamış ve KVKK kapsamında yurt dışına veri aktarımı değerlendirmesi
  tamamlanmamıştır.
- Resend'in production e-posta akışındaki kesin rolü ve Supabase/Resend alt işleyenleri repository
  kanıtıyla tamamlanmış değildir.

Bu maddeler hedef davranışın uygulanmış olduğu anlamına gelmez.

## Repository'de uygulanan durum

2026-08-01 teknik turunda forward migration, `upload-attachment` ve `delete-account` Edge
Function'ları, istemci entegrasyonu, Storage-first silme akışları ve hukuk taslak ekranları eklendi.
Server rezervasyonu 10 belge/25 MB toplam kotayı kullanıcı bazlı transaction lock ile korur; bucket ve
stream limiti 5 MB, allow-list PDF/JPEG/PNG'dir. Object path owner/vehicle/random UUID yapısındadır.

Bu durum remote deploy veya production kabulü değildir. Docker çalışmadığından migration ve SQL
negatif testleri uygulanamamış; QA/Android E2E ve hukuk incelemesi tamamlanmamıştır.

## Desired behavior

Free kullanıcı en fazla 10 belge ve toplam 25 MB saklayabilir; tek dosya en fazla 5 MB olur. Yalnız
PDF, JPG/JPEG ve PNG kabul edilir. Dosya adedi, toplam byte, dosya türü, gerçek içerik ve sahiplik
client bypass edilse dahi güvenilir server/database sınırında doğrulanır. Private bucket, kısa signed
URL, PII-free owner-scoped path, güvenli silme ve cross-user negatif testleri kanıtlanır.

Belge yükleme ancak teknik kontroller ve aşağıdaki KVKK/hukuk release blocker'ları tamamlanırsa
production'da etkinleştirilir. Tamamlanmazsa V1 release artifact'ında belge yükleme geçici olarak
devre dışı bırakılır; çalışmayan veya korunmasız bir upload yolu yayınlanmaz.

## Scope

### Bu dokümantasyon aşaması

- [x] Geçici Free kota kararını kaynak ürün/güvenlik/release belgelerine işlemek.
- [x] Mevcut uygulama ile hedef arasındaki farkları kaydetmek.
- [x] KVKK readiness blocker'larını ve iki production seçeneğini belgelemek.
- [x] Gelecekteki teknik uygulama ve doğrulama acceptance criteria'sını hazırlamak.
- [x] Uygulama başlamadan insan onayı kapısını tanımlamak.

### Onaydan sonraki teknik aşama

- [x] Server/database-side adet ve toplam byte kotası repository'de uygulandı.
- [x] 5 MB dosya sınırı ve PDF/JPEG/PNG magic-byte doğrulaması repository'de uygulandı.
- [x] PII-free random object ID kullanan owner/vehicle-scoped path uygulandı.
- [x] Upload rezervasyonu, owner RLS ve Storage-first silme akışları uygulandı; local/QA concurrency ve
      orphan reconciliation kanıtı bekliyor.
- [x] Görsel sıkıştırmanın güvenlik, okunabilirlik, metadata ve maliyet açısından değerlendirilmesi;
      onaylanan yaklaşımın uygulanması veya uygulanmama gerekçesinin kaydı.
- [ ] İki kullanıcıyla Storage/RLS negatif testleri ve release kanıtı.
- [ ] Belge yükleme için enable/temporary-disable release kararının uygulanması.

## Out of scope

- Bu dokümantasyon turunda uygulama kaynak kodu, migration, Supabase remote ayarı veya runtime
  davranışı değiştirmek.
- Bu turda build, deploy, seed, database reset veya remote mutation çalıştırmak.
- OCR, AI extraction, belge içeriği analizi, public sharing veya end-to-end encryption.
- Nihai ücret, Premium entitlement, Google Play Billing veya RevenueCat.
- Hukuki uyumluluk iddiası veya hukukçu yerine karar vermek.

## Acceptance criteria

### Dokümantasyon aşaması

- [x] Geçici karar bütün hedef belgelerde 10 belge, kullanıcı başına 25 MB, dosya başına 5 MB ve
      yalnız PDF/JPG/JPEG/PNG olarak tutarlı yazılmıştır.
- [x] Kota için hem adet hem toplam byte'ın server-side uygulanması gerektiği açıkça yazılmıştır.
- [x] Upload öncesi görsel sıkıştırma değerlendirmesi ayrı karar olarak kaydedilmiştir.
- [x] Sekiz KVKK/hukuk konusu açık release blocker olarak listelenmiştir.
- [x] Belge yükleme için “kontroller tamamlanırsa etkinleştir / tamamlanmazsa V1'de geçici kapat”
      seçenekleri kaynak belgelerde tanımlanmıştır.
- [x] Hiçbir teknik kontrol uygulanmış veya `Passed` gibi gösterilmemiştir.

### Gelecekteki teknik uygulama

- [ ] **Server-side kota kontrolü:** Aynı authenticated kullanıcı için 11. belge ve toplamı 25 MB'ı
      aşan upload, client/UI kontrolünden bağımsız olarak reddedilir. Paralel upload yarışı sınırı
      aşamaz; başarısız/yarım upload kota kullanımını bozmaz.
- [ ] **MIME ve dosya boyutu doğrulaması:** 5 MB üzeri object reddedilir. Yalnız
      `application/pdf`, `image/jpeg` ve `image/png` kabul edilir; `.jpg` ve `.jpeg` aynı JPEG MIME'a
      eşlenir. Extension ve client beyanına tek başına güvenilmez; magic-byte/içerik doğrulaması,
      spoofed MIME ve bozuk/aktif dosya negatif testleri vardır.
- [ ] **Private bucket:** `vehicle-attachments` public değildir; anon list/read ve unsigned/public URL
      reddedilir. Client bundle'da service-role/secret bulunmaz.
- [ ] **Owner-scoped path:** Path authenticated kullanıcı ve doğrulanmış araç sahibine bağlıdır,
      PII/orijinal dosya adı içermez ve random object ID kullanır. Başka owner/vehicle prefix spoof'u
      server-side reddedilir.
- [ ] **Kısa süreli signed URL:** URL yalnız owner check sonrası üretilir, V1 varsayılanı 60 saniyedir,
      loglanmaz ve expiry sonrası erişim sağlamaz.
- [ ] **Silmede dosyanın kaldırılması:** Belge, araç, kullanıcı verisi veya hesap silindiğinde ilişkili
      Storage object de kaldırılır. Kısmi hata retry/reconciliation ile görünürdür; eski signed URL
      çalışmaz ve orphan object bırakılmadığı kanıtlanır.
- [ ] **Cross-user erişim reddi:** User B; User A'nın object'ini list/read/signed URL/update/delete
      edemez, path/vehicle/metadata spoof ile kota veya RLS'i aşamaz. Pozitif authenticated CRUD testi
      ile birlikte negatif test kanıtı vardır.
- [ ] **Hassas log yok:** İçerik, filename, object path, signed URL, e-posta, plaka/VIN, auth token ve
      ham provider hatası client/server/provider loglarında bulunmaz; izinli metrikler yalnız içeriksiz
      count/byte bandı/sonuç kategorisidir.
- [ ] **Görsel sıkıştırma kararı:** JPG/JPEG/PNG için upload öncesi sıkıştırmanın cihaz belleği,
      kalite/okunabilirlik, EXIF/metadata temizliği, şeffaflık, yeniden kodlama riski ve kota ölçümü
      değerlendirilir. Sıkıştırılmış son byte değeri de 5 MB ve kullanıcı kotasına tabi olur; client
      sıkıştırması server-side kontrolün yerine geçmez.
- [ ] **Production kararı:** Hukuki ve teknik gate'ler kapanırsa upload kontrollü etkinleştirilir;
      kapanmazsa route/CTA güvenli ve testli biçimde V1 release'ta geçici devre dışı bırakılır.

## Security/privacy requirements

- [Veri sınıflandırması](../../docs/security/data-classification.md),
  [tehdit modeli](../../docs/security/privacy-threat-model.md),
  [Storage politikası](../../docs/security/storage-policy.md) ve
  [ADR-001](../../docs/decisions/ADR-001-private-document-storage.md) bağlayıcıdır.
- Supabase Frankfurt bölgesinin gerçek dashboard/proje kanıtı ve veri akış kapsamı doğrulanmalıdır.
- Supabase ve Resend DPA, privacy, retention, veri lokasyonu ve güncel alt işleyen listeleri ürün
  sahibi ve hukukçu tarafından incelenmelidir. Resend'in fiilen kullanılan e-posta sağlayıcısı olduğu
  remote konfigürasyonla doğrulanmalıdır.
- KVKK aydınlatma metni ile genel gizlilik politikası ayrı gereksinimler olarak hazırlanmalı,
  yayınlanmalı ve gerçek uygulama davranışıyla eşleşmelidir.
- Saklama/silme matrisi, hesap ve tüm kullanıcı verisi silme E2E kanıtı ile veri ihlali prosedürü
  bulunmalıdır.
- Public release öncesinde profesyonel hukuk incelemesi gerekir; bu görev uyumluluk sonucu vermez.

## KVKK/hukuk release blocker'ları

- [ ] Supabase Frankfurt nedeniyle Türkiye dışına veri aktarımı ve uygulanabilir mekanizma hukukçu
      tarafından değerlendirildi; gerçek data-flow/dashboard kanıtı kaydedildi.
- [ ] Supabase ve Resend'in rolleri, DPA'ları, güncel alt işleyenleri, veri lokasyonları ve retention
      koşulları incelendi.
- [ ] KVKK aydınlatma metni hukuk incelemesinden geçti, sürümlendi ve doğru toplama anlarında sunuldu.
- [ ] Gizlilik politikası hukuk incelemesinden geçti, yayınlandı ve Play listing/app içinden erişildi.
- [ ] Veri kategorisi bazında saklama ve silme politikası onaylandı ve teknik davranışla eşleştirildi.
- [ ] Hesap ve tüm kullanıcı verisi silme akışı DB, Storage, session, cache/queue ve uygun backup
      etkisiyle E2E doğrulandı.
- [ ] Veri ihlali prosedürü, sorumlular, sağlayıcı koordinasyonu ve hukukçu tarafından doğrulanmış
      bildirim değerlendirme adımlarıyla hazırlandı/table-top test edildi.
- [ ] Public release için profesyonel hukuk incelemesi tamamlandı ve kalan risk kararı kaydedildi.

## Relevant screenshots or evidence

- `AWAITING EVIDENCE` — Supabase Dashboard proje region ekranı (secret/project credential redakte).
- `AWAITING EVIDENCE` — Supabase ve Resend active-service/subprocessor/DPA inceleme kaydı.
- `AWAITING EVIDENCE` — Kota negatif test çıktıları ve Storage object envanteri.
- `AWAITING EVIDENCE` — Aydınlatma metni, gizlilik politikası ve hukuk review sürüm kayıtları.
- `AWAITING EVIDENCE` — Android upload/disabled-state kabul ekran görüntüleri.

## Relevant files

- `docs/product/monetization-and-quotas.md`: Geçici Free kota source of truth.
- `docs/security/storage-policy.md`: Teknik Storage hedef politikası.
- `docs/security/kvkk-readiness.md`: Hukuk/işleme readiness blocker'ları.
- `docs/release/v1-release-gates.md`: Production karar kapıları.
- `docs/product/v1-scope.md`: V1 upload enable/disable kapsam kararı.
- `supabase/migrations/20260801111349_enforce_attachment_quotas_and_private_uploads.sql`: Private
  bucket allow-list'i, server-only kota rezervasyonu ve reserved INSERT RLS'i.
- `supabase/functions/upload-attachment/`: Stream boyut sınırı, magic-byte doğrulama, atomik kota
  rezervasyonu ve authenticated Storage upload'ı.
- `supabase/functions/delete-account/`: Hesap silmeden önce owner prefix'indeki Storage nesnelerini
  recursive ve bounded batch olarak temizleyen authenticated server akışı.
- `src/data/storage/attachments.ts`: PDF/JPEG/PNG picker, 5 MB UX kontrolü, upload function çağrısı ve
  60 saniyelik signed URL.
- `src/app/documents/edit.tsx`, `src/app/expertise/edit.tsx` ve
  `src/data/repositories/SupabaseAppRepository.ts`: Kaydetme hatası ve belge/rapor/araç silmede object
  cleanup davranışı.
- `supabase/tests/rls_negative.sql` ve `supabase/tests/storage_quota.sql`: Çalıştırılmayı bekleyen
  local/QA negatif SQL kanıtları.
- `src/features/legal/`, `src/app/legal/`, `docs/legal/`: Uygulama içi hukuk incelemesi bekleyen
  taslaklar ve ayrı açık rıza değerlendirme sınırları.
- `docs/database.md`, `docs/manual-acceptance-test.md`, `docs/security/privacy-threat-model.md`:
  TASK-002 teknik hedefi, tehditleri ve manuel kabul senaryolarıyla güncellenen ikincil belgeler.

## Commands to run

Teknik uygulama turunda aşağıdaki doğrulamalar hedeflenir:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:coverage
npx supabase db reset
npx supabase db query --local --file supabase/tests/rls_negative.sql
npx supabase db query --local --file supabase/tests/storage_quota.sql
npm run qa:remote:probe
npm run qa:remote
```

Remote komutlar yalnız ayrılmış QA projesi/hesabı, doğrulanmış hedef ve açık izinle çalıştırılır.
Build/deploy bu task için ayrıca onaylanmadıkça çalıştırılmaz.

2026-08-01 sonucu: typecheck, lint, Vitest, coverage, Edge helper testleri, Expo Doctor ve diff check
geçti. `npx supabase db reset`, Docker Desktop Linux engine çalışmadığı için başlamadan hata verdi;
bu nedenle iki SQL test dosyası uygulanamadı. QA credential/hedef ve deploy izni verilmediğinden remote
probe/integration çalıştırılmadı. Build çalıştırılmadı.

## Expected outputs

- Onaylı forward migration/server mekanizmasıyla 10 belge + 25 MB toplam + 5 MB/dosya sınırı.
- Yalnız PDF/JPEG/PNG kabulü ve içerik doğrulama kanıtı.
- Private, owner-scoped, random-path Storage ve 60 saniyelik signed URL kanıtı.
- Delete/reconciliation ve cross-user negatif test raporu.
- Görsel sıkıştırma teknik karar notu.
- KVKK/hukuk blocker karar ve evidence kaydı.
- Gate'ler kapanırsa etkin upload; kapanmazsa V1'de güvenli geçici disabled state.

## Manual device checks

- [ ] 4,9 MB ve 5 MB sınırındaki izinli dosya yüklenir; 5 MB üzeri güvenli Türkçe mesajla reddedilir.
- [ ] 10 belge ve toplam 25 MB sınırları ayrı ayrı Android release artifact'ta doğrulanır.
- [ ] JPG/JPEG/PNG/PDF çalışır; WebP ve desteklenmeyen/yanlış etiketli dosya reddedilir.
- [ ] Sıkıştırılan görselin ruhsat/sigorta metni okunabilir kalır ve kullanıcıya sürpriz kalite kaybı
      yaşatmaz.
- [ ] Belge açma, 60 saniye expiry, silme ve tekrar açma başarısızlığı doğrulanır.
- [ ] Gate'ler kapanmazsa upload CTA/route kapalıdır; mevcut kayıtlara erişim/silme davranışı ürün
      sahibi tarafından ayrıca kabul edilir.

## Do not change

- İnsan onayı verilene kadar `src/`, `supabase/migrations/`, Supabase remote proje ve runtime davranışı.
- `package.json`, lockfile, dependency, `.env*`, Expo/EAS/Android yapılandırması ve build sistemi.
- Mevcut kullanıcı/production verisi; testte yalnız ayrılmış QA ve sentetik dosyalar.
- Billing, OCR, AI, paylaşım, public bucket veya client-side encryption.

## Execution plan

### Goal

Geçici Storage kararını yarış koşullarına dayanıklı server-side kontrollerle uygulamak ve upload
release kararını teknik/hukuki kanıtla vermek.

### Background

Bu task, [V1 kapsamı](../../docs/product/v1-scope.md),
[kota ilkeleri](../../docs/product/monetization-and-quotas.md),
[Storage politikası](../../docs/security/storage-policy.md) ve
[KVKK readiness](../../docs/security/kvkk-readiness.md) kararlarını uygular.

### Current state

Yukarıdaki `Current behavior` bölümü kaynak kod/migration incelemesine dayanır. Remote bölge,
provider ayarı ve hukuk belgeleri `AWAITING EVIDENCE` durumundadır.

### Scope

Onaydan sonra server-side kota/file validation, safe path, delete/reconciliation, negatif test,
compression kararı ve release enable/disable davranışı.

### Out of scope

OCR/AI, billing, public sharing, E2E encryption ve ayrı onay verilmeyen build/deploy.

### Acceptance criteria

Bu task'ın `Acceptance criteria` ve `KVKK/hukuk release blocker'ları` bölümleri bağlayıcıdır.

### Risks

- Paralel upload ile kota aşımı veya orphan object.
- Migration'ın mevcut dosyaları erişilemez kılması.
- Sıkıştırmanın belge okunabilirliğini bozması veya metadata tutması.
- Hesap silmede Storage object kalması.
- Provider/region varsayımının gerçek remote konfigürasyonla uyuşmaması.
- Hukuk blocker'ları kapanmadan feature'ın yanlışlıkla production'a açılması.

### Security/privacy impact

Yüksek: özel belge, kimlik/araç verisi, cross-user erişim, yurt dışı aktarım, e-posta provider'ı,
retention, hesap silme ve incident response etkilenir. Bağımsız security/privacy review zorunludur.

### Relevant files

Task'ın `Relevant files` bölümü başlangıç envanteridir; yeni dosya ihtiyacı scope değişikliği olarak
plana eklenmeden değiştirilmez.

### Implementation steps

1. İnsan/hukuk blocker owner'larını ve upload enable/disable karar tarihini ata.
2. Mevcut Storage metadata/object yaşam döngüsünü ve remote bucket config'ini kanıtla.
3. Kota enforcement tasarımını concurrency, byte source ve rollback ile ayrı review et.
4. Forward migration/server mekanizmasını ve client UX'i yalnız onaylı kapsamda uygula.
5. Random PII-free path, MIME/magic-byte, size ve deletion/reconciliation kontrollerini uygula.
6. Unit/local/remote negatif testleri çalıştır; gerçek Android cihazda sınırları doğrula.
7. Hukuk/processor/region evidence'ını release gate'e ekle.
8. Gate sonucuna göre upload'ı etkinleştir veya V1'de güvenli biçimde devre dışı bırak.
9. Diff, security/privacy regression ve dokümantasyon review'unu tamamla.

### Validation commands

Task'ın `Commands to run` bölümü başlangıç setidir. Exact yeni migration/test komutları uygulama
planında dosyalar kesinleşince eklenir; remote/destructive komutlar izin kapısındadır.

### Manual checks

Task'ın `Manual device checks` ve KVKK evidence maddeleri uygulanır.

### Rollback strategy

- Mevcut migration değiştirilmez; yeni forward migration ayrı ve gözden geçirilebilir olur.
- Yeni upload'lar sorun çıkarırsa feature flag/route guard ile upload geçici kapatılır; mevcut
  object'ler otomatik silinmez.
- Kota metadata'sı backfill/reconcile edilebilir olmalı; rollback sırasında ownership veya private
  bucket gevşetilmez.
- Veri silen rollback kullanılmaz. Schema geri dönüşü yerine güvenli forward fix tercih edilir.

### Expected output

Task'ın `Expected outputs` bölümü.

### Do not change

Task'ın `Do not change` bölümü.

### Completion report

#### Completed

- Forward migration; server-only, advisory-lock korumalı 10 belge/25 MB rezervasyonu; 5 MB private
  bucket allow-list'i ve reserved Storage INSERT RLS'i hazırlandı.
- Upload Edge Function'da request stream 5 MB üzerinde erken kesiliyor; PDF/JPEG/PNG magic byte ve
  declared MIME eşleşmesi doğrulanıyor; WebP reddediliyor.
- Owner/vehicle/random UUID object path'i, 60 saniyelik signed URL, belge/rapor/araç Storage-first
  silme ve server-side hesap + Storage silme akışı uygulandı.
- Kayıt/Ayarlar ekranlarından açılan KVKK ve gizlilik taslakları `HUKUK İNCELEMESİ BEKLİYOR` olarak
  eklendi; aydınlatma açık rıza kutusuna dönüştürülmedi.
- Yurt dışı aktarım, OCR/AI, pazarlama ve isteğe bağlı hassas analiz için ayrı hukuki değerlendirme
  sınırları belgelendi.
- TypeScript, lint, 71 Vitest testi, coverage, 9 Edge helper testi, Expo Doctor 20/20 ve diff whitespace
  kontrolü geçti.

#### Skipped

- Remote deploy/probe/integration; ayrılmış QA hedefi, credential ve açık remote mutation izni olmadığı
  için çalıştırılmadı.
- Build kullanıcı talimatı gereği çalıştırılmadı.

#### Failed

- `npx supabase db reset`, Docker Desktop Linux engine pipe'ı bulunmadığı için başlamadan hata verdi.
  Migration uygulanamadı; `rls_negative.sql` ve `storage_quota.sql` local database testleri bu nedenle
  çalışmadı.

#### Manual verification required

- Gerçek Android cihazda upload tür/boyut/adet/toplam kota, hukuk bağlantıları, signed URL expiry ve
  belge/hesap silme akışları.
- İki ayrılmış QA kullanıcısıyla cross-user Storage/RLS reddi ve hesap silme sonrası object envanteri.
- Supabase region/provider evidence, sekiz hukuk blocker'ı ve production upload enable/temporary-disable
  kararı.

## Completion checklist

- [x] `AGENTS.md`, ilgili kaynaklar ve mevcut Storage kodu/migration'ı incelendi.
- [x] Dokümantasyon aşamasının execution planı ve acceptance criteria'sı oluşturuldu.
- [x] Yalnız onaylı dokümantasyon kapsamı uygulandı.
- [ ] Teknik acceptance criteria local/QA database ve cihaz kanıtıyla tamamlandı.
- [x] Çalışabilen otomatik kontroller çalıştırıldı ve sonuçları kaydedildi.
- [ ] Remote ve device testleri yetkili ortamda çalıştırıldı.
- [x] Dokümantasyon diff'i ve security/privacy etkisi gözden geçirildi.
- [x] Completed/skipped/failed/manual kontroller ayrı raporlandı.

## Review checklist

- [x] İnsan reviewer geçici ürün kararını ve teknik scope'u onayladı.
- [ ] Hukukçu sekiz KVKK/hukuk blocker'ını değerlendirdi.
- [ ] Teknik uygulama diff'i bağımsız security/privacy review'dan geçti.
- [ ] Kota yarış koşulu, file spoof, cross-user ve deletion negatif testleri güncel.
- [ ] Upload enable/temporary-disable kararı release artifact'a uygulanmış.
- [ ] Açık blocker veya critical bulgu yok.

## Human acceptance result

**Result:** IMPLEMENTATION APPROVED  
**Reviewed by:** Product owner  
**Date:** 2026-08-01  
**Notes:** Teknik uygulama, migration ve test kapsamı onaylandı. Build açıkça kapsam dışı kaldı;
production release ve hukuki metin onayı verilmedi.
