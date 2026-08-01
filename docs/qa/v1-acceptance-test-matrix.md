# V1 kabul test matrisi

**Audit date:** 2026-08-01
**Baseline:** `2c5cc0450b558ba94ff0c8e07422db5b4a309cdf`
**Automated run:** TASK-008 hedefli local testleri ve sentetik remote E2E — 2026-08-01

Bu sonuç uygulama, Android veya release artifact kabulü değildir. Vitest yapılandırması `node`
environment kullanır ve yalnız `src/**/*.test.ts` dosyalarını alır; React Native ekranlarını light ve
dark provider ile render eden `.test.tsx` altyapısı yoktur.

## TASK-010 Android crash-regression matrisi — 2026-08-02

Bu tablo 1–2 Ağustos 2026 cihaz bulgularına karşı hazırlanmıştır. Kaynak ve saf-logic testleri geçse
bile aşağıdaki satırlar yeni APK olmadan `Passed` değildir. Ekran görüntüleri repository'ye alınmaz.

| ID | Yeni APK adımları | Beklenen sonuç | Durum |
| --- | --- | --- | --- |
| A10-01 | Dashboard → Yakıt'a bir kez ve hızlıca iki kez dokun | Tek güvenli kayıt route'u açılır; geçerli string `type=fuel`; crash/duplicate yok | MANUAL ANDROID CHECK REQUIRED |
| A10-02 | Dashboard → Bakım'a bir kez ve hızlıca iki kez dokun | Bakım create formu açılır; crash/duplicate yok | MANUAL ANDROID CHECK REQUIRED |
| A10-03 | Dashboard → Masraf'a bir kez ve hızlıca iki kez dokun | Diğer masraf create formu açılır; crash/duplicate yok | MANUAL ANDROID CHECK REQUIRED |
| A10-04 | Geçmişte yakıt, bakım ve diğer kartlarına ayrı ayrı dokun | Doğru düzenleme route'u/tür/ikon açılır; “Diğer” bakım diye gösterilmez | MANUAL ANDROID CHECK REQUIRED |
| A10-05 | Geçerli ekspertiz ekini aç; sonra ağ kapalı/expired/missing ve viewer bulunmayan durumları dene | App kapanmaz; loading biter; güvenli dosya hatası ve tekrar deneme vardır | MANUAL ANDROID CHECK REQUIRED |
| A10-06 | Tüm araç kayıtlarını sil | Araç korunur; dashboard sıfır/empty; diğer tab'ler çalışır | MANUAL ANDROID CHECK REQUIRED |
| A10-07 | Tüm hatırlatıcıları sil | Empty state; local schedule'lar iptal; dashboard/araç çalışır | MANUAL ANDROID CHECK REQUIRED |
| A10-08 | Gövde durumunu sil | Varsayılan gövde durumu; araç ekranı beyaz/crash olmaz | MANUAL ANDROID CHECK REQUIRED |
| A10-09 | Tüm araç verisini sil ve app'i kapatıp yeniden aç | Stale active ID temiz; araç oluşturma güvenli durumu; back silinmiş entity'ye dönmez | MANUAL ANDROID CHECK REQUIRED |
| A10-10 | Her toplu silme düğmesine hızlıca iki kez dokun; ayrıca ağ hatası üret | Disabled/loading çift çağrıyı önler; hata local state'i silinmiş göstermez | MANUAL ANDROID CHECK REQUIRED |
| A10-11 | Warm ve cold start'ı 5'er kez kronometrele | Zorunlu olmayan reconciliation ilk render'ı bloklamaz; gerçek süreler kaydedilir | MANUAL ANDROID CHECK REQUIRED |
| A10-12 | Bildirim iznini reddet → Settings satırına dokun → sistemden aç → uygulamaya dön | Sistem uygulama ayarı açılır; dönüşte metin güncellenir ve reconcile tekrar denenir | MANUAL ANDROID CHECK REQUIRED |
| A10-13 | Tarihi uzak/yakın/bugün/dün; km'yi uzak/yakın/eşit/aşılmış oluştur | Badge 30 gün/1.000 km eşiğiyle doğru; negatif “kaldı” yok | MANUAL ANDROID CHECK REQUIRED |
| A10-14 | Tarih gelecek+km aşılmış, tarih geçmiş+km eksik, ikisi aşılmış kombinasyonlarını aç | En kritik badge ve ayrı neden satırları doğru | MANUAL ANDROID CHECK REQUIRED |
| A10-15 | 7/3/1/0 gün ve özel lead seç; izin açık/kapalı durumlarında kaydet | Tek seçimin gelecekteki yerel 09:00 schedule'ı oluşur; DB kaydı izin yokken korunur | MANUAL ANDROID CHECK REQUIRED |
| A10-16 | Reminder'ı düzenle/sil; aynı kaydı tekrar reconcile et | Eski schedule iptal, duplicate yok, silmede tüm ilişkili schedule temiz | MANUAL ANDROID CHECK REQUIRED |
| A10-17 | Bildirime foreground/background/killed durumunda dokun; sonra reminder'ı silip eski bildirime dokun | İlgili reminder açılır; silinmiş/geçersiz payload Hatırlatıcılar'a düşer; crash yok | MANUAL ANDROID CHECK REQUIRED |
| A10-18 | 500 TL/litresiz yakıt; 50 L/500 TL; 2.000 TL bakım; 5 TL diğer ekle | Tutar/litre/kategori ayrımı ve aylık/6 aylık toplamlar doğru | MANUAL ANDROID CHECK REQUIRED |
| A10-19 | Cari/önceki ay iki sıfır ve cari sıfır-önceki pozitif senaryoları | İki sıfırda anlamsız %100 yok; yalnız ikinci senaryoda %100 azalış | MANUAL ANDROID CHECK REQUIRED |
| A10-20 | En az iki farklı km kaydı olan/olmayan dataset ile dashboard'u aç | Maliyet/km doğru veya açıklama kartın yanında: “en az iki farklı kilometre kaydı gerekir” | MANUAL ANDROID CHECK REQUIRED |
| A10-21 | İlk kurulum login başlığı; başarılı login; çıkış/restart login başlığı | İlkinde “Hoş geldiniz”, sonrasında “Tekrar hoş geldiniz”; local değer PII içermez | MANUAL ANDROID CHECK REQUIRED |
| A10-22 | Hatalı login → Hesap oluştur → geri login | Register temiz; genel auth hatası sızmaz; geri login'de stale hata yok | MANUAL ANDROID CHECK REQUIRED |
| A10-23 | Settings → Yasal ve gizlilik → beş belgeyi aç | Tek sade liste, uygulama içi içerik, kullanıcı UI'ında inceleme marker'ı yok | MANUAL ANDROID CHECK REQUIRED |
| A10-24 | Dirty formda geri → Vazgeç; sonra geri → Çık; ayrıca save sonrası geri | Vazgeç form değerini korur; Çık kaydetmez; save sonrası yanlış uyarı yok | MANUAL ANDROID CHECK REQUIRED |
| A10-25 | Yapay route/render hatasında root fallback'i doğrula | PII/detail/log olmadan “Bir sorun oluştu” ve ana sayfa/tekrar dene aksiyonları | MANUAL ANDROID CHECK REQUIRED |

Otomatik test boşluğu: mevcut Vitest `node` ortamı React Native route/component tree'sini native
modüllerle render etmez. Bu görev yeni bir renderer/dependency eklemek yerine route-param, araçsız state,
dosya açma sınırı, reminder, notification ve dashboard mantığını saf testlerle kapsar; gerçek route/render
ve native module sonucu yukarıdaki APK kapısında kalır.

## TASK-007 düzeltme kanıtı — 2026-08-01

TASK-007, D-01–D-10 ve D-14 için kaynak düzeltmesini uygulamıştır. Bu durum APK veya Android kabulü
anlamına gelmez. D-11–D-13, TASK-008 ile kaynak/remote düzeyde uygulanmış; Android notification ve
kesintili upload kabulü manuel kapı olarak bırakılmıştır.

| ID   | Sonuç               | Otomatik/repository kanıtı                                                                       | Kalan kapı                           |
| ---- | ------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------ |
| D-01 | IMPLEMENTED         | Light action/text kontrast tokenları ve kontrast testleri                                        | Light ekran Android görsel kontrolü  |
| D-02 | IMPLEMENTED         | `onBrand`/`onBrandMuted` ve daha koyu marka gradient tokenları; onboarding/dashboard literal yok | Hero text Android piksel kontrolü    |
| D-03 | IMPLEMENTED         | Secondary ve info/success/warning/error semantic tonları testli                                  | Badge/placeholder Android kontrolü   |
| D-04 | IMPLEMENTED         | Light/dark border tokenları 3:1 hedefiyle testli                                                 | Input/card/divider Android kontrolü  |
| D-05 | IMPLEMENTED         | Loading spinner `disabledText` tokenını kullanır; iki temada testli                              | Gerçek loading button kontrolü       |
| D-06 | IMPLEMENTED         | İki edit ekranında safe open error, biten loading ve retry                                       | Native viewer/offline Android testi  |
| D-07 | IMPLEMENTED         | Session karar yardımcısı, protected-route replace ve güvenli mesaj testli                        | Gerçek expiry/revoke ve loop testi   |
| D-08 | IMPLEMENTED         | Bootstrap failure ayrı state; connection screen/retry route kararı testli                        | Offline cold-start Android testi     |
| D-09 | IMPLEMENTED         | Record km guard ve vehicle correction confirmation; rule/store savunması testli                  | Form + hesap regresyon Android testi |
| D-10 | IMPLEMENTED         | Eşit hedef `due`, aşım `overdue`, clamp edilmiş görünür değerler testli                          | Reminder list/detail Android testi   |
| D-11 | IMPLEMENTED + REMOTE | Transaction-safe/idempotent RPC; partial-write, retry ve cross-user sentetik E2E geçti           | Android CRUD/restart regresyonu      |
| D-12 | IMPLEMENTED + MANUAL | DB-first durum modeli; failure/retry/edit/delete/duplicate/denied testleri geçti                 | Android OS notification lifecycle   |
| D-13 | IMPLEMENTED + REMOTE | Upload state machine, cleanup queue, missing-object ve orphan reconciliation remote E2E geçti    | Android interruption/picker kabulü  |
| D-14 | IMPLEMENTED         | Ortak erişilebilirlik yardımcıları ve işaretli pressable role/label/state güncellemeleri         | TalkBack traversal ve state testi    |

Ek kapsam: confirmation resend, dirty-form çıkış guard'ı ve notification tap routing kaynak/test
olarak eklendi. Gerçek SMTP/deep-link, native back/gesture ve notification lifecycle sonuçları manuel
kapı olarak kalır.

## 35 senaryoluk kabul matrisi

| ID    | Senaryo                     | Repository/otomasyon sonucu                           | Android kabul adımı                               | Beklenen sonuç / güncel durum                     |
| ----- | --------------------------- | ----------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| UF-01 | Onboarding                  | Route decision unit test var                          | Temiz kurulum → Başlayalım → restart              | Bir kez görünür; **MANUAL REQUIRED**              |
| UF-02 | Kayıt                       | Copy/prefill/password helper testleri geçti           | Yeni hesap, legal linkler, success CTA            | Otomatik login yok; **MANUAL REQUIRED**           |
| UF-03 | E-posta doğrulama           | Cooldown'lı in-app resend helper/test eklendi         | Gerçek mailbox, rate limit ve deep link           | Kaynak uygulandı; **MANUAL REQUIRED**             |
| UF-04 | Giriş                       | Store/source ve friendly error var                    | Doğrulanmış hesapla login + restart               | Session restore; **MANUAL REQUIRED**              |
| UF-05 | Hatalı giriş                | Error mapping kaynakta                                | Yanlış parola/doğrulanmamış e-posta               | Raw provider hata yok; **MANUAL REQUIRED**        |
| UF-06 | Reset isteği                | Redirect/error helpers testli                         | Gerçek e-posta teslimatı                          | **MANUAL REQUIRED**                               |
| UF-07 | Yeni parola                 | Recovery parsing/validation/error testleri geçti      | Link → yeni parola → eski link                    | **MANUAL REQUIRED**                               |
| UF-08 | Çıkış                       | Source flow var                                       | Online/offline logout + back + restart            | **POSSIBLE RISK:** signOut failure semantics      |
| UF-09 | Araç oluşturma              | Repository contract kısmi                             | Yeni hesapla create + restart                     | CRUD gate In progress; **MANUAL REQUIRED**        |
| UF-10 | Araç düzenleme              | Validation/source var                                 | Bütün alanları edit + restart                     | **MANUAL REQUIRED**                               |
| UF-11 | Kilometre güncelleme        | Düşük record reddi ve vehicle correction onayı testli | Record ve direct vehicle edit ile düşük/yüksek km | Kaynak uygulandı; **MANUAL REQUIRED**             |
| UF-12 | Araç silme                  | DB-first cascade + cleanup queue remote E2E            | Child data+file+notification olan araç sil        | Backend recovery geçti; **MANUAL REQUIRED**       |
| UF-13 | Yakıt CRUD                  | Atomic RPC remote E2E + business tests                | Create/edit/delete + dashboard/history/restart    | Backend atomic; **MANUAL REQUIRED**               |
| UF-14 | Bakım CRUD                  | Aynı atomic RPC bütün record tiplerini kapsar         | Create/edit/delete + filtre/restart               | Backend atomic; **MANUAL REQUIRED**               |
| UF-15 | Diğer masraf CRUD           | Aynı atomic RPC bütün record tiplerini kapsar         | Create/edit/delete + filtre/restart               | Backend atomic; **MANUAL REQUIRED**               |
| UF-16 | Geçmiş/filtre               | Sort/filter + radio role/checked semantics kaynakta   | Dört filtre, TalkBack ve record deep link         | Kaynak uygulandı; **MANUAL REQUIRED**             |
| UF-17 | Dashboard stats             | Analytics edge tests geçti                            | Fixture değerleriyle görsel karşılaştır           | Hesap source PASS; UI/theme **MANUAL**            |
| UF-18 | Reminder create/edit        | DB-first recovery ve notification fake-gateway testli | Tarih, km, ikisi; granted/denied; edit            | Kaynak/test PASS; **ANDROID MANUAL**              |
| UF-19 | Reminder delete             | DB-first delete + idempotent local cancellation       | Scheduled notification ile delete                 | Kaynak/test PASS; **ANDROID MANUAL**              |
| UF-20 | Reminder complete/reopen    | Reconcile/duplicate/permission testleri geçti         | Offline/rapid toggle + notification list          | Kaynak/test PASS; **ANDROID MANUAL**              |
| UF-21 | Gövde durumu                | Schema/condition source ve tests                      | Her body type/part/status + restart               | **MANUAL THEME/SVG CHECK**                        |
| UF-22 | Ekspertiz                   | Consistent metadata RPC + recovery queue kaynakta     | CRUD, attachment replace/open/delete              | Remote recovery PASS; **ANDROID MANUAL**          |
| UF-23 | Belge upload/create         | Remote private/MIME/quota E2E Passed                  | Android picker pozitif matrisi + restart          | Backend PASS; UI **MANUAL**                       |
| UF-24 | Belge açma                  | 60 sn URL + safe open error/loading/retry kaynakta    | Online/offline/unsupported viewer                 | Kaynak uygulandı; **MANUAL REQUIRED**             |
| UF-25 | Belge silme                 | DB-first idempotent delete + Storage recovery E2E     | DB+Storage + restart                              | Remote PASS; **ANDROID MANUAL**                   |
| UF-26 | MIME/boyut/kota             | Remote PDF/JPEG/PNG, WebP/spoof/5MB/10/25 Passed      | Picker üzerinden aynı negatif matris              | Backend PASS; UI copy **MANUAL**                  |
| UF-27 | Ayarlar/izin/veri temizleme | Source flow var                                       | Permission denied/granted, dört clear             | Error visibility/partial cleanup **RISK**         |
| UF-28 | Sistem/Açık/Koyu            | 8 tema token/preference testi geçti                   | Live switch + restart + system change             | Pure logic PASS; render/native **MANUAL**         |
| UF-29 | Hukuk sayfaları             | Generated freshness test suite Passed                 | Beş route, scroll/back/light/dark                 | Taslak; **HUMAN LEGAL DECISION**                  |
| UF-30 | Hesap ve veri silme         | Remote sentetik E2E normal path Passed                | Gerçek Android UI/offline/retry/old session       | Gate In progress; **MANUAL + HUMAN**              |
| UF-31 | Android geri                | Yedi edit formunda ortak dirty navigation guard var   | Three-button/gesture/modal/date picker/dirty form | Kaynak uygulandı; **MANUAL REQUIRED**             |
| UF-32 | Alt sekmeler                | Layout calculation tests geçti                        | Three-button/gesture/narrow/keyboard              | **MANUAL REQUIRED**                               |
| UF-33 | İnternet kesintisi          | Connection state/retry route kararı testli            | Existing account offline cold start               | Kaynak uygulandı; **MANUAL REQUIRED**             |
| UF-34 | Oturum süresinin dolması    | Protected guard ve güvenli mesaj helper'ı testli      | Açık her tab/detail'de session revoke             | Kaynak uygulandı; **MANUAL REQUIRED**             |
| UF-35 | Kapatıp yeniden açma        | Theme/onboarding/session + offline retry source       | Cold/warm restart online/offline                  | Kaynak uygulandı; **MANUAL REQUIRED**             |

## TASK-006 confirmed defect register — tarihsel baseline

TASK-006 audit'inde **14 confirmed defect** vardı. Aşağıdaki tablo ilk bulguyu korur; güncel çözüm
durumu bu belgenin başındaki TASK-007 tablosudur.

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
| D-11 | Persistence   | **RESOLVED TASK-008:** record+mileage tek RPC transaction; owner-scoped idempotency                                  | Remote sentetik pozitif/negatif kanıt geçti           | P1      | `save_vehicle_record_atomic`                  |
| D-12 | Notification  | **IMPLEMENTED TASK-008:** DB source-of-truth + retry/reconcile; OS atomikliği iddia edilmez                          | Android lifecycle kabulü manuel                       | P1      | notification recovery/store                   |
| D-13 | Storage       | **RESOLVED BACKEND TASK-008:** explicit state, cleanup queue, missing/orphan reconcile                               | Android interrupted picker/upload kabulü manuel       | P1      | attachment RPC/Edge recovery                  |
| D-14 | Accessibility | Dashboard shortcuts, history filters, note cards ve SectionHeader action'larında role/state/label eksikleri          | TalkBack anlamı ve selected state                     | P1      | İlgili `Pressable` kaynakları                 |

## Possible risk register

Bu audit'te **15 possible risk** vardır.

| ID    | Risk                                                                                                            | Kapanış kanıtı                                       |
| ----- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| PR-01 | Confirmation delivery/deep-link/expired link runtime sonucu kanıtlı değil; resend kaynakta eklendi              | Gerçek QA mailbox + Android link testi               |
| PR-02 | Password reset delivery, redirect allow-list ve used-link rejection release artifact'ta kanıtlı değil           | QA mailbox + release APK                             |
| PR-03 | Network failure sırasında logout local/provider session temizliği davranışı belirsiz                            | Offline logout + restart + client session inspection |
| PR-04 | Araçsız required create ekranından hardware/back sonucu blank/loop üretebilir                                   | Yeni hesap Android back matrisi                      |
| PR-05 | Notification response handler kaynakta eklendi; killed/background/foreground sonucu kanıtlı değil               | Gerçek notification tap testi                        |
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
4. Onaylanan retry-only offline, kilometre düzeltme, dirty-form ve notification tap davranışlarının
   Android kabul sonucu.

## Eksik veya çelişkili akış/doküman kayıtları

| Tür            | Bulgu                                                                           | Audit yorumu                                                                            |
| -------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Cihaz kanıtı   | Confirmation resend teslimat/deep-link sonucu kaynakla kanıtlanamaz             | Uygulama yolu eklendi; gerçek QA mailbox ve Android testi gerekir                       |
| Cihaz kanıtı   | Notification tap lifecycle sonucu kaynakla kanıtlanamaz                         | Handler/fallback eklendi; killed/background/foreground testi gerekir                    |
| Cihaz kanıtı   | Offline cold start ve retry dönüşü kaynakla tam kanıtlanamaz                    | Ayrı connection state eklendi; Android testi gerekir                                    |
| Cihaz kanıtı   | Session expiry/revoke redirect sonucu kaynakla tam kanıtlanamaz                 | Global protected guard eklendi; Android revoke testi gerekir                            |
| Çözüldü-kaynak | Mileage reminder modeline `due` ve clamp edilmiş progress eklendi               | Android reminder kartı kontrolü gerekir                                                 |
| Çelişki        | `docs/project-status.md` remote Supabase'in bağlı olmadığını söylüyor           | TASK-004 ve güncel release gates remote ref/deploy/E2E kanıtlıyor; belge tarihsel/stale |
| Çelişki        | `docs/project-status.md` güvenli hesap silme UI'da yok diyor                    | Settings ve `delete-account` akışı mevcut; güncel gate In progress                      |
| Çelişki        | Release gate APK satırı TASK-001 için “kullanıcı geri bildirimi bekliyor” diyor | TASK-001 feedback uygulanmış; beklenen şey yeni APK Android acceptance sonucudur        |
| Stale plan     | TASK-005 implementation step 7 hâlâ `In progress` yazıyor                       | Commit/push tamamlanmış; task completion kaydı kendi içinde tutarsız                    |
| Tarihsel kayıt | `docs/release-readiness.md` 10 MB/WebP ve eski test sayıları içeriyor           | Belge kendini tarihsel diye işaretliyor; güncel karar için release gates kullanılmalı   |

## APK öncesi zorunlu düzeltme kapısı

Yeni acceptance APK'sından önce D-01–D-10 ve D-14 için kaynak düzeltmeleri uygulanmıştır; final diff
audit'i ve otomatik kapılar tamamlandıktan sonra APK alınabilir. Android acceptance yapılmadan bu
maddeler release açısından Passed sayılamaz. D-11 ve D-13 remote sentetik kanıtla kapatılmıştır.
D-12 kaynak ve hedefli test düzeyinde uygulanmıştır; Android OS notification lifecycle kabulü
tamamlanmadan release açısından Passed sayılmaz.

## Yalnız gerçek Android cihazda doğrulanabilecekler

- Email confirmation/reset link app dönüşü ve gerçek SMTP teslimatı.
- Password press/release/cancel/blur/background ve keyboard/autofill.
- Three-button/gesture safe-area, Android navigation bar ve hardware back.
- Native alert, date picker, picker permission/cancel/viewer.
- Notification permission/channel/delivery/tap ve OS schedule cleanup.
- Light/dark/system bütün ekranlar, TalkBack, target size, reflow ve cold-start flash.
- Account deletion UI/retry, old session/signed URL ve uygulama restart sonucu.
