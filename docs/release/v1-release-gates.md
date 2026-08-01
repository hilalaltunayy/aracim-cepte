# V1 release kapıları

**Snapshot date:** 2026-08-01  
**Release target:** İlk Google Play production Android yayını

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

| Release blocker                               | Status                       | Mevcut repository kanıtı / kapanış koşulu                                                                                                                                                                                                       |
| --------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth flows verified                           | Manual verification required | Auth kod/testleri var; yeni kayıt → doğrulama → login → session restore → logout gerçek release ortamında tamamlanmalı.                                                                                                                         |
| Email verification verified                   | Manual verification required | `docs/release-readiness.md` e-posta doğrulamanın açık olduğunu, gerçek teslimatın eksik olduğunu kaydediyor. QA mailbox + production SMTP/link testi gerekli.                                                                                   |
| Password reset verified                       | Manual verification required | Unit/web kanıtı var; gerçek e-posta deep link → yeni parola → eski link reddi Android release artifact'ta eksik.                                                                                                                                |
| RLS negative tests passed                     | Passed                       | TASK-004 forward-fix sonrası User B'nin User A DB kayıtları, Storage download/list/signed URL/delete erişimi reddedildi; rezervasyonsuz direct upload da başarısız oldu. Public helper RPC kaldırıldı.                                          |
| Authenticated CRUD tests passed               | In progress                  | TASK-004 User A araç create, belge create/delete ve User B izolasyonunu remote'da doğruladı. Araç için tam create/read/update/delete ve persistence matrisi henüz tamamlanmadı.                                                                 |
| Private storage tests passed                  | Passed                       | Remote bucket private; public/unsigned erişim reddi, owner-scoped random path, PDF/JPEG/PNG upload, User A/B izolasyonu, 60 saniyelik URL expiry ve Storage cleanup hedefli + tam E2E'de geçti.                                                 |
| Account deletion exists                       | In progress                  | TASK-004 remote sentetik E2E'de Auth, DB cascade, Storage, eski session ve eski signed URL temizliği geçti. Gerçek Android UI/retry/hata kabulü henüz manuel doğrulama gerektiriyor.                                                            |
| Data deletion exists                          | In progress                  | Belge metadata + Storage object silme ve hesap silme backend E2E geçti. Cache, kısmi hata/retry ve Android kabulü ayrıca kanıtlanmalı.                                                                                                          |
| Supabase Frankfurt transfer assessment        | Not started                  | Ürün sahibi region'ın Frankfurt olduğunu belirtti; remote Dashboard kanıtı ve Türkiye dışına veri aktarımı için kapsam/mekanizma hukuk incelemesi yok.                                                                                          |
| Supabase and Resend subprocessors reviewed    | Not started                  | Her iki sağlayıcının fiili rolü, DPA/privacy belgeleri, güncel alt işleyenleri, işleme ülkeleri, retention/deletion ve değişiklik bildirimi hukuk/ürün sahibi tarafından incelenmeli.                                                           |
| KVKK aydınlatma metni published               | Not started                  | Gerçek veri akışına uygun, sürümlü, hukuk incelemesinden geçmiş metin ve doğru toplama anlarında sunum kanıtı yok.                                                                                                                              |
| Privacy policy published                      | Not started                  | Yayın URL'si ve hukuk incelemesi kanıtı repository'de yok. Uygulama ve Play listing'den erişilmeli.                                                                                                                                             |
| Retention and deletion policy approved        | Not started                  | Veri kategorisi bazında süre, silme tetikleyicisi, Storage/provider/log/backup davranışı ve restore sonrası deletion prosedürü onaylanmalı.                                                                                                     |
| Data breach procedure ready                   | Not started                  | Olay sahibi, containment, key/session revoke, etki analizi, sağlayıcı koordinasyonu, hukukçu onaylı bildirim değerlendirmesi ve table-top kanıtı yok.                                                                                           |
| Professional legal review completed           | Not started                  | KVKK readiness, yurt dışı aktarım, aydınlatma/policy, alt işleyen, retention/deletion ve incident süreci yetkin hukukçu tarafından incelenmeli; uyumluluk varsayılamaz.                                                                         |
| Data Safety answers prepared                  | Not started                  | Gerçek veri akışı, provider/subprocessor ve retention ile eşleşen Play Console cevapları kaydedilmeli.                                                                                                                                          |
| Document limits enforced                      | Passed                       | TASK-004 remote hedefli ve tam E2E; 11. object ve 25 MB toplam kota reddini doğruladı. 5 MB üstü preflight kontrollü 413 verdi; private bucket gerçek 5 MB+ byte yüklemesini ayrıca reddetti.                                                   |
| File validation enforced                      | Passed                       | Remote PDF/JPEG/PNG pozitif matrisi geçti; WebP ve sahte MIME magic-byte kontrolünde reddedildi. Edge size contract ve bucket hard limit birlikte doğrulandı. Android hata sunumu ayrı manuel gate'tedir.                                       |
| Document upload release decision approved     | Not started                  | Teknik ve hukuki gate'ler kapanırsa upload etkinleştirilecek; kapanmazsa V1'de geçici devre dışı bırakılacak. Seçim, owner, tarih ve artifact kanıtı bekliyor.                                                                                  |
| No public bucket                              | Passed                       | TASK-004 sonrası linked SQL bucket `public = false` gösterdi; remote probe unsigned private object ve public bucket URL erişimini reddetti. Kanıt: TASK-004, 2026-08-01, `eiqxvvnqkbzbhzpthcwo`.                                                |
| No service-role key in client                 | Passed                       | `docs/release-readiness.md` client'ta secret/service-role olmadığını kaydediyor; her release'te source, env exposure ve bundle secret scan yeniden yapılmalı.                                                                                   |
| No sensitive data in logs                     | In progress                  | Release-readiness auth/recovery tokenlarının loglanmadığını kaydediyor; filename/path/signed URL/PII dahil release cihazı ve provider log örneklemi eksik.                                                                                      |
| Real Android device critical flow test passed | Manual verification required | [Manuel kabul testi](../manual-acceptance-test.md) gerçek release ortamında tamamlanıp cihaz/OS/build kimliğiyle imzalanmalı.                                                                                                                   |
| APK acceptance test passed                    | Manual verification required | [TASK-001](../../tasks/active/TASK-001-android-device-feedback-and-v1-polish.md) kullanıcı geri bildirimi bekliyor; APK kabul sonucu yok.                                                                                                       |
| Production AAB succeeds                       | Not started                  | Güncel production AAB artifact, signing/build logu ve smoke testi kanıtı yok. AAB build bu dokümantasyon görevinde çalıştırılmadı.                                                                                                              |
| Store screenshots completed                   | Not started                  | Onaylı telefon ekran görüntüleri, privacy redaction, locale/cihaz ölçüleri ve listing seti yok.                                                                                                                                                 |
| No known blocker or critical bug              | Failed                       | TASK-004 upload/RLS blocker'ı kapandı ve callable public `SECURITY DEFINER` advisor uyarısı giderildi. Leaked-password protection, hukuk/KVKK, provider-log ve gerçek Android/release artifact gate'leri açık olduğu için release hâlâ blokeli. |

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
