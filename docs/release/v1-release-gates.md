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

| Release blocker                               | Status                       | Mevcut repository kanıtı / kapanış koşulu                                                                                                                                                               |
| --------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth flows verified                           | Manual verification required | Auth kod/testleri var; yeni kayıt → doğrulama → login → session restore → logout gerçek release ortamında tamamlanmalı.                                                                                 |
| Email verification verified                   | Manual verification required | `docs/release-readiness.md` e-posta doğrulamanın açık olduğunu, gerçek teslimatın eksik olduğunu kaydediyor. QA mailbox + production SMTP/link testi gerekli.                                           |
| Password reset verified                       | Manual verification required | Unit/web kanıtı var; gerçek e-posta deep link → yeni parola → eski link reddi Android release artifact'ta eksik.                                                                                        |
| RLS negative tests passed                     | In progress                  | Önceki user A/B kanıtı vardır; TASK-002 Storage INSERT politikasını değiştirdi ve testi genişletti. Yeni migration local/QA ortamında çalıştırılamadığı için güncel politika henüz kabul edilmedi.      |
| Authenticated CRUD tests passed               | Not started                  | Repository contract var; release-readiness authenticated remote CRUD'un credential olmadığı için çalıştırılmadığını kaydediyor. Ayrılmış QA hesabıyla create/read/update/delete ve persistence gerekli. |
| Private storage tests passed                  | In progress                  | Private bucket/RLS/unsigned erişim kanıtı mevcut; authenticated upload, kısa signed URL expiry, delete ve orphan kontrolü release ortamında eksik.                                                      |
| Account deletion exists                       | In progress                  | TASK-002 authenticated Edge Function ve Ayarlar silme aksiyonunu ekledi; Auth user + DB cascade + Storage + session akışı local/QA ve Android E2E ile henüz doğrulanmadı.                               |
| Data deletion exists                          | In progress                  | Belge/ekspertiz/araç ve hesap silme akışlarında Storage temizliği uygulanmıştır; bütün kullanıcı verisi, cache, kısmi hata/retry ve eski signed URL davranışı release ortamında kanıtlanmalı.           |
| Supabase Frankfurt transfer assessment        | Not started                  | Ürün sahibi region'ın Frankfurt olduğunu belirtti; remote Dashboard kanıtı ve Türkiye dışına veri aktarımı için kapsam/mekanizma hukuk incelemesi yok.                                                  |
| Supabase and Resend subprocessors reviewed    | Not started                  | Her iki sağlayıcının fiili rolü, DPA/privacy belgeleri, güncel alt işleyenleri, işleme ülkeleri, retention/deletion ve değişiklik bildirimi hukuk/ürün sahibi tarafından incelenmeli.                   |
| KVKK aydınlatma metni published               | Not started                  | Gerçek veri akışına uygun, sürümlü, hukuk incelemesinden geçmiş metin ve doğru toplama anlarında sunum kanıtı yok.                                                                                      |
| Privacy policy published                      | Not started                  | Yayın URL'si ve hukuk incelemesi kanıtı repository'de yok. Uygulama ve Play listing'den erişilmeli.                                                                                                     |
| Retention and deletion policy approved        | Not started                  | Veri kategorisi bazında süre, silme tetikleyicisi, Storage/provider/log/backup davranışı ve restore sonrası deletion prosedürü onaylanmalı.                                                             |
| Data breach procedure ready                   | Not started                  | Olay sahibi, containment, key/session revoke, etki analizi, sağlayıcı koordinasyonu, hukukçu onaylı bildirim değerlendirmesi ve table-top kanıtı yok.                                                   |
| Professional legal review completed           | Not started                  | KVKK readiness, yurt dışı aktarım, aydınlatma/policy, alt işleyen, retention/deletion ve incident süreci yetkin hukukçu tarafından incelenmeli; uyumluluk varsayılamaz.                                 |
| Data Safety answers prepared                  | Not started                  | Gerçek veri akışı, provider/subprocessor ve retention ile eşleşen Play Console cevapları kaydedilmeli.                                                                                                  |
| Document limits enforced                      | In progress                  | TASK-002 forward migration + upload Edge Function 10 belge, 25 MB/kullanıcı ve 5 MB/dosya rezervasyon kontrolünü ekledi; SQL local/QA concurrency ve gerçek upload kanıtı Docker/QA ortamı bekliyor.    |
| File validation enforced                      | In progress                  | TASK-002 client allow-list'ini PDF/JPEG/PNG'ye daralttı, WebP'yi kaldırdı ve Edge Function magic-byte kontrolü ekledi; bozuk/aktif içerik, remote bypass ve gerçek cihaz fixture testleri tamamlanmadı. |
| Document upload release decision approved     | Not started                  | Teknik ve hukuki gate'ler kapanırsa upload etkinleştirilecek; kapanmazsa V1'de geçici devre dışı bırakılacak. Seçim, owner, tarih ve artifact kanıtı bekliyor.                                          |
| No public bucket                              | In progress                  | Forward migration `public = false` değerini korur ve önceki remote kanıt private bucket gösterir; TASK-002 deploy edilip unsigned/public URL negatif testi tekrar çalıştırılmalıdır.                    |
| No service-role key in client                 | Passed                       | `docs/release-readiness.md` client'ta secret/service-role olmadığını kaydediyor; her release'te source, env exposure ve bundle secret scan yeniden yapılmalı.                                           |
| No sensitive data in logs                     | In progress                  | Release-readiness auth/recovery tokenlarının loglanmadığını kaydediyor; filename/path/signed URL/PII dahil release cihazı ve provider log örneklemi eksik.                                              |
| Real Android device critical flow test passed | Manual verification required | [Manuel kabul testi](../manual-acceptance-test.md) gerçek release ortamında tamamlanıp cihaz/OS/build kimliğiyle imzalanmalı.                                                                           |
| APK acceptance test passed                    | Manual verification required | [TASK-001](../../tasks/active/TASK-001-android-device-feedback-and-v1-polish.md) kullanıcı geri bildirimi bekliyor; APK kabul sonucu yok.                                                               |
| Production AAB succeeds                       | Not started                  | Güncel production AAB artifact, signing/build logu ve smoke testi kanıtı yok. AAB build bu dokümantasyon görevinde çalıştırılmadı.                                                                      |
| Store screenshots completed                   | Not started                  | Onaylı telefon ekran görüntüleri, privacy redaction, locale/cihaz ölçüleri ve listing seti yok.                                                                                                         |
| No known blocker or critical bug              | Not started                  | Tüm gate'ler kapanıp açık görev/review listesi ve insan kabulü incelenmeden verilemez.                                                                                                                  |

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
