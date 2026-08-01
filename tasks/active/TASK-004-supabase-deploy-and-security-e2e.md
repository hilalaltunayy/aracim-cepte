# TASK-004 — Supabase deploy and security E2E

**Status:** TECHNICAL SECURITY E2E PASSED — MANUAL RELEASE CHECKS PENDING
**Owner:** Codex
**Created:** 2026-08-01
**Updated:** 2026-08-01

## Forward-fix execution plan — 2026-08-01

### Goal

Reserved Storage INSERT hatasını mevcut migration'ı değiştirmeden gidermek; reservation helper'ını
Data API'den gizli ve güvenli `search_path` kullanan bir RLS yardımcısına dönüştürmek; upload request
boyutu sözleşmesini kontrollü 413 üretecek şekilde sertleştirmek ve yalnız hedefli E2E matrisiyle
kanıtlamak.

### Current state and root-cause evidence

- Sentetik rezervasyon satırının owner, vehicle, path, size, MIME ve expiry alanlarının tamamı beklenen
  değerlerle eşleşti.
- Aynı authenticated session ile public helper çağrısı PostgreSQL `42883` verdi. Kök neden,
  `COALESCE` özel SQL ifadesinin `pg_catalog.coalesce(...)` biçiminde fonksiyon gibi çağrılmasıdır.
- Storage, INSERT yetkilendirme aşamasında object metadata'yı `DEFAULT` bırakabildiğinden policy'nin
  `metadata.size/mimetype` değerlerini INSERT anında zorunlu tutması da geçersiz bir varsayımdır.
- Helper public/exposed schema'da `SECURITY DEFINER` ve authenticated `EXECUTE` yetkili olduğu için
  doğrudan RPC yüzeyi oluşturur.

### Scope

- Yeni forward migration; private-schema helper, daraltılmış EXECUTE ve reserved INSERT policy fix.
- Upload Edge Function ve istemci/test request-size header sözleşmesi.
- Yalnız TASK-004'te listelenen hedefli remote upload/RLS/kota/silme testleri.

### Out of scope

- Mevcut migration'ı düzenlemek, build çalıştırmak, yeni ürün özelliği veya bağımlılık eklemek.
- Gerçek kullanıcı verisine dokunmak ya da hedef project ref dışına deploy etmek.

### Risks and rollback

- Private helper policy tarafından çağrılamazsa upload fail-closed kalır; migration geri alınmaz,
  ayrı forward migration hazırlanır.
- Size header istemci beyanıdır; gerçek byte stream limiti ve bucket 5 MB limiti korunur, header tek
  güvenlik katmanı değildir.
- QA yalnız iki sentetik kullanıcı/prefix ile yürütülür ve `finally` cleanup + linked SQL audit yapılır.

### Validation order

1. Migration/helper/policy ve Edge helper testleri.
2. Remote PDF/JPEG/PNG, WebP/spoof, 5 MB+, cross-user Storage, 10/25 MB ve belge silme hedefli E2E.
3. Yalnız hedefli E2E geçerse typecheck, lint ve ilgili regresyon testleri.
4. Advisor, diff, secret/scope ve Markdown link kontrolü; kanıt güncelleme; commit/push.

## Task ID

TASK-004

## Title

TASK-002 Supabase değişikliklerini güvenli deploy etmek ve security E2E kanıtını üretmek.

## Goal

TASK-002 kapsamında hazırlanmış forward migration ile `upload-attachment` ve `delete-account` Edge
Function'larını yalnız doğrulanmış `eiqxvvnqkbzbhzpthcwo` projesine deploy etmek; iki sentetik QA
kullanıcısıyla belge güvenliği, kota, izolasyon, signed URL ve silme davranışlarını uçtan uca
kanıtlamak.

## User problem

Repository'de hazırlanmış güvenlik kontrolleri remote projeye uygulanıp gerçek API sınırından negatif
test edilmedikçe belge yükleme ve hesap silme akışları production release için güvenilir kabul
edilemez.

## Current behavior

- Local link, public endpoint ve explicit CLI hedefi `eiqxvvnqkbzbhzpthcwo` olarak eşleşti.
- `20260801111349_enforce_attachment_quotas_and_private_uploads.sql` remote history'ye yalnız forward
  migration olarak uygulandı; son dry-run remote'un güncel olduğunu gösterdi.
- `upload-attachment` remote listede `ACTIVE`, version 2; `delete-account` version 1 durumundadır.
- Hosted function runtime'ın Supabase URL/key değişkenleri platform tarafından sağlanır; key
  envanteri yalnız ad/tür düzeyinde doğrulandı ve değerler loglanmadı. Auth gerektiren function probe'u
  runtime konfigürasyonunun çalıştığını doğruladı.
- Remote bucket private, 5 MB limitli ve yalnız PDF/JPEG/PNG allow-list'li olarak doğrulandı.
- İki sentetik kullanıcı testinde DB cross-user erişimi reddedildi; WebP ve sahte MIME reddedildi.
- Kök neden tanısı rezervasyon satırının doğru olduğunu, public helper'ın ise yanlış
  `pg_catalog.coalesce(...)` çağrısı nedeniyle PostgreSQL `42883` verdiğini gösterdi. Storage INSERT
  anında metadata'yı zorunlu tutma varsayımı da geçersizdi.
- `20260801132557_fix_attachment_reservation_storage_policy.sql` helper'ı Data API'den gizli `private`
  şemaya, güvenli boş `search_path` ile taşıdı; public RPC'yi kaldırdı ve policy'yi server-generated
  reservation path'ine bağladı. Security Advisor'ın callable `SECURITY DEFINER` uyarısı kapandı.
- Upload request-size header preflight'i 5 MB üstünde kontrollü HTTP 413
  `ATTACHMENT_FILE_TOO_LARGE` döndürüyor; gerçek byte limiti private bucket tarafından ayrıca enforce
  ediliyor. Header tek güvenlik katmanı değildir.
- Hedefli ve tam remote E2E; PDF/JPEG/PNG, WebP/spoof, owner path, cross-user Storage, rezervasyonsuz
  direct upload, 10 belge/25 MB kota, belge silme, signed URL expiry ve hesap silme matrisini geçti.
- Bağımsız sentetik hesap silme E2E'sinde Auth, DB cascade, Storage cleanup, eski session ve eski signed
  URL reddi doğrulandı. Yaklaşık 60 saniyelik URL 65 saniye sonra erişim sağlamadı.
- Final cleanup SQL'i sentetik Auth/profile/vehicle/document/reservation sayılarının sıfır olduğunu;
  Storage envanteri de iki sentetik prefix'in boş olduğunu doğruladı.

## Desired behavior

- Local link ve bütün remote komutların hedefi onaylı project ref ile eşleşir.
- Yalnız pending forward migration uygulanır; mevcut migration dosyaları değiştirilmez.
- İki onaylı Edge Function deploy edilir ve gerekli platform secret'ları değerleri açığa çıkmadan
  doğrulanır.
- İki sentetik QA kullanıcısıyla pozitif, negatif, kota, tür/boyut, expiry ve deletion testleri
  çalışır; QA verileri test sonunda temizlenir.
- Release gate ve TASK-002/TASK-004 yalnız üretilen kanıt kadar güncellenir.

## Scope

- [x] Supabase link/project ref, pending migration ve function envanterini read-only doğrulamak.
- [x] Pending forward migration'ı doğrulanmış linked projeye uygulamak.
- [x] `upload-attachment` ve `delete-account` fonksiyonlarını deploy etmek.
- [x] Function environment/secret adlarının varlığını değerleri göstermeden doğrulamak.
- [x] İki sentetik QA kullanıcısıyla remote security E2E testlerini çalıştırmak.
- [x] QA kullanıcılarını, DB kayıtlarını ve Storage object'lerini cleanup ile kaldırmak.
- [x] Release gate ile TASK-002/TASK-004 kanıtlarını güncellemek.
- [ ] Test/dokümantasyon değişikliklerini commit edip `git push origin main` çalıştırmak.

## Out of scope

- Uygulama build'i, EAS/Expo build veya Play Console işlemi
- Mevcut migration dosyalarını düzenlemek ya da migration history repair yapmak
- Production veya gerçek kullanıcı verisini okumak, değiştirmek ya da silmek
- Public bucket, zayıflatılmış RLS veya test engelini bypass eden privileged ürün davranışı
- Uygulama özelliği, dependency veya package değişikliği
- Hukuki blocker'ları teknik deploy ile kapanmış saymak

## Acceptance criteria

- [x] Linked project ref tam olarak `eiqxvvnqkbzbhzpthcwo` olarak doğrulanır; aksi halde remote write
      yapılmaz.
- [x] Pending migration listesi dry-run ile kaydedilir ve yalnız mevcut forward migration uygulanır.
- [x] `upload-attachment` ve `delete-account` deployed function listesinde güncel görünür.
- [x] Gerekli function environment/secret adları vardır; hiçbir secret değeri çıktıya veya commite
      yazılmaz.
- [x] User A kendi aracını, belge kaydını ve izinli dosyasını oluşturabilir.
- [x] User B, User A'nın DB kayıtlarını, Storage object'ini ve signed URL üretimini kullanamaz.
- [x] PDF, JPEG ve PNG kabul edilir; WebP, sahte MIME ve 5 MB üstü dosya reddedilir.
- [x] 11. belge ve kullanıcı başına toplam 25 MB sınırını aşan yükleme reddedilir.
- [x] Owner için üretilen signed URL yaklaşık 60 saniye sonra erişim sağlamaz.
- [x] Belge silme sonunda DB metadata ve Storage object yoktur.
- [x] Hesap silme sonunda Auth, uygulama DB satırları ve Storage object'leri yoktur.
- [x] Silinen hesaba ait eski session ve signed URL erişim sağlamaz.
- [x] QA artefaktları cleanup ile kaldırılır ve cleanup sonucu ayrı doğrulanır.
- [x] Başarısız/atlanmış kontroller `Passed` olarak kaydedilmez.

## Security/privacy requirements

- Yalnız sentetik, görev-özel QA kimlikleri ve üretilmiş test dosyaları kullanılır.
- Test adları, object path'leri ve kayıtlar gerçek kişi/plaka/belge verisi içermez.
- Service-role, access token, kullanıcı şifresi, signed URL veya connection string çıktıda/logda
  gösterilmez ve repository'ye yazılmaz.
- Admin ayrıcalığı yalnız QA kurulum/cleanup ve Auth silme doğrulaması için kullanılır; cross-user
  test sonuçlarını üretmek için kullanılmaz.
- Cleanup başarısızlığı release blocker olarak kaydedilir; mevcut/production kullanıcı verisine
  geniş filtre uygulanmaz.
- Project ref kontrolü remote write komutlarından önce zorunlu fail-closed kapıdır.

## Relevant screenshots or evidence

- 2026-08-01 remote CLI kanıtı: linked ref eşleşti; forward-fix migration local/remote eşleşti;
  `upload-attachment` `ACTIVE` version 2 ve `delete-account` version 1.
- 2026-08-01 hedefli ve tam E2E kanıtı: bütün upload/RLS/kota/MIME/boyut/belge-silme kriterleri ile
  signed URL ve hesap silme regresyonu geçti.
- Cleanup kanıtı: Auth/profile/vehicle/document/reservation sayıları sıfır; sentetik Storage prefix'leri
  boş. Kimlik, token, object path ve signed URL kanıta yazılmadı.
- Security advisor sonucu: public/callable `SECURITY DEFINER` uyarısı kapandı. Leaked-password
  protection hâlâ etkin değildir ve release blocker/follow-up gerektirir.

## Relevant files

- `supabase/migrations/20260801111349_enforce_attachment_quotas_and_private_uploads.sql`
- `supabase/migrations/20260801132557_fix_attachment_reservation_storage_policy.sql`
- `supabase/functions/upload-attachment/`
- `supabase/functions/delete-account/`
- `supabase/functions/_shared/`
- `supabase/tests/rls_negative.sql`
- `supabase/tests/storage_quota.sql`
- `scripts/qa-remote-probe.mjs`
- `scripts/qa-remote-integration.mjs`
- `tasks/active/TASK-002-storage-quota-and-kvkk-release-readiness.md`
- `docs/release/v1-release-gates.md`

## Commands to run

Exact CLI flagları kurulu sürümün `--help` çıktısından doğrulandıktan sonra çalıştırılır:

```powershell
npx supabase --version
npx supabase db push --help
npx supabase functions deploy --help
npx supabase secrets list --help
npx supabase migration list --linked
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase functions deploy upload-attachment --project-ref eiqxvvnqkbzbhzpthcwo --use-api
npx supabase functions deploy delete-account --project-ref eiqxvvnqkbzbhzpthcwo --use-api
npm run qa:remote:probe
npm run qa:remote
npm run typecheck
npm run lint
npm test
git diff --check
git push origin main
```

## Expected outputs

- Doğrulanmış project ref ve migration/function envanteri
- Başarılı forward migration ve iki function deploy kaydı
- Test bazında pass/fail/skip ve cleanup kanıtı
- Güncellenmiş TASK-002, TASK-004 ve V1 release gate
- Kapsamla sınırlı commit ve başarılı `origin/main` push

## Manual device checks

- [ ] Gerçek Android cihazda PDF/JPEG/PNG seçme, yükleme ve açma
- [ ] WebP, sahte MIME, 5 MB, 10 belge ve 25 MB hata mesajlarının Türkçe/doğru görünmesi
- [ ] Signed URL expiry sonrası uygulama davranışı
- [ ] Belge silme ve hesap silme UI akışları, loading/error/back navigation
- [ ] Release APK üzerinde kritik akış kabul testi

## Do not change

- Mevcut migration dosyaları ve migration history
- Uygulama kaynak kodu/runtime davranışı
- Package, dependency, Expo/EAS/Android/iOS veya environment dosyaları
- Onaylı project ref dışında herhangi bir Supabase projesi
- Gerçek/production kullanıcı verisi
- Hukuk metinlerinin onay durumu

## Execution plan

### Goal

Onaylı Supabase projesine fail-closed kimlik kapısıyla deploy edip güvenlik kritik akışları sentetik
QA verisiyle kanıtlamak.

### Background

TASK-002 local/repository uygulamasını tamamladı; remote deploy ve E2E kanıtı bu görevde açıkça
onaylandı.

### Current state

Linked ref `eiqxvvnqkbzbhzpthcwo` ile eşleşti; forward migration remote'a uygulandı ve
`upload-attachment` v2 / `delete-account` v1 aktif olarak doğrulandı. Sentetik QA kimlikleri test içinde
oluşturulup temizlendi; secret değerleri hiçbir çıktıya yazılmadı.

### Scope

Read-only preflight, forward deploy, sentetik iki kullanıcılı remote E2E, cleanup ve kanıt belgeleri.

### Out of scope

Uygulama build'i, mevcut migration düzenleme, gerçek veri operasyonu ve ürün özelliği ekleme.

### Risks

- Yanlış projeye deploy: ref eşitliği ve explicit `--project-ref` ile fail-closed.
- Migration geriye uyumsuzluğu: dry-run, mevcut dosyaya dokunmama ve forward-fix rollback.
- QA cleanup hatası: görev-özel prefix/ID envanteri, dar silme ve cleanup doğrulaması.
- Secret sızıntısı: yalnız ad/varlık kontrolü, değer redaksiyonu ve commit öncesi tarama.
- False-positive güvenlik testi: User B istekleri yalnız kendi session'ıyla yapılır.

### Security/privacy impact

Yüksek. Remote Auth, RLS, private Storage, signed URL, service-role cleanup, kullanıcı izolasyonu ve
hesap silme etkilenir. Testler yalnız sentetik veriyle ve minimum admin kullanımıyla yürütülür.

### Implementation steps

1. CLI sürüm/help, local link ve project ref'i doğrula.
2. Pending migration, deployed functions ve gerekli secret adlarını read-only envanterle.
3. Ref eşleşirse migration dry-run ve forward push çalıştır.
4. İki Edge Function'ı explicit project ref ile deploy et ve listeden doğrula.
5. QA probe ile ortam/credential uygunluğunu değer göstermeden doğrula.
6. İki sentetik kullanıcıyla bütün pozitif/negatif/kota/MIME/expiry/deletion testlerini çalıştır.
7. Başarı veya hata durumunda QA cleanup çalıştır ve kalıntı olmadığını doğrula.
8. TASK-002, TASK-004 ve release gate'i yalnız gerçek kanıtla güncelle.
9. TypeScript/lint/test/Markdown/diff/security kontrollerini çalıştır.
10. Kapsam dosyalarını commit et ve `git push origin main` çalıştır.

### Validation commands

`Commands to run` bölümü bağlayıcıdır; remote/deletion komutları yalnız doğrulanmış ref ve sentetik QA
hedefleri üzerinde çalıştırılır.

### Manual checks

Android ve APK kontrolleri otomatik remote E2E'nin yerine geçmez ve bu görevde manuel kalır.

### Rollback strategy

- Migration geri alınmaz veya history repair edilmez; problemde upload kapatılır ve ayrı forward-fix
  migration hazırlanması için görev durdurulur.
- Function problemi varsa son bilinen güvenli commit ayrı açık onayla yeniden deploy edilir; bu görev
  otomatik function rollback yapmaz.
- QA cleanup yalnız oluşturulan sentetik kullanıcı/object/kayıt envanterine uygulanır.

### Expected output

Project ref, deploy envanteri, test matrisi, cleanup, release gate, commit ve push kanıtı.

### Do not change

Task'ın `Do not change` bölümü bağlayıcıdır.

### Completion report

#### Completed

- Project identity fail-closed kapısı geçti; ref `eiqxvvnqkbzbhzpthcwo` olarak üç kaynaktan doğrulandı.
- İlk migration ve hedefli `20260801132557_fix_attachment_reservation_storage_policy.sql` forward
  migration'ı uygulandı; local/remote history eşleşti.
- `upload-attachment` version 2 ve `delete-account` version 1 ACTIVE görüldü.
- Public helper kaldırıldı; private-schema helper, boş `search_path`, dar EXECUTE ve RLS-only policy
  kullanımı doğrulandı. İlgili Security Advisor uyarısı kapandı.
- Remote probe, private bucket/allow-list/limit, User A/B DB ve Storage izolasyonu, PDF/JPEG/PNG,
  WebP/sahte MIME, 5 MB 413 + bucket hard limit, 10 belge/25 MB kota ve belge DB/Storage silme geçti.
- 60 saniyelik signed URL expiry ile hesap silme sonrası Auth/DB/Storage/session/URL temizliği geçti.
- Bütün sentetik QA varlıkları temizlendi ve linked SQL ile sıfır kalıntı doğrulandı.
- Typecheck, lint, 13 dosyada 75 Vitest testi ve 9 Edge helper testi geçti.

#### Skipped

- Provider/dashboard log örneklemi dashboard oturumu olmadığı için incelenemedi.
- Build, Supabase reset ve Android testleri kapsam gereği çalıştırılmadı.

#### Failed

- Hedefli ve tam remote E2E'de açık teknik failure yoktur.
- Security Advisor leaked-password protection'ın kapalı olduğunu raporlamaya devam ediyor.

#### Manual verification required

- Gerçek Android cihaz ve release APK üzerinde upload/hata mesajları, belge/hesap silme, loading,
  navigation ve URL expiry davranışı.
- Provider loglarında PII, object path veya signed URL bulunmadığının yetkili dashboard incelemesi.
- KVKK/hukuk gate'leri, leaked-password protection kararı ve production upload enable/disable kararı.

## Completion checklist

- [x] `AGENTS.md`, TASK-002, task template, PLANS.md ve Supabase talimatları okundu.
- [x] TASK-004 ve aktif execution plan oluşturuldu.
- [x] Project identity gate geçti.
- [x] Yalnız onaylı deploy kapsamı uygulandı.
- [x] Acceptance criteria kanıtlandı veya ayrı pass/fail/skip kaydedildi.
- [x] QA cleanup doğrulandı.
- [x] Otomatik testler çalıştırıldı.
- [x] Diff ve security/privacy regression kontrolü yapıldı.
- [x] Dokümantasyon güncellendi.
- [x] Completed/skipped/failed/manual sonuçlar ayrı raporlandı.

## Review checklist

- [x] Project ref ve remote hedef kanıtı bağımsız okunabilir.
- [x] Migration history değişikliği yalnız forward push kaynaklıdır.
- [x] Cross-user DB testleri User B session'ıyla yapılmıştır.
- [x] Storage negatif testleri reddin beklenen güvenlik sınırından geldiğini kanıtlar.
- [x] Cleanup yalnız QA varlıklarını hedefler ve kalıntı yoktur.
- [ ] Provider logları incelenerek secret/PII/signed URL sızıntısı olmadığı doğrulanmıştır.
- [x] Açık kritik veya blocker bulgu doğru statüdedir.

## Human acceptance result

**Result:** DEPLOY AND REMOTE SECURITY E2E APPROVED
**Reviewed by:** Product owner
**Date:** 2026-08-01
**Notes:** Yalnız `eiqxvvnqkbzbhzpthcwo` projesi, mevcut forward migration ve iki belirtilen Edge
Function için deploy onayı verilmiştir. Build onaylanmamıştır.
