# V1 kabul test matrisi

**Audit date:** 2026-08-01
**Baseline:** `2c5cc0450b558ba94ff0c8e07422db5b4a309cdf`
**Automated run:** `npm test` — 20 dosya / 98 test geçti

Bu sonuç uygulama, Android veya release artifact kabulü değildir. Vitest yapılandırması `node`
environment kullanır ve yalnız `src/**/*.test.ts` dosyalarını alır; React Native ekranlarını light ve
dark provider ile render eden `.test.tsx` altyapısı yoktur.

## 35 senaryoluk kabul matrisi

| ID    | Senaryo                     | Repository/otomasyon sonucu                                   | Android kabul adımı                               | Beklenen sonuç / güncel durum                                  |
| ----- | --------------------------- | ------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| UF-01 | Onboarding                  | Route decision unit test var                                  | Temiz kurulum → Başlayalım → restart              | Bir kez görünür; **MANUAL REQUIRED**                           |
| UF-02 | Kayıt                       | Copy/prefill/password helper testleri geçti                   | Yeni hesap, legal linkler, success CTA            | Otomatik login yok; **MANUAL REQUIRED**                        |
| UF-03 | E-posta doğrulama           | Email confirmation project gate açık; uygulama içi resend yok | Gerçek mailbox ve deep link                       | **MANUAL + HUMAN DECISION REQUIRED**                           |
| UF-04 | Giriş                       | Store/source ve friendly error var                            | Doğrulanmış hesapla login + restart               | Session restore; **MANUAL REQUIRED**                           |
| UF-05 | Hatalı giriş                | Error mapping kaynakta                                        | Yanlış parola/doğrulanmamış e-posta               | Raw provider hata yok; **MANUAL REQUIRED**                     |
| UF-06 | Reset isteği                | Redirect/error helpers testli                                 | Gerçek e-posta teslimatı                          | **MANUAL REQUIRED**                                            |
| UF-07 | Yeni parola                 | Recovery parsing/validation/error testleri geçti              | Link → yeni parola → eski link                    | **MANUAL REQUIRED**                                            |
| UF-08 | Çıkış                       | Source flow var                                               | Online/offline logout + back + restart            | **POSSIBLE RISK:** signOut failure semantics                   |
| UF-09 | Araç oluşturma              | Repository contract kısmi                                     | Yeni hesapla create + restart                     | CRUD gate In progress; **MANUAL REQUIRED**                     |
| UF-10 | Araç düzenleme              | Validation/source var                                         | Bütün alanları edit + restart                     | **MANUAL REQUIRED**                                            |
| UF-11 | Kilometre güncelleme        | `nextVehicleMileage` tests passed                             | Record ve direct vehicle edit ile düşük/yüksek km | **CONFIRMED DEFECT:** direct edit düşürebilir                  |
| UF-12 | Araç silme                  | Normal remote account/storage kanıtı kısmi                    | Child data+file+notification olan araç sil        | **POSSIBLE RISK:** cross-system atomicity                      |
| UF-13 | Yakıt CRUD                  | Business/repository tests                                     | Create/edit/delete + dashboard/history/restart    | **POSSIBLE RISK:** insert+mileage partial failure              |
| UF-14 | Bakım CRUD                  | Business/repository tests                                     | Create/edit/delete + filtre/restart               | Aynı partial risk; **MANUAL REQUIRED**                         |
| UF-15 | Diğer masraf CRUD           | Business/repository tests                                     | Create/edit/delete + filtre/restart               | Aynı partial risk; **MANUAL REQUIRED**                         |
| UF-16 | Geçmiş/filtre               | Sort/filter source                                            | Dört filtre ve record deep link                   | **MANUAL REQUIRED**, filter semantics erişilebilirlik defect'i |
| UF-17 | Dashboard stats             | Analytics edge tests geçti                                    | Fixture değerleriyle görsel karşılaştır           | Hesap source PASS; UI/theme **MANUAL**                         |
| UF-18 | Reminder create/edit        | Urgency/notification rules testli                             | Tarih, km, ikisi; granted/denied; edit            | **POSSIBLE RISK:** DB/notification ayrışması                   |
| UF-19 | Reminder delete             | Source cleanup var                                            | Scheduled notification ile delete                 | **POSSIBLE RISK:** cancel-before-delete                        |
| UF-20 | Reminder complete/reopen    | Source + duplicate mutation guard                             | Offline/rapid toggle + notification list          | **POSSIBLE RISK:** orphan/eksik notification                   |
| UF-21 | Gövde durumu                | Schema/condition source ve tests                              | Her body type/part/status + restart               | **MANUAL THEME/SVG CHECK**                                     |
| UF-22 | Ekspertiz                   | CRUD/source var                                               | CRUD, attachment replace/open/delete              | Open error + atomicity defect'leri                             |
| UF-23 | Belge upload/create         | Remote private/MIME/quota E2E Passed                          | Android picker pozitif matrisi + restart          | Backend PASS; UI **MANUAL**                                    |
| UF-24 | Belge açma                  | 60 sn signed URL source/remote expiry Passed                  | Online/offline/unsupported viewer                 | **CONFIRMED DEFECT:** open error catch yok                     |
| UF-25 | Belge silme                 | Normal-path remote cleanup Passed                             | DB+Storage + restart                              | **POSSIBLE RISK:** storage-before-DB failure                   |
| UF-26 | MIME/boyut/kota             | Remote PDF/JPEG/PNG, WebP/spoof/5MB/10/25 Passed              | Picker üzerinden aynı negatif matris              | Backend PASS; UI copy **MANUAL**                               |
| UF-27 | Ayarlar/izin/veri temizleme | Source flow var                                               | Permission denied/granted, dört clear             | Error visibility/partial cleanup **RISK**                      |
| UF-28 | Sistem/Açık/Koyu            | 8 tema token/preference testi geçti                           | Live switch + restart + system change             | Pure logic PASS; render/native **MANUAL**                      |
| UF-29 | Hukuk sayfaları             | Generated freshness test suite Passed                         | Beş route, scroll/back/light/dark                 | Taslak; **HUMAN LEGAL DECISION**                               |
| UF-30 | Hesap ve veri silme         | Remote sentetik E2E normal path Passed                        | Gerçek Android UI/offline/retry/old session       | Gate In progress; **MANUAL + HUMAN**                           |
| UF-31 | Android geri                | Header source ve web history helper var                       | Three-button/gesture/modal/date picker/dirty form | **MANUAL REQUIRED**                                            |
| UF-32 | Alt sekmeler                | Layout calculation tests geçti                                | Three-button/gesture/narrow/keyboard              | **MANUAL REQUIRED**                                            |
| UF-33 | İnternet kesintisi          | Friendly mapping var                                          | Existing account offline cold start               | **CONFIRMED DEFECT:** vehicle create'e yanlış yönlenir         |
| UF-34 | Oturum süresinin dolması    | Error mapping var; global route guard yok                     | Açık her tab/detail'de session revoke             | **CONFIRMED DEFECT:** login redirect yok                       |
| UF-35 | Kapatıp yeniden açma        | Theme/onboarding/active ID/session source                     | Cold/warm restart online/offline                  | Online **MANUAL**; offline UF-33 defect'i                      |

## Confirmed defect register

Bu audit'te **14 confirmed defect** vardır. Bunlar kaynak veya deterministik kontrast hesabıyla
kanıtlanmıştır; runtime'da görülmüş gibi sunulmamıştır.

| ID   | Alan          | Defect                                                                                                               | Etki                                                  | Öncelik | Kanıt                                         |
| ---- | ------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- | --------------------------------------------- |
| D-01 | Tema          | Light `primaryAction` normal metin kontrastı: beyaz üstünde `3.01:1`, screen üstünde `2.81:1`                        | Primary button/link/selected tab label okunabilirliği | P1      | `tokens.ts`, `ui.tsx`, tabs/register/login    |
| D-02 | Tema          | Dashboard/onboarding beyaz gradient metni endpoint'lerde `3.01:1`–`1.87:1`                                           | Küçük ve büyük hero metni kontrastı                   | P1      | Hard-coded rgba/white + gradient tokens       |
| D-03 | Tema          | Light secondary/placeholder `3.94:1`–`4.21:1`; badge text `2.65:1`–`4.12:1`                                          | Supporting text, warning/status görünürlüğü           | P1      | `tokens.ts`, `ui.tsx`                         |
| D-04 | Tema          | Input/card/divider border kontrastı light `1.26:1`, dark `1.50:1`                                                    | Kontrol sınırlarının ayırt edilmesi                   | P1      | `border` / surfaces                           |
| D-05 | Tema          | Loading button disabled surface kullanırken spinner `disabledText` kullanmıyor; light primary spinner beyaz/açık gri | İşlem sırasında spinner görünmeyebilir                | P1      | `AppButton` branch/style sırası               |
| D-06 | Dosya         | `openAttachment` rejection'ı iki edit ekranında yakalanmıyor                                                         | Kullanıcıya hata/recovery yok, unhandled promise      | P1      | `documents/edit.tsx`, `expertise/edit.tsx`    |
| D-07 | Auth          | Session null olduğunda aktif protected route login'e replace edilmiyor                                               | Blank/stale route ve güvenlik algısı                  | P0      | root layout + auth/data store                 |
| D-08 | Offline       | Bootstrap failure `vehicles=[]` ile “araç yok” kararına dönüşüyor                                                    | Mevcut kullanıcıya yanıltıcı araç oluşturma           | P0      | `dataStore.bootstrap`, `routeDecision`        |
| D-09 | Mileage       | Vehicle edit current km'yi sessizce düşürüyor                                                                        | Latest-known mileage/reminder doğruluğu               | P0      | `saveVehicle` vs mileage spec                 |
| D-10 | Reminder      | Tam hedef km (`remaining=0`) `due` yerine `overdue` oluyor; UI modelinde ayrı Due yok                                | Yanlış reminder durumu                                | P0      | `getReminderStatus`, mileage spec             |
| D-11 | Persistence   | Record insert ve vehicle mileage update ayrı; ikinci hata partial save + retry duplicate yaratabilir                 | Veri tutarlılığı                                      | P1      | `saveRecord`                                  |
| D-12 | Notification  | Reminder DB mutation ile OS notification cancel/schedule atomik değil                                                | Eksik/orphan bildirim                                 | P1      | reminder repository methods                   |
| D-13 | Storage       | File remove/replacement ile DB metadata update/delete atomik değil                                                   | Orphan file veya missing object                       | P1      | document/expertise/vehicle repository methods |
| D-14 | Accessibility | Dashboard shortcuts, history filters, note cards ve SectionHeader action'larında role/state/label eksikleri          | TalkBack anlamı ve selected state                     | P1      | İlgili `Pressable` kaynakları                 |

## Possible risk register

Bu audit'te **15 possible risk** vardır.

| ID    | Risk                                                                                                            | Kapanış kanıtı                                       |
| ----- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| PR-01 | Confirmation email delivery/deep-link/expired link ve in-app resend yolu kanıtlı değil                          | Gerçek QA mailbox + Android link testi               |
| PR-02 | Password reset delivery, redirect allow-list ve used-link rejection release artifact'ta kanıtlı değil           | QA mailbox + release APK                             |
| PR-03 | Network failure sırasında logout local/provider session temizliği davranışı belirsiz                            | Offline logout + restart + client session inspection |
| PR-04 | Araçsız required create ekranından hardware/back sonucu blank/loop üretebilir                                   | Yeni hesap Android back matrisi                      |
| PR-05 | Notification payload route içeriyor ancak notification response/tap navigation handler kaynakta yok             | Ürün kararı + gerçek notification tap testi          |
| PR-06 | Settings error state'i clear/delete hatalarında görünür global banner olarak render edilmiyor                   | Failure injection + UX kararı                        |
| PR-07 | Theme persistence write failure sessiz; seçim restart'ta geri dönebilir                                         | AsyncStorage failure test + UX kararı                |
| PR-08 | Manual light/dark seçimi Android navigation bar icon/background'ını açıkça yönetmiyor                           | Three-button/gesture gerçek cihaz                    |
| PR-09 | Native alert/date picker app override yerine sistem temasında kalabilir                                         | Sistemden farklı manual tema ile cihaz testi         |
| PR-10 | Persisted override sistem temasından farklıysa native splash ile ilk app frame arasında renk sıçraması olabilir | Cold-start video/light-dark kombinasyonları          |
| PR-11 | React Native light/dark component render/snapshot altyapısı yok                                                 | Provider-aware component tests veya screenshot E2E   |
| PR-12 | SVG body colors kaynakta ayrı olsa da bütün status/selection kombinasyonları görsel testli değil                | Her body type light/dark screenshot                  |
| PR-13 | KVKK contact e-posta/URL düz text; tıklanabilirlik/kopyalama davranışı yok                                      | Ürün/erişilebilirlik kararı                          |
| PR-14 | Image picker `quality: 0.85` kullanır fakat compression sonucu, metadata temizliği ve kalite kanıtlı değil      | Gerçek dosya byte/EXIF/okunabilirlik testi           |
| PR-15 | Account deletion normal E2E geçti; backup/retention/provider logs/kısmi hata ve hukuk sonucu açık               | Teknik prosedür + hukuk incelemesi                   |

## İnsan kararı gereken release maddeleri

1. Belge upload gate'leri kapanırsa etkinleştirme, kapanmazsa V1'de devre dışı bırakma kararı.
2. Supabase Frankfurt aktarımı, Supabase/Resend alt işleyenleri ve profesyonel hukuk incelemesi.
3. KVKK aydınlatma, privacy, retention/deletion ve incident metinlerinin onay/yayın tarihi.
4. Offline V1 hedefi: retry-only mi, read-only cache mi?
5. Düşük kilometre düzeltmesinin ayrı ve audit edilebilir ürün davranışı.
6. Dirty formda geri navigasyon için discard confirmation.
7. Notification tap route davranışının V1 acceptance kapsamı.

## Eksik veya çelişkili akış/doküman kayıtları

| Tür            | Bulgu                                                                                | Audit yorumu                                                                            |
| -------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Eksik akış     | Kayıt sonrası in-app confirmation e-postası resend kontrolü yok                      | V1 email verification manuel gate'ini güçleştirir; ürün kararı gerekir                  |
| Eksik akış     | Notification content route taşıyor, notification response/tap navigation handler yok | Tap ile Hatırlatıcılar'a dönüş kaynakta kanıtlanamıyor                                  |
| Eksik akış     | Offline cold start için retry/offline route state yok                                | UF-33 / D-08 confirmed defect                                                           |
| Eksik akış     | Session expiry için global protected-route guard yok                                 | UF-34 / D-07 confirmed defect                                                           |
| Eksik durum    | Mileage reminder modelinde ayrı `due` durumu yok                                     | `remaining=0` overdue olur; D-10                                                        |
| Çelişki        | `docs/project-status.md` remote Supabase'in bağlı olmadığını söylüyor                | TASK-004 ve güncel release gates remote ref/deploy/E2E kanıtlıyor; belge tarihsel/stale |
| Çelişki        | `docs/project-status.md` güvenli hesap silme UI'da yok diyor                         | Settings ve `delete-account` akışı mevcut; güncel gate In progress                      |
| Çelişki        | Release gate APK satırı TASK-001 için “kullanıcı geri bildirimi bekliyor” diyor      | TASK-001 feedback uygulanmış; beklenen şey yeni APK Android acceptance sonucudur        |
| Stale plan     | TASK-005 implementation step 7 hâlâ `In progress` yazıyor                            | Commit/push tamamlanmış; task completion kaydı kendi içinde tutarsız                    |
| Tarihsel kayıt | `docs/release-readiness.md` 10 MB/WebP ve eski test sayıları içeriyor                | Belge kendini tarihsel diye işaretliyor; güncel karar için release gates kullanılmalı   |

## APK öncesi zorunlu düzeltme kapısı

Yeni acceptance APK'sından önce en az D-01–D-10 ve D-14 kapatılmalıdır; bunlar doğrudan görünür
erişilebilirlik, temel auth/offline, mileage veya hata recovery davranışıdır. D-11–D-13 veri
tutarlılığı/security regressions olduğundan production release öncesi blocker'dır ve mümkünse aynı
APK'dan önce çözülmelidir. Hiçbiri bu audit görevinde düzeltilmemiştir.

## Yalnız gerçek Android cihazda doğrulanabilecekler

- Email confirmation/reset link app dönüşü ve gerçek SMTP teslimatı.
- Password press/release/cancel/blur/background ve keyboard/autofill.
- Three-button/gesture safe-area, Android navigation bar ve hardware back.
- Native alert, date picker, picker permission/cancel/viewer.
- Notification permission/channel/delivery/tap ve OS schedule cleanup.
- Light/dark/system bütün ekranlar, TalkBack, target size, reflow ve cold-start flash.
- Account deletion UI/retry, old session/signed URL ve uygulama restart sonucu.
