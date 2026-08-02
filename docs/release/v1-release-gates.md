# V1 release kapıları

**Snapshot date:** 2026-08-02
**Release target:** İlk Google Play production Android yayını

## TASK-013 hedefli güvenlik doğrulaması

**Sonuç:** SECURITY VERIFICATION PASSED — AWAITING LEGAL WEB PUBLICATION AND CLOSED TEST

2026-08-02 tarihinde doğrulanan `eiqxvvnqkbzbhzpthcwo` projesinde iki sentetik kullanıcıyla
DB/RLS izolasyonu, owner-scoped RPC'ler, private Storage, kısa süreli signed URL, MIME/magic-byte,
5 MB, 10 belge/25 MB kota, idempotent retry/recovery, toplu veri silme ve hesap silme yeniden hedefli
olarak geçti. Eski session ve signed URL reddedildi; aynı e-postayla yeni sentetik hesap eski veriyi
görmedi. Final cleanup Auth, DB ve Storage için sıfır kalıntıyla doğrulandı. Client taramasında
privileged secret, public Storage URL veya hassas log kullanımı bulunmadı.

Bu sonuç yalnız [TASK-013 teknik kontrol matrisi](../qa/v1-security-authorization-verification.md)
kapsamındadır. Yeni APK'nın Android kabulü, provider/admin log örneklemi, hukuk web yayını,
KVKK/yurt dışı aktarım kararı ve profesyonel hukuk incelemesi açıktır; Google Play production
hazırlığı iddiası değildir.

## Preview APK build kapısı — TASK-010 güncellemesi

**Karar:** READY FOR CRASH-REGRESSION PREVIEW APK BUILD — ANDROID KABULÜ BEKLENİYOR

1–2 Ağustos 2026 gerçek Android kabulü, TASK-009 kararından sonra hızlı kayıt, ekspertiz dosyası açma
ve toplu silme sonrası ekran durumlarında production-blocking kusurlar göstermiştir. TASK-009'un
`READY FOR PREVIEW APK BUILD` kararı tarihsel kanıttır. TASK-010 kaynak düzeltmeleri; hedefli ve tam
test, TypeScript, lint, Expo Doctor, diff ve güvenlik taraması kapılarından geçmiştir. Bu güncel karar
yalnız ayrı aşamada yeni crash-regression preview APK'sı alınmasına izin verir; o APK gerçek cihazda
kabul edilmeden Android blocker'ları `Passed` değildir ve production Play Store yayını hazır değildir.

### TASK-011 kritik route düzeltme kanıtı

TASK-010 sonrası APK'da dokuz kayıt/belge/ekspertiz route'u root Error Boundary'ye düşmüştür.
TASK-011, ilk throw'u `requestId.ts` içindeki Android'de bulunmayan Web Crypto bağımlılığı olarak
component stack ile yeniden üretmiş; SDK 57 `expo-crypto.randomUUID()` ile değiştirmiştir. Dokuz route
gerçek React component mount testleriyle, üç kayıt türünün exact href/parametreleriyle ve güvenli
invalid/missing state'lerle doğrulanmıştır. Tam paket 45 dosya/184 test, TypeScript, lint, Expo Doctor
20/20 ve diff kontrolünden geçmiştir. Yeni APK oluşturulmadığı için gerçek Android ve APK gate'leri
`Failed`/manuel durumunda kalır; bu kaynak kanıtı tek başına production veya artifact kabulü değildir.

### Tarihsel TASK-009 kararı

2026-08-01 tarihli TASK-009 read-only denetiminde `main` ile `origin/main` aynı TASK-008 commit'inde,
10 migration local/remote eşleşmiş ve gerekli üç Edge Function `ACTIVE` bulunmuştur. TypeScript, lint,
28 dosya/127 Vitest testi, Expo Doctor 20/20 ve diff kontrolü geçmiştir. Client kaynak taramasında
service-role/secret, tema token dosyası dışında runtime renk literal'i veya public Storage URL kullanımı
bulunmamış; remote `vehicle-attachments` bucket'ı `public=false`, 5 MB ve PDF/JPEG/PNG olarak
doğrulanmıştır.

Bu karar yalnız yeni bir **preview APK** üreterek aşağıdaki Android manuel kapılarını test etmeye izin
verir. Production tablosundaki hukuk/KVKK, canlı web URL'leri, gerçek cihaz kabulü, provider log,
mağaza ve AAB kapıları değişmez; Google Play production readiness iddiası değildir.

## Durum sözlüğü

- **Not started:** Güncel release kanıtı yok veya çalışma başlamadı.
- **In progress:** Kısmi repository kanıtı var; gate'in tüm kabulü tamamlanmadı.
- **Passed:** Güncel repository kanıtı veya kaydedilmiş manuel kabul gate'i eksiksiz destekliyor.
- **Failed:** Kontrol çalıştı ve release kriterini karşılamadı.
- **Manual verification required:** Otomasyon/repository tek başına kanıtlayamaz; insan ve belirtilen
  ortam gerekir.

`Passed` yalnız TypeScript/lint sonucu veya geçmiş iddia ile verilemez. Kanıt komutu, tarih, ortam
ve artifact/task bağlantısıyla kaydedilir. Her uygulama/release değişikliği bu snapshot'ı yeniden
değerlendirir.

## Blocker kapılar

| Release blocker                               | Status                       | Mevcut repository kanıtı / kapanış koşulu                                                                                                                                                                                                     |
| --------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth flows verified                           | Manual verification required | Auth kod/testleri var; yeni kayıt → doğrulama → login → session restore → logout gerçek release ortamında tamamlanmalı.                                                                                                                       |
| Email verification verified                   | Manual verification required | `docs/release-readiness.md` e-posta doğrulamanın açık olduğunu, gerçek teslimatın eksik olduğunu kaydediyor. QA mailbox + production SMTP/link testi gerekli.                                                                                 |
| Password reset verified                       | Manual verification required | Unit/web kanıtı var; gerçek e-posta deep link → yeni parola → eski link reddi Android release artifact'ta eksik.                                                                                                                              |
| RLS negative tests passed                     | Passed                       | TASK-013 iki yönlü sentetik testte vehicle, fuel/maintenance/expense, reminder, body condition, expertise, note ve attachment metadata foreign read/update/delete denemelerini reddetti; foreign owner-scoped RPC'ler de başarısız oldu.      |
| Authenticated CRUD tests passed               | In progress                  | TASK-004 User A araç create, belge create/delete ve User B izolasyonunu remote'da doğruladı. Araç için tam create/read/update/delete ve persistence matrisi henüz tamamlanmadı.                                                               |
| Private storage tests passed                  | Passed                       | TASK-013 remote kanıtı: bucket private; public/unsigned URL, foreign list/download/signed URL/overwrite/delete ve rezervasyonsuz/foreign upload etkisiz; UUID owner path, 60 saniyelik expiry ve cleanup geçti.                               |
| Account deletion exists                       | In progress                  | TASK-013 Auth/DB/Storage, eski session, eski signed URL ve aynı e-postayla yeniden kayıt izolasyonunu remote geçirdi. Gate yalnız Android UI loading/double-tap/hata/restart kabulü tamamlanmadığı için `In progress` kalır.                  |
| Data deletion exists                          | In progress                  | TASK-013 User A all-record, all-reminder ve all-vehicle-data silmelerinin User B'ye dokunmadığını; TASK-008 recovery/cleanup mekanizmalarını remote geçirdi. Android UI ve local notification lifecycle kabulü açıktır.                       |
| Supabase Frankfurt transfer assessment        | Not started                  | Ürün sahibi region'ın Frankfurt olduğunu belirtti; remote Dashboard kanıtı ve Türkiye dışına veri aktarımı için kapsam/mekanizma hukuk incelemesi yok.                                                                                        |
| Supabase and Resend subprocessors reviewed    | Not started                  | Her iki sağlayıcının fiili rolü, DPA/privacy belgeleri, güncel alt işleyenleri, işleme ülkeleri, retention/deletion ve değişiklik bildirimi hukuk/ürün sahibi tarafından incelenmeli.                                                         |
| KVKK aydınlatma metni published               | Not started                  | Gerçek veri akışına uygun, sürümlü, hukuk incelemesinden geçmiş metin ve doğru toplama anlarında sunum kanıtı yok.                                                                                                                            |
| Privacy policy published                      | Not started                  | Yayın URL'si ve hukuk incelemesi kanıtı repository'de yok. Uygulama ve Play listing'den erişilmeli.                                                                                                                                           |
| Retention and deletion policy approved        | Not started                  | Veri kategorisi bazında süre, silme tetikleyicisi, Storage/provider/log/backup davranışı ve restore sonrası deletion prosedürü onaylanmalı.                                                                                                   |
| Data breach procedure ready                   | Not started                  | Olay sahibi, containment, key/session revoke, etki analizi, sağlayıcı koordinasyonu, hukukçu onaylı bildirim değerlendirmesi ve table-top kanıtı yok.                                                                                         |
| Professional legal review completed           | Not started                  | KVKK readiness, yurt dışı aktarım, aydınlatma/policy, alt işleyen, retention/deletion ve incident süreci yetkin hukukçu tarafından incelenmeli; uyumluluk varsayılamaz.                                                                       |
| Data Safety answers prepared                  | Not started                  | Gerçek veri akışı, provider/subprocessor ve retention ile eşleşen Play Console cevapları kaydedilmeli.                                                                                                                                        |
| Document limits enforced                      | Passed                       | TASK-013: 10. belge kabul, 11. belge ret, silme sonrası kota serbestliği, tam 25 MB kabul ve üstü ret doğrulandı; tam 5 MB server rezervasyonu kabul, üstü ilan edilen boyut kontrollü 413 aldı. Retry duplicate object/metadata oluşturmadı. |
| File validation enforced                      | Passed                       | TASK-013 remote PDF/JPEG/PNG pozitif matrisi; WebP ve PDF-as-JPEG spoof reddi geçti. Yerel hedefli test gerçek byte stream magic/size limitini doğruladı. Android picker ve Türkçe sunum ayrı manuel gate'tedir.                              |
| D-11–D-13 data consistency recovery           | In progress                  | D-11 atomic/idempotent record+mileage ve D-13 stateful upload/missing-orphan cleanup iki sentetik kullanıcıyla remote geçti. D-12 DB-first notification recovery hedefli testleri geçti; gerçek Android OS lifecycle manuel kalır.            |
| Document upload release decision approved     | Not started                  | Teknik ve hukuki gate'ler kapanırsa upload etkinleştirilecek; kapanmazsa V1'de geçici devre dışı bırakılacak. Seçim, owner, tarih ve artifact kanıtı bekliyor.                                                                                |
| No public bucket                              | Passed                       | TASK-004 sonrası linked SQL bucket `public = false` gösterdi; remote probe unsigned private object ve public bucket URL erişimini reddetti. Kanıt: TASK-004, 2026-08-01, `eiqxvvnqkbzbhzpthcwo`.                                              |
| No service-role key in client                 | Passed                       | TASK-013 tracked client/runtime taraması privileged key/secret bulmadı; yalnız placeholder `.env.example` tracked. Service-only helper grant'leri client rollerine kapalı. Her artifact'ta bundle scan yine zorunludur.                       |
| No sensitive data in logs                     | In progress                  | TASK-013 source taraması public URL ve token/password/signed URL log kullanımı bulmadı; development auth/error diagnostics redacted. Release cihazı ve Supabase/Resend provider log örneklemi eksik olduğu için gate kapanmaz.                |
| Real Android device critical flow test passed | Failed                       | 1–2 Ağustos 2026 kabulünde hızlı kayıt/ekspertiz crash'i ve toplu silme sonrası beyaz ekran bulundu. TASK-010 kaynak düzeltmesi sonrası yeni artifact üzerinde ayrıntılı crash-regression kabulü zorunlu.                                     |
| APK acceptance test passed                    | Failed                       | Mevcut APK production-blocking cihaz kusurları göstermiştir. TASK-010 otomatik kapıları ve yeni Android kabulü tamamlanmadan Passed yapılamaz.                                                                                                |
| Production AAB succeeds                       | Not started                  | Güncel production AAB artifact, signing/build logu ve smoke testi kanıtı yok. AAB build bu dokümantasyon görevinde çalıştırılmadı.                                                                                                            |
| Store screenshots completed                   | Not started                  | Onaylı telefon ekran görüntüleri, privacy redaction, locale/cihaz ölçüleri ve listing seti yok.                                                                                                                                               |
| No known blocker or critical bug              | Failed                       | TASK-010'a kaynak olan Android crash/beyaz ekranlar mevcut APK'da doğrulandı; yeni artifact kabulü bekleniyor. Leaked-password protection, hukuk/KVKK, provider-log ve production artifact gate'leri de açık.                                 |

## Release kararı kuralı

- Her blocker `Passed` olmadan production rollout kararı verilemez. `Manual verification required`
  release için geçmiş sayılmaz.
- `Failed` gate için owner, düzeltme task'ı, risk ve yeniden test tarihi atanır.
- Kanıt eski artifact/sürümden ise gate yeniden açılır.
- Build başarısı runtime, veri güvenliği veya mağaza kabulü anlamına gelmez.
- Belge yükleme için teknik/hukuki gate'ler kapanmadan yalnız disclaimer veya UI-side kota ile
  production yayını yapılamaz. Gate'ler kapanmazsa upload V1'de geçici devre dışı bırakılır.
- Release owner son kararda completion report'u `Completed`, `Skipped`, `Failed`, `Manual
verification required` olarak ayrı sunar. Blocker kontrolü atlanamaz; atlandıysa release durur.

## Kanıt kaydı şablonu

```markdown
- Gate:
- Status:
- Date/timezone:
- App/build/commit:
- Environment/device:
- Exact command or manual steps:
- Expected result:
- Actual result:
- Evidence link:
- Reviewer:
- Follow-up task:
```
