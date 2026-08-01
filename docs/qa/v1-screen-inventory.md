# V1 ekran ve etkileşim envanteri

**Audit date:** 2026-08-01
**Commit baseline:** `2c5cc0450b558ba94ff0c8e07422db5b4a309cdf`
**Evidence mode:** Repository source inspection; yeni APK/runtime capture yok

## Sayım yöntemi

- **Route:** `src/app` altında `_layout.tsx` olmayan her `.tsx` dosyası.
- **Tab:** `(tabs)/_layout.tsx` içinde kayıtlı ana sekme.
- **Form:** Kullanıcının veri gönderdiği veya kalıcı bir tercihi değiştirdiği mantıksal ekran formu.
- **Kontrol occurrence:** Route dosyalarındaki JSX kaynak occurrence'ı; liste verisine göre runtime'da
  çoğalan kart/tuş sayısı değildir.
- **Kullanıcı işlemi:** [Ana akış belgesinde](v1-master-user-flow.md) kimliği verilen 35 kanonik
  senaryo. Ham buton occurrence sayısından farklıdır.

| Envanter türü                    | Toplam | Kaynak yöntemi                                                 |
| -------------------------------- | -----: | -------------------------------------------------------------- |
| Gezilebilir route/ekran          |     26 | `src/app/**`, iki `_layout.tsx` hariç                          |
| Layout/navigation modülü         |      2 | Root Stack + Tabs layout                                       |
| Ana tab                          |      5 | Ana Sayfa, Geçmiş, Araç, Hatırlatıcılar, Ayarlar               |
| Mantıksal form                   |     11 | Auth 4 + araç/kayıt/hatırlatıcı/gövde/ekspertiz/not/belge 7    |
| Route içi `AppButton` occurrence |     36 | Kaynak taraması                                                |
| Route içi doğrudan `Pressable`   |     10 | Dinamik ortak kart/row bileşenleri hariç                       |
| `AppInput` occurrence            |     25 | Kaynak taraması                                                |
| `PasswordInput` occurrence       |      5 | Login 1 + kayıt 2 + yeni parola 2                              |
| `SelectField` occurrence         |      7 | Araç 2, kayıt 2, hatırlatıcı 1, gövde 1, belge 1               |
| `DateField` occurrence           |      5 | Kayıt 1, hatırlatıcı 1, ekspertiz 1, belge 2                   |
| Boş durum occurrence             |      6 | Dashboard, geçmiş, hatırlatıcı, ekspertiz, not, belge          |
| Explicit tam ekran loading yolu  |      8 | Entry, recovery ve entity edit route'ları                      |
| `ErrorBanner` occurrence         |     22 | Validation, repository, missing entity ve bağlantı durumları   |
| Dosya seçici                     |      2 | Fotoğraf seç / Belge seç                                       |
| Paylaşılan seçim modalı          |      1 | Bütün `SelectField` kullanımları                               |
| Native tarih seçici wrapper'ı    |      1 | Bütün `DateField` kullanımları                                 |
| Başarı alert kaynak occurrence'ı |      8 | Dinamik clear senaryoları runtime'da birden çok kez kullanılır |
| Confirmation helper invocation   |      8 | Dinamik clear senaryoları runtime'da dört seçeneğe genişler    |

## Route ve ekran envanteri

| ID  | Route                              | Amaç / başlangıç                               | Kullanıcı kontrolleri                                                                                        | Durumlar ve overlay'ler                                                      | Repository kanıtı                             |
| --- | ---------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------- |
| R01 | `/`                                | Auth/cache/bootstrap karar kapısı              | Kullanıcı kontrolü yok; otomatik redirect                                                                    | Loading; onboarding/login/recovery/vehicle/tabs redirect                     | `src/app/index.tsx`, `routeDecision.ts`       |
| R02 | `/onboarding`                      | İlk kullanım tanıtımı                          | `Başlayalım`                                                                                                 | Gradient hero; ayrı hata/boş state yok                                       | `src/app/onboarding.tsx`                      |
| R03 | `/auth/login`                      | E-posta/parola girişi                          | E-posta, parola, basılı-tut göz, `Şifremi unuttum`, `Giriş yap`, `Hesap oluştur`                             | Config error, auth error, loading/disabled button                            | `src/app/auth/login.tsx`                      |
| R04 | `/auth/register`                   | Hesap oluşturma                                | Ad, e-posta, iki parola/göz, iki hukuk linki, `Hesap oluştur`; success CTA                                   | Validation, auth error, ayrı e-posta doğrulama success state                 | `src/app/auth/register.tsx`                   |
| R05 | `/auth/forgot-password`            | Reset e-postası isteme                         | E-posta, `Yenileme bağlantısı gönder`                                                                        | Disabled/loading, error banner, success native alert                         | `src/app/auth/forgot-password.tsx`            |
| R06 | `/auth/reset-password`             | Recovery linkini işleyip yeni parola belirleme | İki parola/göz; güncelle; yeni link iste; login'e dön                                                        | Loading, ready, success, invalid/expired link error                          | `src/app/auth/reset-password.tsx`             |
| R07 | `/(tabs)` / `/(tabs)/index`        | Dashboard                                      | Yakıt/Bakım/Masraf/Hatırlat kısayolları, retry, tüm geçmiş, son kayıt kartları                               | Repository error+retry, kayıt yok empty, grafik için veri yok metni          | `src/app/(tabs)/index.tsx`                    |
| R08 | `/(tabs)/history`                  | Kayıt geçmişi                                  | Tümü/Yakıt/Bakım/Diğer filtreleri, kayıt kartı aç                                                            | Filtre sonucu empty                                                          | `src/app/(tabs)/history.tsx`                  |
| R09 | `/(tabs)/vehicle`                  | Araç özeti ve araç dosyası                     | Araç düzenle, Gövde/Ekspertiz/Not/Belgeler satırları                                                         | Aktif araç yoksa `null`; ayrı loading/error/empty yok                        | `src/app/(tabs)/vehicle.tsx`                  |
| R10 | `/(tabs)/reminders`                | Aktif/tamamlanan hatırlatıcı listesi           | Yeni, kart aç, checkbox ile tamamla/geri al                                                                  | Aktif liste empty; tamamlanan bölüm koşullu                                  | `src/app/(tabs)/reminders.tsx`                |
| R11 | `/(tabs)/settings`                 | Tema, hesap, bildirim, veri ve hukuk           | 3 tema radio'su; reset/logout/account delete; araç; bildirim; 4 section delete; araç delete; 5 hukuk route'u | Confirmation/success alert'leri, busy account deletion, izin status metni    | `src/app/(tabs)/settings.tsx`                 |
| R12 | `/vehicle/edit`                    | Araç oluşturma/düzenleme                       | 6 text input, yakıt/gövde seçimi, kaydet                                                                     | Route loading/missing, validation, repository error, loading button          | `src/app/vehicle/edit.tsx`                    |
| R13 | `/record/edit`                     | Yakıt/bakım/diğer kayıt create/edit/delete     | Tür/kategori, tutar, litre, km, tarih, açıklama, kaydet/sil                                                  | Conditional fields, loading/missing/error, validation, success/confirm alert | `src/app/record/edit.tsx`                     |
| R14 | `/reminder/edit`                   | Hatırlatıcı create/edit/delete                 | Tür, başlık, tarih, km, kaydet/sil                                                                           | Loading/missing/error, en az bir hedef validation, success/confirm alert     | `src/app/reminder/edit.tsx`                   |
| R15 | `/body-condition`                  | SVG parça durumu düzenleme                     | SVG hit-area'ları, parça status select, not, kaydet                                                          | Repository error; seçili parça/status ve legend                              | `src/app/body-condition/index.tsx`            |
| R16 | `/expertise`                       | Ekspertiz rapor listesi                        | Yeni rapor, rapor aç, gövde durumuna git                                                                     | Empty state                                                                  | `src/app/expertise/index.tsx`                 |
| R17 | `/expertise/edit`                  | Ekspertiz create/edit/delete ve ek             | Tarih/firma/no/not, fotoğraf/belge seç, kaldır, eki aç, kaydet/sil                                           | Loading/missing/error, picker error alert, success/confirm alert             | `src/app/expertise/edit.tsx`                  |
| R18 | `/notes`                           | Araç notları listesi                           | Yeni not, not kartı aç                                                                                       | Empty state                                                                  | `src/app/notes/index.tsx`                     |
| R19 | `/notes/edit`                      | Not create/edit/delete                         | Başlık, not, kaydet/sil                                                                                      | Loading/missing/error, validation, success/confirm alert                     | `src/app/notes/edit.tsx`                      |
| R20 | `/documents`                       | Belgeleri geçerlilik grubunda listeleme        | Yeni belge, belge kartı aç                                                                                   | Empty state; dört koşullu grup                                               | `src/app/documents/index.tsx`                 |
| R21 | `/documents/edit`                  | Belge create/edit/delete/upload/open           | Tür/başlık/no, iki tarih, not, picker'lar, kaldır, aç, reminder üret, kaydet/sil                             | Loading/missing/repository/local/validation error, success/confirm alert     | `src/app/documents/edit.tsx`                  |
| R22 | `/legal/kvkk-notice`               | KVKK Aydınlatma Metni                          | Scroll ve Stack geri                                                                                         | Taslak warning badge; kartlı metin                                           | `src/app/legal/kvkk-notice.tsx`               |
| R23 | `/legal/privacy-policy`            | Gizlilik Politikası                            | Scroll ve Stack geri                                                                                         | Taslak warning badge; kartlı metin                                           | `src/app/legal/privacy-policy.tsx`            |
| R24 | `/legal/retention-and-deletion`    | Saklama ve Silme Politikası                    | Scroll ve Stack geri                                                                                         | Taslak warning badge; kartlı metin                                           | `src/app/legal/retention-and-deletion.tsx`    |
| R25 | `/legal/account-and-data-deletion` | Hesap ve Veri Silme açıklaması                 | Scroll ve Stack geri                                                                                         | Taslak warning badge; gerçek silme eylemi Settings'tedir                     | `src/app/legal/account-and-data-deletion.tsx` |
| R26 | `/legal/kvkk-application`          | KVKK başvuru bilgileri                         | Scroll ve Stack geri                                                                                         | Taslak warning badge; e-posta/URL metinleri otomatik link değildir           | `src/app/legal/kvkk-application.tsx`          |

## Ortak modal, alert ve state sözleşmeleri

| Tür                 | Kaynak davranışı                                                                      | Kapsam / açık nokta                                                                |
| ------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Select bottom modal | Transparent `Modal`, overlay'e dokununca kapanır, seçili option check icon'u gösterir | Android back `onRequestClose` var; TalkBack/focus trap gerçek cihazda doğrulanmalı |
| Native date picker  | Android `default`, iOS `inline`; dismiss ve set event'i ayrılır                       | Manuel app theme override'ını takip ettiği kaynakta kanıtlı değil                  |
| Confirmation alert  | `Vazgeç` / `Sil`; web `confirm`, native `Alert.alert`                                 | Native görünüm ve Android back yalnız cihazda doğrulanabilir                       |
| Success alert       | Reset isteği, kayıtlar, belge/ekspertiz/not, account ve section delete sonrası        | Android üretici teması değişebilir                                                 |
| Picker error alert  | `Dosya seçilemedi` + güvenli Türkçe message                                           | Seçim cancel alert üretmez; permission denied cihazda doğrulanmalı                 |
| Empty state         | Ortak ikon, başlık, açıklama card'ı                                                   | Altı kaynak kullanımının iki temada render testi yok                               |
| Loading             | Root/entity için `LoadingScreen`; mutation sırasında button spinner/disabled          | Spinner kontrastı için confirmed defect kaydedildi                                 |
| Error               | `ErrorBanner`; yalnız dashboard instance'ı doğrudan `Tekrar dene` aksiyonu alır       | Session/offline global routing eksikleri ana audit'te                              |
| Missing entity      | Silinmiş/erişilemez entity için güvenli metin + fallback button                       | Vehicle/record/reminder/expertise/note/document edit ekranlarında mevcut           |

## Navigasyon ve link envanteri

- Root Stack 26 route ekranını taşır; detail ekranlarında merkezi görünür geri düğmesi vardır.
- Tab bar: Ana Sayfa, Geçmiş, Araç, Hatırlatıcılar, Ayarlar.
- Kayıt ekranındaki iki semantik link: KVKK Aydınlatma Metni ve Gizlilik Politikası.
- Login'deki iki metin aksiyonu: Şifremi unuttum ve Hesap oluştur.
- Settings'teki beş hukuk row'u uygulama içi route açar.
- KVKK başvuru içeriğindeki e-posta/URL, `LegalDocumentScreen` içinde düz `Text` olarak render edilir;
  tappable link değildir. **POSSIBLE RISK**.
- Push notification payload'ında reminder route'u vardır; notification tap handler ile route'a
  yönlendirme kaynakta bulunamadı. **POSSIBLE RISK** ve **MANUAL ANDROID CHECK REQUIRED**.

## Kaynaktan doğrulanamayanlar

- Gerçek Supabase e-posta doğrulama linkinin uygulamaya dönüşü: **HUMAN DECISION REQUIRED** ve gerçek
  ortam testi.
- Custom SMTP teslimatı, spam davranışı ve reset linki: **MANUAL ANDROID CHECK REQUIRED**.
- Native picker/alert, Android hardware back, gesture back, tab safe-area ve TalkBack:
  **MANUAL ANDROID CHECK REQUIRED**.
- Belge upload'ın V1 production'da açık mı kapalı mı olacağı: **HUMAN DECISION REQUIRED**.
- Hukuk metinlerinin onaylı ve yayınlanmış production sürümü: **HUMAN DECISION REQUIRED**.

## Kanıt sınırı

Bu envanter kaynakta render edilen veya çağrılan yüzeyleri kanıtlar; görünürlük, hit target, ekran
okuyucu sırası, üreticiye özgü native UI ve gerçek ağ/backend sonucunu kanıtlamaz. TASK-001'deki eski
görseller yalnız önceki light baseline özetidir; TASK-005 sonrası APK sonucu değildir.
